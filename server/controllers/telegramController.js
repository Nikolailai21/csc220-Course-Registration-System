const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const Offering = require("../models/Offering");
const AddDropRequest = require("../models/AddDropRequest");
const User = require("../models/User");
const {
  describeScheduleConflict,
  findScheduleConflict,
} = require("../utils/schedule");

const telegramApi = (method) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

const getBotToken = (res) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    res.status(503).json({
      message:
        "Telegram is not configured. Set TELEGRAM_BOT_TOKEN in the server environment and restart the server.",
    });
    return null;
  }
  return process.env.TELEGRAM_BOT_TOKEN;
};

exports.getRecentChats = async (_req, res) => {
  if (!getBotToken(res)) return;

  try {
    const response = await fetch(telegramApi("getUpdates"));
    const result = await response.json();
    if (!response.ok || !result.ok) {
      console.error(
        "Telegram getUpdates failed:",
        result.description || response.status,
      );
      return res.status(502).json({
        message:
          "Telegram could not list recent bot chats. Check the bot token and whether a webhook is configured.",
      });
    }

    const chatsById = new Map();
    for (const update of result.result || []) {
      const message = update.message || update.edited_message;
      const chat = message?.chat;
      if (chat?.type !== "private" || !chat.id) continue;
      const name = [chat.first_name, chat.last_name].filter(Boolean).join(" ");
      chatsById.set(String(chat.id), {
        chatId: String(chat.id),
        name: name || chat.username || "Telegram user",
        username: chat.username || "",
      });
    }
    res.json([...chatsById.values()]);
  } catch (err) {
    console.error("Failed to retrieve Telegram chats:", err.message);
    res.status(502).json({ message: "Unable to connect to Telegram" });
  }
};

exports.sendAddDropNotification = async (req, res) => {
  const token = getBotToken(res);
  if (!token) return;

  let addDropRequestId;
  let operation = "validating the course request";
  try {
    const { registrationId, requestType, targetOfferingId, message } = req.body;
    if (!mongoose.Types.ObjectId.isValid(registrationId)) {
      return res
        .status(400)
        .json({ message: "A valid registration is required" });
    }
    if (!["drop", "change_section"].includes(requestType)) {
      return res
        .status(400)
        .json({ message: "Select a valid course request type" });
    }
    if (
      requestType === "change_section" &&
      !mongoose.Types.ObjectId.isValid(targetOfferingId)
    ) {
      return res.status(400).json({ message: "Select a valid target section" });
    }
    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 3000
    ) {
      return res.status(400).json({
        message: "Enter a request message of no more than 3,000 characters",
      });
    }

    operation = "loading the student and advisor accounts";
    const student = await User.findOne({
      _id: req.user.id,
      role: "student",
      active: true,
    }).populate("advisorId", "name");
    if (!student) {
      return res.status(404).json({ message: "Student account not found" });
    }
    const advisor = student.advisorId;
    if (!advisor) {
      return res.status(400).json({
        message:
          "You do not have an assigned advisor. Contact an administrator.",
      });
    }

    const activeAdvisors = await User.find({
      role: "advisor",
      active: true,
    }).select("name telegramChatId");
    const recipientsByChatId = new Map();
    for (const activeAdvisor of activeAdvisors) {
      const chatId = activeAdvisor.telegramChatId?.trim();
      if (chatId && !recipientsByChatId.has(chatId)) {
        recipientsByChatId.set(chatId, {
          name: activeAdvisor.name,
          telegramChatId: chatId,
        });
      }
    }
    const telegramRecipients = [...recipientsByChatId.values()];
    if (telegramRecipients.length === 0) {
      return res.status(400).json({
        message:
          "No active advisor has connected Telegram. Ask an administrator to link advisor chat IDs.",
      });
    }

    operation = "loading the registered course";
    const registration = await Registration.findOne({
      _id: registrationId,
      studentId: student._id,
      status: "registered",
    }).populate({
      path: "offeringId",
      populate: { path: "courseId" },
    });
    if (!registration?.offeringId?.courseId) {
      return res.status(404).json({
        message: "Registered course not found for this withdrawal request",
      });
    }
    const offering = registration.offeringId;
    if (!offering.addDropOpen) {
      return res.status(400).json({
        message: "Course change requests are closed for this section",
      });
    }
    const activeAddDropRequest = await AddDropRequest.exists({
      registrationId: registration._id,
      status: { $in: ["pending", "processing"] },
    });
    if (activeAddDropRequest) {
      return res.status(409).json({
        message:
          "An add/drop request for this course is already awaiting review",
      });
    }

    const course = offering.courseId;
    let targetOffering = null;
    if (requestType === "change_section") {
      operation = "checking the preferred section";
      targetOffering = await Offering.findOne({
        _id: targetOfferingId,
        courseId: course._id,
        term: registration.term,
        addDropOpen: true,
        $expr: { $lt: ["$seatsTaken", "$seats"] },
      }).populate("courseId");
      if (
        !targetOffering ||
        String(targetOffering._id) === String(offering._id)
      ) {
        return res.status(400).json({
          message:
            "Select another open section of this course with available seats",
        });
      }

      operation = "checking the preferred section schedule";
      const scheduleConflict = await findScheduleConflict({
        studentId: student._id,
        term: registration.term,
        offering: targetOffering,
        excludeRegistrationId: registration._id,
      });
      if (scheduleConflict) {
        return res.status(409).json({
          message: describeScheduleConflict(scheduleConflict),
        });
      }
    } else if (targetOfferingId) {
      return res.status(400).json({
        message:
          "A target section is only allowed for a section-change request",
      });
    }

    const text = [
      requestType === "drop"
        ? "🗿 COURSE DROP REQUEST"
        : "🔄 COURSE SECTION CHANGE REQUEST",
      `Student: ${student.name} (${student.studentId || "ID not set"})`,
      `Assigned advisor: ${advisor.name}`,
      `Term: ${registration.term}`,
      `Course: ${course.code} — ${course.title}`,
      `Current section: ${offering.section} (${offering.day} ${offering.startTime}-${offering.endTime})`,
      ...(targetOffering
        ? [
            `Preferred section: ${targetOffering.section} (${targetOffering.day} ${targetOffering.startTime}-${targetOffering.endTime})`,
            `Room: ${targetOffering.room}`,
            `Instructor: ${targetOffering.instructor}`,
          ]
        : []),
      "",
      "Student message:",
      message.trim(),
    ].join("\n");

    operation = "saving the request";
    const addDropRequest = await AddDropRequest.create({
      studentId: student._id,
      advisorId: advisor._id,
      registrationId: registration._id,
      term: registration.term,
      requestType,
      ...(targetOffering ? { targetOfferingId: targetOffering._id } : {}),
      message: message.trim(),
    });
    addDropRequestId = addDropRequest._id;

    operation = "sending the request to Telegram";
    const deliveryResults = await Promise.all(
      telegramRecipients.map(async (recipient) => {
        try {
          const response = await fetch(telegramApi("sendMessage"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: recipient.telegramChatId,
              text,
            }),
          });
          const result = await response.json();
          return {
            recipient,
            delivered: response.ok && result.ok,
            errorCode: result.error_code,
            error: result.description || `HTTP ${response.status}`,
          };
        } catch (err) {
          return {
            recipient,
            delivered: false,
            error: err.message,
          };
        }
      }),
    );
    const failedDeliveries = deliveryResults.filter(
      (delivery) => !delivery.delivered,
    );
    if (failedDeliveries.length > 0) {
      console.error(
        "Telegram sendMessage failed for advisor(s):",
        failedDeliveries.map(
          ({ recipient, error }) => `${recipient.name}: ${error}`,
        ),
      );
      if (failedDeliveries.length === telegramRecipients.length) {
        await AddDropRequest.deleteOne({
          _id: addDropRequest._id,
          status: "pending",
        });
        addDropRequestId = null;
        if (
          failedDeliveries.every(({ errorCode }) =>
            [400, 403].includes(errorCode),
          )
        ) {
          return res.status(400).json({
            message:
              "Telegram could not deliver this notification. Ask each advisor to start the bot and verify their Telegram chat ID.",
          });
        }
        return res.status(502).json({
          message:
            "Telegram could not send the request. Try again later.",
        });
      }
      return res.status(502).json({
        message: `The request was saved, but Telegram delivery failed for ${failedDeliveries.length} of ${telegramRecipients.length} advisors. Check the server log and advisor chat IDs.`,
        requestId: addDropRequest._id,
      });
    }

    res.json({
      message: "Course request sent to all Telegram-connected advisors",
      advisorName: advisor.name,
      notifiedAdvisorCount: telegramRecipients.length,
      requestId: addDropRequest._id,
    });
  } catch (err) {
    if (addDropRequestId) {
      await AddDropRequest.deleteOne({
        _id: addDropRequestId,
        status: "pending",
      });
    }
    console.error(
      `Failed while ${operation}:`,
      err.stack || err.message,
    );
    res.status(500).json({
      message: `Unable to complete the request while ${operation}. Check the server terminal for details and try again.`,
    });
  }
};
