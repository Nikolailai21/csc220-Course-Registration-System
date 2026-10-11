const crypto = require("crypto");
const path = require("path");
const PDFDocument = require("pdfkit");
const Registration = require("../models/Registration");
const User = require("../models/User");

const INVOICE_TERM = "2026-2";
const INVOICE_TERM_LABEL = "Term 2/2026";
const TUITION_PER_COURSE = 10000;
const SCHOOL_FEE = 2500;
const DISCORD_API = "https://discord.com/api/v10";
const LOGO_PATH = path.join(__dirname, "../assets/stamford-logo.png");
const PAGE = {
  left: 48,
  right: 547,
  width: 499,
  contentBottom: 738,
};
const COLORS = {
  navy: "#12294A",
  blue: "#0094DA",
  ink: "#1F2937",
  muted: "#667085",
  border: "#E3E8EF",
  panel: "#F5F7FA",
  white: "#FFFFFF",
};

const formatAmount = (amount) =>
  `THB ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const formatNumber = (amount) =>
  amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pdfText = (value) => String(value ?? "").replace(/[^\x20-\x7E]/g, "?");

const drawBrandHeader = (doc) => {
  doc.image(LOGO_PATH, PAGE.left, 35, { width: 205 });
  doc
    .font("Helvetica-Bold")
    .fontSize(25)
    .fillColor(COLORS.navy)
    .text("INVOICE", 370, 40, { width: 177, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text("STUDENT TUITION & FEES", 370, 72, {
      width: 177,
      align: "right",
      characterSpacing: 1.2,
    });
  doc
    .moveTo(PAGE.left, 105)
    .lineTo(PAGE.right, 105)
    .lineWidth(2)
    .stroke(COLORS.blue);
};

const drawTableHeader = (doc, y) => {
  doc.roundedRect(PAGE.left, y, PAGE.width, 29, 5).fill(COLORS.navy);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.white);
  doc.text("COURSE / DESCRIPTION", 60, y + 11, { width: 225 });
  doc.text("CREDITS", 293, y + 11, { width: 50, align: "center" });
  doc.text("QTY", 350, y + 11, { width: 30, align: "right" });
  doc.text("UNIT FEE", 386, y + 11, { width: 75, align: "right" });
  doc.text("TOTAL", 471, y + 11, { width: 65, align: "right" });
  return y + 29;
};

const drawInvoiceDetails = (doc, { student, invoiceNumber, issuedAt }) => {
  const cardY = 124;
  const cardHeight = 94;
  doc.roundedRect(PAGE.left, cardY, 241, cardHeight, 7).fill(COLORS.panel);
  doc.roundedRect(301, cardY, 246, cardHeight, 7).fill(COLORS.panel);

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(COLORS.blue)
    .text("BILLED TO", 61, 138, { characterSpacing: 0.9 });
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.ink)
    .text(pdfText(student.name), 61, 153, { width: 210, ellipsis: true });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(`Student ID: ${pdfText(student.studentId || "Not set")}`, 61, 171, {
      width: 210,
      ellipsis: true,
    })
    .text(pdfText(student.email), 61, 187, { width: 210, ellipsis: true });

  const issuedDate = issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(COLORS.blue)
    .text("INVOICE DETAILS", 315, 138, { characterSpacing: 0.9 });
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLORS.ink)
    .text("Invoice no.", 315, 155)
    .text("Date issued", 315, 172)
    .text("Term", 315, 189);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.ink)
    .text(invoiceNumber, 385, 155, { width: 147, align: "right" })
    .text(issuedDate, 385, 172, { width: 147, align: "right" })
    .text(INVOICE_TERM_LABEL, 385, 189, { width: 147, align: "right" });
};

const drawTotals = (doc, y, tuition, total) => {
  const x = 301; // Align right box with top detail card right border
  const width = PAGE.right - x;
  const height = 128;

  // Outer container card
  doc.roundedRect(x, y, width, height, 7).fill(COLORS.panel);

  // Subtotal row
  doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted);
  doc.text("Tuition subtotal", x + 14, y + 16, { width: 120 });
  doc.text(formatAmount(tuition), x + 130, y + 16, {
    width: width - 144,
    align: "right",
  });

  // School fee row
  doc.text("School fee (once per term)", x + 14, y + 36, { width: 140 });
  doc.text(formatAmount(SCHOOL_FEE), x + 130, y + 36, {
    width: width - 144,
    align: "right",
  });

  // Divider
  doc
    .moveTo(x + 14, y + 58)
    .lineTo(x + width - 14, y + 58)
    .lineWidth(0.7)
    .stroke(COLORS.border);

  // Total Due Highlight Banner
  const totalBoxY = y + 68;
  const totalBoxHeight = 44;
  doc
    .roundedRect(x + 12, totalBoxY, width - 24, totalBoxHeight, 6)
    .fill(COLORS.navy);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.white)
    .text("TOTAL DUE", x + 24, totalBoxY + 16, { width: 90 });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.white)
    .text(formatAmount(total), x + 100, totalBoxY + 15, {
      width: width - 134,
      align: "right",
    });

  return y + height;
};

const drawPaymentDetails = (doc, y) => {
  const x = PAGE.left;
  const width = 241;
  const height = 128;

  doc.roundedRect(x, y, width, height, 7).fill("#F0F7FC");

  // Title Header
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(COLORS.blue)
    .text("BANK TRANSFER", x + 14, y + 14, { characterSpacing: 0.9 });

  const labelX = x + 14;
  const valueX = x + 92;
  const contentWidth = width - 106;

  // Row 1: Account Number
  let currentY = y + 32;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.muted);
  doc.text("ACCOUNT NO.", labelX, currentY);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.navy);
  doc.text("4007737712", valueX, currentY - 0.5, { width: contentWidth });

  // Row 2: Account Name
  currentY += 20;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.muted);
  doc.text("ACCOUNT NAME", labelX, currentY);

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLORS.navy);
  doc.text("Stamford International University", valueX, currentY, {
    width: contentWidth,
  });

  // Row 3: Bank Name
  currentY += 24;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.muted);
  doc.text("BANK NAME", labelX, currentY);

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLORS.navy);
  doc.text(
    "United Overseas Bank (Thai)\nPublic Company Limited",
    valueX,
    currentY,
    {
      width: contentWidth,
      lineGap: 2,
    },
  );
};

const createInvoicePdf = ({
  student,
  registrations,
  invoiceNumber,
  issuedAt,
}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.info.Title = `Invoice ${invoiceNumber}`;
    doc.info.Subject = `Course fees for ${INVOICE_TERM_LABEL}`;
    doc.info.Author = "Stamford International University";
    drawBrandHeader(doc);
    drawInvoiceDetails(doc, { student, invoiceNumber, issuedAt });

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLORS.navy)
      .text(`${INVOICE_TERM_LABEL.toUpperCase()} COURSE FEES`, PAGE.left, 239);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text("Amounts shown in Thai baht (THB)", PAGE.left, 255);

    let y = drawTableHeader(doc, 275);
    const firstRowY = y;
    const summaryHeight = 122;
    const summaryGap = 14;
    const footnoteHeight = 24;
    const availableRows =
      PAGE.contentBottom -
      firstRowY -
      summaryHeight -
      summaryGap -
      footnoteHeight;
    const rowHeight = Math.min(30, availableRows / registrations.length);
    const rowFontSize = Math.max(4, Math.min(8, rowHeight * 0.31));
    let rowIndex = 0;
    for (const registration of registrations) {
      const course = registration.offeringId.courseId;
      const code = pdfText(course.code);
      const title = pdfText(course.title);

      if (rowIndex % 2 === 0) {
        doc.rect(PAGE.left, y, PAGE.width, rowHeight).fill("#FAFBFC");
      }
      doc
        .font("Helvetica-Bold")
        .fontSize(rowFontSize)
        .fillColor(COLORS.ink)
        .text(`${code} - ${title}`, 60, y + (rowHeight - rowFontSize) / 2, {
          width: 225,
          ellipsis: true,
          lineBreak: false,
        });
      doc
        .font("Helvetica")
        .fontSize(rowFontSize)
        .fillColor(COLORS.ink)
        .text(
          String(course.credits || 4),
          293,
          y + (rowHeight - rowFontSize) / 2,
          {
            width: 50,
            align: "center",
          },
        )
        .text("1", 350, y + (rowHeight - rowFontSize) / 2, {
          width: 30,
          align: "right",
        })
        .text(
          formatNumber(TUITION_PER_COURSE),
          386,
          y + (rowHeight - rowFontSize) / 2,
          {
            width: 75,
            align: "right",
          },
        )
        .text(
          formatNumber(TUITION_PER_COURSE),
          471,
          y + (rowHeight - rowFontSize) / 2,
          {
            width: 65,
            align: "right",
          },
        );
      y += rowHeight;
      doc
        .moveTo(PAGE.left, y)
        .lineTo(PAGE.right, y)
        .lineWidth(0.5)
        .stroke(COLORS.border);
      rowIndex += 1;
    }

    const tuition = registrations.length * TUITION_PER_COURSE;
    const total = tuition + SCHOOL_FEE;
    const summaryY = y + summaryGap;
    drawPaymentDetails(doc, summaryY);
    y = drawTotals(doc, summaryY, tuition, total);

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(
        "Course tuition is charged per approved course. The school fee is charged once per term.",
        PAGE.left,
        y + 10,
        { width: PAGE.width, align: "left" },
      );
    doc
      .moveTo(PAGE.left, 770)
      .lineTo(PAGE.right, 770)
      .lineWidth(0.6)
      .stroke(COLORS.border);
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text("STAMFORD INTERNATIONAL UNIVERSITY", PAGE.left, 779, {
        width: PAGE.width,
        align: "center",
        characterSpacing: 0.8,
      });
    doc.end();
  });

const discordRequest = async (path, options = {}) => {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      ...options.headers,
    },
  });
  const result = await response.json();
  return { response, result };
};

exports.sendTermInvoice = async (req, res) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return res.status(503).json({
      message:
        "Discord is not configured. Set DISCORD_BOT_TOKEN on the server and restart it.",
    });
  }

  try {
    const student = await User.findOne({
      _id: req.user.id,
      role: "student",
      active: true,
    });
    if (!student) {
      return res.status(404).json({ message: "Student account not found" });
    }
    if (!student.discordUserId) {
      return res.status(400).json({
        message:
          "Your Discord account is not linked. Ask an administrator to add your Discord user ID.",
      });
    }

    const registrations = await Registration.find({
      studentId: student._id,
      term: INVOICE_TERM,
      status: "registered",
    })
      .sort({ createdAt: 1 })
      .populate({
        path: "offeringId",
        populate: { path: "courseId" },
      });
    if (registrations.length === 0) {
      return res.status(400).json({
        message: "There are no approved courses to invoice for Term 2/2026.",
      });
    }
    if (
      registrations.some(
        (registration) =>
          !registration.offeringId || !registration.offeringId.courseId,
      )
    ) {
      console.error(
        "Invoice generation found a registration with missing course data",
      );
      return res.status(500).json({
        message:
          "Course registration data is incomplete; the invoice was not sent.",
      });
    }

    const invoiceNumber = `INV-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(
        /-/g,
        "",
      )}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const issuedAt = new Date();
    const pdfBuffer = await createInvoicePdf({
      student,
      registrations,
      invoiceNumber,
      issuedAt,
    });

    const { response: dmResponse, result: dmChannel } = await discordRequest(
      "/users/@me/channels",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: student.discordUserId }),
      },
    );
    if (!dmResponse.ok || !dmChannel.id) {
      console.error(
        "Discord DM channel creation failed:",
        dmChannel.code || dmResponse.status,
        dmChannel.message || "",
      );
      if (dmResponse.status === 401) {
        return res.status(502).json({
          message:
            "Discord rejected the bot token. Check DISCORD_BOT_TOKEN in server/.env and restart the backend.",
        });
      }
      if (
        dmResponse.status === 400 ||
        dmResponse.status === 404 ||
        dmChannel.code === 10013
      ) {
        return res.status(502).json({
          message:
            "Discord could not find that user. In the admin form, replace the linked ID with the student's Discord user ID (not an application, bot, or server ID).",
        });
      }
      if (dmResponse.status === 403 || dmChannel.code === 50007) {
        return res.status(502).json({
          message:
            "Discord refused this direct message. Confirm the student allows DMs from server members and shares a server with the bot.",
        });
      }
      return res.status(502).json({
        message: `Discord could not open a direct message (HTTP ${dmResponse.status}${
          dmChannel.code ? `, code ${dmChannel.code}` : ""
        }). Check the backend log for the Discord error message.`,
      });
    }

    const form = new FormData();
    form.append(
      "payload_json",
      JSON.stringify({
        content: `Your ${INVOICE_TERM_LABEL} invoice (${invoiceNumber}) is attached. Total due: ${formatAmount(
          registrations.length * TUITION_PER_COURSE + SCHOOL_FEE,
        )}.`,
      }),
    );
    form.append(
      "files[0]",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      `${invoiceNumber}.pdf`,
    );
    const { response: messageResponse, result: messageResult } =
      await discordRequest(`/channels/${dmChannel.id}/messages`, {
        method: "POST",
        body: form,
      });
    if (!messageResponse.ok || !messageResult.id) {
      console.error(
        "Discord invoice upload failed:",
        messageResult.code || messageResponse.status,
        messageResult.message || "",
      );
      if (messageResponse.status === 401) {
        return res.status(502).json({
          message:
            "Discord rejected the bot token while uploading the invoice. Check DISCORD_BOT_TOKEN in server/.env and restart the backend.",
        });
      }
      if (messageResult.code === 50007) {
        return res.status(502).json({
          message:
            "Discord refused this direct message. Confirm the student allows DMs from server members and shares a server with the bot.",
        });
      }
      return res.status(502).json({
        message: `Discord could not deliver the invoice PDF (HTTP ${messageResponse.status}${
          messageResult.code ? `, code ${messageResult.code}` : ""
        }). Check the backend log for the Discord error message.`,
      });
    }

    res.json({
      message: "Invoice PDF sent to your Discord direct messages.",
      invoiceNumber,
      courseCount: registrations.length,
      total: registrations.length * TUITION_PER_COURSE + SCHOOL_FEE,
    });
  } catch (err) {
    console.error("Failed to send Discord invoice:", err.message);
    res.status(500).json({ message: "Unable to generate or send the invoice" });
  }
};
