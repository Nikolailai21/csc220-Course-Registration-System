import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type Student = {
  id: string;
  name: string;
  studentId: string;
};

type AcademicRecord = {
  studentId: string;
  code: string;
  title: string;
  term: string;
  grade: string;
};

type Offering = {
  id: string;
  term: string;
  code: string;
  title: string;
  section: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  instructor: string;
  seats: number;
  seatsTaken: number;
  addDropOpen: boolean;
};

const TERM = '2026-1';
const OFFERINGS_KEY = 'course-desk-advisor-offerings';
const REGISTRATIONS_KEY = 'course-desk-advisor-registrations';

const students: Student[] = [
  { id: 'stu1', name: 'Alex Morgan', studentId: 'STU26001' },
  { id: 'stu2', name: 'Jamie Carter', studentId: 'STU26002' },
  { id: 'stu3', name: 'Taylor Brooks', studentId: 'STU26003' },
];

const academicRecords: AcademicRecord[] = [
  { studentId: 'STU26001', code: 'CSC101', title: 'Programming Fundamentals', term: '2025-2', grade: 'B' },
  { studentId: 'STU26001', code: 'MAT210', title: 'Discrete Mathematics', term: '2025-2', grade: 'F' },
  { studentId: 'STU26001', code: 'ENG101', title: 'Academic English', term: '2025-1', grade: 'A' },
  { studentId: 'STU26002', code: 'CSC101', title: 'Programming Fundamentals', term: '2025-2', grade: 'C+' },
  { studentId: 'STU26003', code: 'MAT210', title: 'Discrete Mathematics', term: '2025-2', grade: 'W' },
];

const initialOfferings: Offering[] = [
  { id: 'off1', term: TERM, code: 'CSC220', title: 'Web Development II', section: '1', day: 'Monday', startTime: '09:00', endTime: '10:30', room: 'B203', instructor: 'Jordan Lee', seats: 30, seatsTaken: 18, addDropOpen: false },
  { id: 'off2', term: TERM, code: 'CSC220', title: 'Web Development II', section: '2', day: 'Tuesday', startTime: '09:00', endTime: '10:30', room: 'B204', instructor: 'Jordan Lee', seats: 1, seatsTaken: 1, addDropOpen: false },
  { id: 'off3', term: TERM, code: 'MAT210', title: 'Discrete Mathematics', section: '1', day: 'Monday', startTime: '10:00', endTime: '11:30', room: 'A105', instructor: 'Morgan Reed', seats: 25, seatsTaken: 8, addDropOpen: true },
  { id: 'off4', term: TERM, code: 'ENG205', title: 'Technical Writing', section: '1', day: 'Wednesday', startTime: '13:00', endTime: '14:30', room: 'C110', instructor: 'Riley Adams', seats: 20, seatsTaken: 5, addDropOpen: false },
];

function loadSaved<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function overlaps(first: Offering, second: Offering) {
  return (
    first.day === second.day &&
    first.startTime < second.endTime &&
    first.endTime > second.startTime
  );
}

export default function AdvisorDashboard({ onBack }: { onBack: () => void }) {
  const [offerings, setOfferings] = useState<Offering[]>(
    () => loadSaved(OFFERINGS_KEY, initialOfferings),
  );
  const [registrations, setRegistrations] = useState<Record<string, string[]>>(
    () => loadSaved(REGISTRATIONS_KEY, {}),
  );
  const [studentId, setStudentId] = useState(students[0].studentId);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    localStorage.setItem(OFFERINGS_KEY, JSON.stringify(offerings));
  }, [offerings]);

  useEffect(() => {
    localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(registrations));
  }, [registrations]);

  const student = students.find((item) => item.studentId === studentId)!;
  const history = academicRecords.filter((record) => record.studentId === studentId);
  const registeredIds = registrations[studentId] || [];
  const registeredOfferings = offerings.filter((item) =>
    registeredIds.includes(item.id),
  );
  const editingOffering = offerings.find((item) => item.id === editingId);

  const eligibleRows = useMemo(() => {
    return offerings
      .filter((item) => item.term === TERM)
      .map((offering) => {
        const previous = history.find((record) => record.code === offering.code);
        const passed = previous && previous.grade !== 'F' && previous.grade !== 'W';
        const retakeRequired = previous?.grade === 'F';
        const alreadyRegistered = registeredIds.includes(offering.id);
        const selected = draftIds.includes(offering.id);
        const full = offering.seatsTaken >= offering.seats;

        const clash = [...registeredOfferings, ...offerings.filter((item) =>
          draftIds.includes(item.id),
        )].find((item) => item.id !== offering.id && overlaps(item, offering));

        let reason = '';
        if (passed) reason = `Already passed — grade ${previous.grade}`;
        else if (alreadyRegistered) reason = 'Already registered';
        else if (full) reason = 'Full — 0 seats remaining';
        else if (clash) reason = `Clashes with ${clash.code} Section ${clash.section}`;

        return {
          offering,
          reason,
          passed: Boolean(passed),
          retakeRequired,
          selected,
          alreadyRegistered,
          disabled: Boolean(passed || alreadyRegistered || full || clash),
        };
      });
  }, [offerings, history, registeredIds, registeredOfferings, draftIds]);

  function toggleDraft(offeringId: string) {
    setDraftIds((current) =>
      current.includes(offeringId)
        ? current.filter((id) => id !== offeringId)
        : [...current, offeringId],
    );
    setMessage('');
  }

  function confirmRegistration() {
    if (!draftIds.length) {
      setMessage('Choose at least one eligible section first.');
      return;
    }

    setRegistrations((current) => ({
      ...current,
      [studentId]: [...(current[studentId] || []), ...draftIds],
    }));

    setOfferings((current) =>
      current.map((item) =>
        draftIds.includes(item.id)
          ? { ...item, seatsTaken: item.seatsTaken + 1 }
          : item,
      ),
    );

    setDraftIds([]);
    setMessage('Registration saved for this student.');
  }

  function removeRegistration(offering: Offering) {
    if (!window.confirm(`Remove ${offering.code} Section ${offering.section} from this registration?`)) {
      return;
    }

    setRegistrations((current) => ({
      ...current,
      [studentId]: (current[studentId] || []).filter((id) => id !== offering.id),
    }));
    setOfferings((current) =>
      current.map((item) =>
        item.id === offering.id
          ? { ...item, seatsTaken: Math.max(0, item.seatsTaken - 1) }
          : item,
      ),
    );
    setMessage('Course removed from the registration.');
  }

  function saveOffering(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const values = {
      term: String(form.get('term')).trim(),
      code: String(form.get('code')).trim().toUpperCase(),
      title: String(form.get('title')).trim(),
      section: String(form.get('section')).trim(),
      day: String(form.get('day')),
      startTime: String(form.get('startTime')),
      endTime: String(form.get('endTime')),
      room: String(form.get('room')).trim(),
      instructor: String(form.get('instructor')).trim(),
      seats: Number(form.get('seats')),
    };

    if (values.startTime >= values.endTime) {
      setMessage('End time must be later than start time.');
      return;
    }

    if (editingId) {
      setOfferings((current) =>
        current.map((item) =>
          item.id === editingId ? { ...item, ...values } : item,
        ),
      );
      setMessage('Course section updated.');
    } else {
      setOfferings((current) => [
        ...current,
        {
          id: `off-${Date.now()}`,
          ...values,
          seatsTaken: 0,
          addDropOpen: false,
        },
      ]);
      setMessage('Course section added.');
    }

    setEditingId(null);
    event.currentTarget.reset();
  }

  function deleteOffering(offering: Offering) {
    if (!window.confirm(`Remove ${offering.code} Section ${offering.section}?`)) {
      return;
    }

    setOfferings((current) => current.filter((item) => item.id !== offering.id));
    setRegistrations((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter((id) => id !== offering.id);
      }
      return next;
    });
    setMessage('Course section removed.');
  }

  return (
    <main className="advisor-page">
      <style>{`
        .advisor-page {
            min-height: 100vh;
            padding: 28px;
            color: #29334b;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
            radial-gradient(ellipse at 90% 4%, #ffe6dc 0, transparent 24%),
            radial-gradient(ellipse at 48% 54%, #e8faf6 0, transparent 32%),
            #f7f7fc;
        }

        .advisor-wrap {
            width: 100%;
            max-width: 1450px;
            margin: 0 auto;
        }

        .advisor-header,
        .advisor-title-row,
        .advisor-card-head,
        .advisor-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        .advisor-header {
            margin-bottom: 26px;
            padding: 8px 2px;
        }

        .advisor-header > div > div {
            color: #9996a9;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
        }

        .advisor-page h1,
        .advisor-page h2,
        .advisor-page h3,
        .advisor-page p {
            margin-top: 0;
        }

        .advisor-page h1 {
            margin: 7px 0;
            color: #29334b;
            font-size: clamp(26px, 4vw, 38px);
            letter-spacing: -1.2px;
        }

        .advisor-page h2 {
            margin-bottom: 6px;
            color: #303a52;
            font-size: 20px;
        }

        .advisor-page h3 {
            margin-top: 22px;
            color: #303a52;
            font-size: 16px;
        }

        .advisor-muted {
            color: #858da1;
        }

        .advisor-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
            margin: 20px 0;
        }

        .advisor-card {
            margin-bottom: 18px;
            padding: 22px;
            border: 1px solid #e8e3f2;
            border-radius: 17px;
            background: #ffffffed;
            box-shadow: 0 12px 30px #453c6410;
        }

        .advisor-grid .advisor-card {
            min-height: 142px;
            border-top: 4px solid #f26759;
            background: linear-gradient(135deg, #fff0eb, #fff);
        }

        .advisor-grid .advisor-card:nth-child(2) {
            border-top-color: #5978e9;
            background: linear-gradient(135deg, #eef1ff, #fff);
        }

        .advisor-grid .advisor-card:nth-child(3) {
            border-top-color: #16aa99;
            background: linear-gradient(135deg, #e6faf4, #fff);
        }

        .advisor-stat {
            margin: 10px 0 5px;
            color: #29334b;
            font-size: 28px;
            font-weight: 800;
        }

        .advisor-table-wrap {
            overflow-x: auto;
            border-radius: 12px;
        }

        .advisor-table {
            width: 100%;
            min-width: 760px;
            border-collapse: collapse;
        }

        .advisor-table th,
        .advisor-table td {
            padding: 13px 12px;
            border-bottom: 1px solid #eeeaf5;
            text-align: left;
            vertical-align: top;
        }

        .advisor-table th {
            background: #faf9fd;
            color: #858da1;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .5px;
        }

        .advisor-table tbody tr:hover {
            background: #fffaf7;
        }

        .advisor-form {
            display: grid;
            grid-template-columns: repeat(5, minmax(130px, 1fr));
            align-items: end;
            gap: 12px;
            margin-top: 20px;
        }

        .advisor-form label {
            display: grid;
            gap: 7px;
            color: #666f84;
            font-size: 12px;
            font-weight: 700;
        }

        .advisor-page input,
        .advisor-page select {
            width: 100%;
            min-height: 42px;
            padding: 10px 12px;
            border: 1px solid #e1ddec;
            border-radius: 10px;
            background: #fff;
            color: #303a52;
        }

        .advisor-page input:focus,
        .advisor-page select:focus {
            border-color: #9b8df1;
            outline: 3px solid #9b8df122;
        }

        .advisor-btn {
            min-height: 40px;
            padding: 10px 15px;
            border: 0;
            border-radius: 10px;
            background: linear-gradient(110deg, #f26759, #ff9b4a);
            box-shadow: 0 6px 14px #f2675925;
            color: white;
            font-weight: 800;
            cursor: pointer;
            transition: transform .15s ease, box-shadow .15s ease;
        }

        .advisor-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 9px 18px #f2675935;
        }

        .advisor-btn.secondary {
            background: #f0edfb;
            box-shadow: none;
            color: #5c58a0;
        }

        .advisor-btn.danger {
            background: #fff0ed;
            box-shadow: none;
            color: #c34d42;
        }

        .advisor-btn:disabled {
            opacity: .48;
            cursor: not-allowed;
        }

        .advisor-badge {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            background: #e1f7ef;
            color: #16876d;
            font-size: 12px;
            font-weight: 800;
        }

        .advisor-badge.warning {
            background: #fff1d8;
            color: #996300;
        }

        .advisor-badge.closed {
            background: #f0eef5;
            color: #68677a;
        }

        .advisor-message {
            margin: 14px 0;
            padding: 13px 16px;
            border: 1px solid #bde9da;
            border-radius: 12px;
            background: linear-gradient(110deg, #e2f8ef, #edf5ff);
            color: #247966;
            font-weight: 700;
        }

        .advisor-history {
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
            margin: 12px 0;
        }

        .advisor-history span {
            padding: 10px 12px;
            border: 1px solid #ebe7f3;
            border-radius: 10px;
            background: linear-gradient(120deg, #f5f2ff, #fff);
            color: #596176;
            font-size: 13px;
        }

        @media (max-width: 900px) {
            .advisor-form {
            grid-template-columns: repeat(3, minmax(130px, 1fr));
            }
        }

        @media (max-width: 700px) {
            .advisor-page {
            padding: 18px 12px;
            }

            .advisor-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            }

            .advisor-grid .advisor-card {
            min-height: 110px;
            }

            .advisor-form {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .advisor-header,
            .advisor-card-head {
            align-items: flex-start;
            flex-direction: column;
            }
        }

        @media (max-width: 420px) {
            .advisor-form {
            grid-template-columns: 1fr;
            }

            .advisor-card {
            padding: 16px;
            }
        }

        .advisor-page {
            font-size: 10px;
        }

        .advisor-page h1 {
            font-size: 23px;
        }

        .advisor-page h2 {
            font-size: 14px;
        }

        .advisor-page h3 {
            font-size: 11px;
        }

        .advisor-header > div > div {
            font-size: 8px;
        }

        .advisor-muted {
            font-size: 10px;
        }

        .advisor-stat {
            font-size: 21px;
        }

        .advisor-form label {
            font-size: 9px;
        }

        .advisor-page input,
        .advisor-page select {
        min-height: 34px;
            padding: 7px 9px;
            font-size: 10px;
        }

        .advisor-table th {
            font-size: 8px;
        }

        .advisor-table td {
            font-size: 10px;
        }

        .advisor-btn {
            min-height: 33px;
            padding: 8px 12px;
            font-size: 9px;
        }

        .advisor-badge {
            padding: 5px 8px;
            font-size: 8px;
        }

        .advisor-history span {
            font-size: 9px;
        }

        @media (max-width: 700px) {
        .advisor-page h1 {
            font-size: 21px;
        }

        .advisor-page h2 {
            font-size: 13px;
        }
        }
    `}
</style>

      <div className="advisor-wrap">
        <header className="advisor-header">
          <div>
            <div className="advisor-muted">CAMPUSLY · ADVISOR WORKSPACE</div>
            <h1>Course registration</h1>
            <p className="advisor-muted">Manage sections and register students for term {TERM}.</p>
          </div>
          <button className="advisor-btn secondary" onClick={onBack}>
            ← Back to Admin dashboard
          </button>
        </header>

        <section className="advisor-grid">
          <article className="advisor-card">
            <div className="advisor-muted">Current term</div>
            <div className="advisor-stat">{TERM}</div>
            <div className="advisor-muted">Course registration term</div>
          </article>
          <article className="advisor-card">
            <div className="advisor-muted">Course sections</div>
            <div className="advisor-stat">{offerings.length}</div>
            <div className="advisor-muted">Across all listed terms</div>
          </article>
          <article className="advisor-card">
            <div className="advisor-muted">Selected student</div>
            <div className="advisor-stat">{student.name}</div>
            <div className="advisor-muted">{student.studentId}</div>
          </article>
        </section>

        {message && <div className="advisor-message">{message}</div>}

        <section className="advisor-card">
          <div className="advisor-card-head">
            <div>
              <h2>Course offerings</h2>
              <p className="advisor-muted">Add, edit, remove, or manage the add/drop window for each section.</p>
            </div>
            <span className="advisor-badge">{TERM}</span>
          </div>

          <form className="advisor-form" onSubmit={saveOffering}>
            <label>Term<input name="term" defaultValue={editingOffering?.term || TERM} required /></label>
            <label>Course code<input name="code" defaultValue={editingOffering?.code} placeholder="CSC220" required /></label>
            <label>Course title<input name="title" defaultValue={editingOffering?.title} placeholder="Web Development II" required /></label>
            <label>Section<input name="section" defaultValue={editingOffering?.section} placeholder="1" required /></label>
            <label>Day
              <select name="day" defaultValue={editingOffering?.day || 'Monday'}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) =>
                  <option key={day}>{day}</option>,
                )}
              </select>
            </label>
            <label>Start<input name="startTime" type="time" defaultValue={editingOffering?.startTime || '09:00'} required /></label>
            <label>End<input name="endTime" type="time" defaultValue={editingOffering?.endTime || '10:30'} required /></label>
            <label>Room<input name="room" defaultValue={editingOffering?.room} placeholder="B203" required /></label>
            <label>Instructor<input name="instructor" defaultValue={editingOffering?.instructor} placeholder="Instructor name" required /></label>
            <label>Seats<input name="seats" type="number" min={1} defaultValue={editingOffering?.seats || 25} required /></label>
            <div className="advisor-actions">
              <button className="advisor-btn" type="submit">
                {editingId ? 'Save section' : 'Add section'}
              </button>
              {editingId && (
                <button
                  className="advisor-btn secondary"
                  type="button"
                  onClick={() => setEditingId(null)}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <div className="advisor-table-wrap" style={{ marginTop: 20 }}>
            <table className="advisor-table">
              <thead>
                <tr>
                  <th>COURSE / SECTION</th><th>DAY & TIME</th><th>ROOM</th>
                  <th>INSTRUCTOR</th><th>SEATS</th><th>ADD / DROP</th><th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {offerings.filter((item) => item.term === TERM).map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.code}</b><br />{item.title} · Section {item.section}</td>
                    <td>{item.day}<br />{item.startTime}–{item.endTime}</td>
                    <td>{item.room}</td>
                    <td>{item.instructor}</td>
                    <td>{item.seatsTaken} taken<br />{Math.max(0, item.seats - item.seatsTaken)} remaining</td>
                    <td>
                      <button
                        className={`advisor-btn ${item.addDropOpen ? '' : 'secondary'}`}
                        onClick={() => setOfferings((current) =>
                          current.map((row) => row.id === item.id
                            ? { ...row, addDropOpen: !row.addDropOpen }
                            : row,
                          ),
                        )}
                      >
                        {item.addDropOpen ? 'Open' : 'Closed'}
                      </button>
                    </td>
                    <td>
                      <button className="advisor-btn secondary" onClick={() => setEditingId(item.id)}>Edit</button>{' '}
                      <button className="advisor-btn danger" onClick={() => deleteOffering(item)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="advisor-card">
          <div className="advisor-card-head">
            <div>
              <h2>Register a student</h2>
              <p className="advisor-muted">Review academic history and select eligible sections.</p>
            </div>
            <label>
              Student{' '}
              <select
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  setDraftIds([]);
                  setMessage('');
                }}
              >
                {students.map((item) =>
                  <option key={item.id} value={item.studentId}>
                    {item.name} · {item.studentId}
                  </option>,
                )}
              </select>
            </label>
          </div>

          <h3>Academic record</h3>
          <div className="advisor-history">
            {history.length ? history.map((record) => (
              <span key={`${record.code}-${record.term}`}>
                <b>{record.code}</b> · {record.title} · {record.term} · Grade {record.grade}
                {record.grade === 'F' && <strong> · Retake required</strong>}
              </span>
            )) : <span>No completed-course history recorded.</span>}
          </div>

          <h3>Eligible sections and exclusions</h3>
          <div className="advisor-table-wrap">
            <table className="advisor-table">
              <thead>
                <tr><th>COURSE</th><th>SECTION</th><th>DAY / TIME</th><th>SEATS LEFT</th><th>ELIGIBILITY</th><th>SELECT</th></tr>
              </thead>
              <tbody>
                {eligibleRows.map(({ offering, reason, passed, retakeRequired, selected, alreadyRegistered, disabled }) => (
                  <tr key={offering.id}>
                    <td><b>{offering.code}</b><br />{offering.title}</td>
                    <td>{offering.section}</td>
                    <td>{offering.day} · {offering.startTime}–{offering.endTime}</td>
                    <td>{Math.max(0, offering.seats - offering.seatsTaken)}</td>
                    <td>
                      {passed ? <span className="advisor-badge warning">{reason}</span>
                        : reason ? <span className="advisor-badge warning">{reason}</span>
                        : retakeRequired ? <span className="advisor-badge warning">Retake required · F</span>
                        : <span className="advisor-badge">Eligible</span>}
                    </td>
                    <td>
                      {alreadyRegistered ? 'Registered' : (
                        <button
                          className={`advisor-btn ${selected ? 'secondary' : ''}`}
                          disabled={disabled && !selected}
                          onClick={() => toggleDraft(offering.id)}
                        >
                          {selected ? 'Selected' : disabled ? 'Unavailable' : 'Select'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="advisor-actions" style={{ marginTop: 18 }}>
            <button className="advisor-btn" onClick={confirmRegistration}>
              Confirm registration ({draftIds.length})
            </button>
          </div>

          <h3 style={{ marginTop: 28 }}>Current registration</h3>
          {registeredOfferings.length ? (
            <div className="advisor-table-wrap">
              <table className="advisor-table">
                <thead><tr><th>COURSE</th><th>SECTION</th><th>DAY / TIME</th><th>ROOM</th><th>INSTRUCTOR</th><th>ACTION</th></tr></thead>
                <tbody>
                  {registeredOfferings.map((item) => (
                    <tr key={item.id}>
                      <td>{item.code} · {item.title}</td>
                      <td>{item.section}</td>
                      <td>{item.day} · {item.startTime}–{item.endTime}</td>
                      <td>{item.room}</td>
                      <td>{item.instructor}</td>
                      <td><button className="advisor-btn danger" onClick={() => removeRegistration(item)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="advisor-muted">No courses registered for this student yet.</p>}
        </section>
      </div>
    </main>
  );
}