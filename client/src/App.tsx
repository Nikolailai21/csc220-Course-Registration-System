import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import AdvisorDashboard from './AdvisorDashboard';

type StudentStatus = 'Enrolled' | 'On leave' | 'Graduated';
type Student = {
  id: string; name: string; studentId: string; email: string; program: string;
  year: number; gpa: number; credits: number; status: StudentStatus; advisor: string;
};

const initialStudents: Student[] = [
  { id: 's1', name: 'Junior', studentId: 'STU26001', email: 'Junior@example.test', program: 'Computer Science', year: 2, gpa: 3.72, credits: 64, status: 'Enrolled', advisor: 'Jay' },
  { id: 's2', name: 'Alex', studentId: 'STU26002', email: 'Alex@example.test', program: 'Information Technology', year: 3, gpa: 3.48, credits: 91, status: 'Enrolled', advisor: 'Jay' },
  { id: 's3', name: 'Kelvin', studentId: 'STU26003', email: 'Kelvin@example.test', program: 'Computer Science', year: 1, gpa: 2.84, credits: 28, status: 'Enrolled', advisor: 'Jay' },
  { id: 's4', name: 'Happy', studentId: 'STU26004', email: 'Happy@example.test', program: 'Software Engineering', year: 4, gpa: 3.91, credits: 122, status: 'Enrolled', advisor: 'Micky' },
  { id: 's5', name: 'Bruce', studentId: 'STU26005', email: 'Bruce.bat@example.test', program: 'Information Technology', year: 2, gpa: 2.35, credits: 58, status: 'On leave', advisor: 'Jay' },
  { id: 's6', name: 'Neo', studentId: 'STU26006', email: 'Neo-Matrix@example.test', program: 'Computer Science', year: 3, gpa: 3.26, credits: 88, status: 'Enrolled', advisor: 'Jay' },
  { id: 's7', name: 'John', studentId: 'STU26007', email: 'Johnny@example.test', program: 'Software Engineering', year: 2, gpa: 3.63, credits: 61, status: 'Enrolled', advisor: 'Micky' },
  { id: 's8', name: 'Nora', studentId: 'STU26008', email: 'Nora@example.test', program: 'Computer Science', year: 4, gpa: 2.91, credits: 116, status: 'Enrolled', advisor: 'Micky' },
  { id: 's9', name: 'Jake', studentId: 'STU26009', email: 'Jake&diamnod@example.test', program: 'Information Technology', year: 1, gpa: 3.14, credits: 31, status: 'Enrolled', advisor: 'Micky' },
  { id: 's10', name: 'Willam', studentId: 'STU26010', email: 'Willam@example.test', program: 'Software Engineering', year: 3, gpa: 3.04, credits: 86, status: 'Graduated', advisor: 'Jay' },
];

const STORAGE_KEY = 'course-desk-student-admin-demo';
const PROGRAMS_KEY = 'course-desk-demo-programs';

const initialPrograms = [
  'Computer Science',
  'Information Technology',
  'Software Engineering',
];


function readPrograms(): string[] {
  try {
    const saved = localStorage.getItem(PROGRAMS_KEY);
    return saved ? (JSON.parse(saved) as string[]) : initialPrograms;
  } catch {
    return initialPrograms;
  }
}

  const readStudents = (): Student[] => {
    try { const value = localStorage.getItem(STORAGE_KEY); return value ? JSON.parse(value) as Student[] : initialStudents; }
    catch { return initialStudents; }
  };

  export default function App() {
    const [showAdvisorDashboard, setShowAdvisorDashboard] = useState(false);
    const [programs] = useState<string[]>(readPrograms);

  const [students, setStudents] = useState<Student[]>(readStudents);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | 'profile' | null>(null);
  const [selected, setSelected] = useState<Student | null>(null);
  const [toast, setToast] = useState('');
  const pageSize = 6;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); }, [students]);
  
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch = !query || `${student.name} ${student.studentId} ${student.email} ${student.program}`.toLowerCase().includes(query);
      return matchesSearch && (statusFilter === 'all' || student.status === statusFilter) && (programFilter === 'all' || student.program === programFilter);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, search, statusFilter, programFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shownStudents = filtered.slice((page - 1) * pageSize, page * pageSize);
  const enrolled = students.filter((s) => s.status === 'Enrolled');
  const attention = enrolled.filter((s) => s.gpa < 2.5);
  const avgGpa = enrolled.length ? enrolled.reduce((sum, student) => sum + student.gpa, 0) / enrolled.length : 0;
  const activePrograms = new Set(enrolled.map((student) => student.program)).size;
  const topStudents = [...enrolled].sort((a, b) => b.gpa - a.gpa).slice(0, 3);

  function notify(message: string) { setToast(message); }
  function openProfile(student: Student) { setSelected(student); setModal('profile'); }
  function openEdit(student: Student) { setSelected(student); setModal('edit'); }
  function clearFilters() { setSearch(''); setStatusFilter('all'); setProgramFilter('all'); setPage(1); }

  function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get('name')).trim(),
      studentId: String(form.get('studentId')).trim().toUpperCase(),
      email: String(form.get('email')).trim().toLowerCase(),
      program: String(form.get('program')),
      year: Number(form.get('year')),
      gpa: Number(form.get('gpa')),
      credits: Number(form.get('credits')),
      status: String(form.get('status')) as StudentStatus,
      advisor: String(form.get('advisor')).trim(),
    };
    const duplicate = students.some((student) => student.studentId === values.studentId && student.id !== selected?.id);
    if (duplicate) { notify('That student ID already exists.'); return; }
    if (selected && modal === 'edit') {
      setStudents((items) => items.map((student) => student.id === selected.id ? { ...student, ...values } : student));
      notify(`Updated ${values.name}'s record.`);
    } else {
      setStudents((items) => [{ id: `s${Date.now()}`, ...values }, ...items]);
      setPage(1);
      notify(`Added ${values.name} to the student directory.`);
    }
    setModal(null); setSelected(null);
  }

  function changeStatus(student: Student) {
    const next: StudentStatus = student.status === 'Enrolled' ? 'On leave' : 'Enrolled';
    setStudents((items) => items.map((item) => item.id === student.id ? { ...item, status: next } : item));
    notify(`${student.name}'s status changed to ${next}.`);
  }

  function exportCsv() {
    const rows = [['Name', 'Student ID', 'Email', 'Program', 'Year', 'GPA', 'Credits', 'Status', 'Advisor'], ...filtered.map((s) => [s.name, s.studentId, s.email, s.program, String(s.year), s.gpa.toFixed(2), String(s.credits), s.status, s.advisor])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'student-directory.csv'; link.click(); URL.revokeObjectURL(url);
    notify('Student list exported as CSV.');
  }

  return showAdvisorDashboard
    ? <AdvisorDashboard onBack={() => setShowAdvisorDashboard(false)} />
    : <div className="student-app">
    
    <aside className="student-sidebar">
      <a className="student-brand" href="#top">
        <span className="brand-dot"><i /><i /><i /><i /></span>
        <span><b>Campusly</b><small>STUDENT SERVICES</small></span>
      </a>
      
      <div className="side-profile">
        <div className="admin-photo">A</div>
        <div>
          <b>Admin User</b>
          <small>Campus administrator</small>
        </div>
        <button aria-label="Open profile menu">⌄</button>
      </div>

      <div className="side-caption">MANAGEMENT</div>

      <button className="side-link active">
        <span>▦</span>Dashboard
      </button>
      <button className="side-link">
        <span>♙</span>Students<i>{students.length}</i>
      </button>
    
      <button className="side-link">
        <span>▤</span>Programs<i>{programs.length}</i>
      </button>

      <button
        className="side-link"
        onClick={() => setShowAdvisorDashboard(true)}
      >
        <span>▣</span>Advisor workspace
      </button>

      <button className="side-link">
        <span>◷</span>Reports
      </button>

      <div className="sidebar-note">
        <span>✦</span><b>Need a quick overview?</b>
        <small>Use search and filters to find student records in seconds.</small>
      </div>
      <button className="side-link logout-link"><span>↪</span>Log out</button>
    </aside>

    <main className="student-main" id="top">
      <header className="student-topbar">
        
        <div className="mobile-brand">
          <span className="brand-dot"><i /><i /><i /><i /></span>
          <b>Campusly</b>
        </div>
        
        <div className="topbar-left">
          <span>Administration</span>
          <b>/</b><strong>Student dashboard</strong>
        </div>
        
        <div className="topbar-tools">
          <button className="term-select">Fall trimester <span>⌄</span></button>
          <button className="notification-button" aria-label="Notifications">♧<i /></button>
          <div className="top-admin">A</div>
        </div>
      </header>
      
      <div className="student-content">
        <section className="student-welcome">
          <div><span className="welcome-kicker">Friday · OCTOBER 16, 2026</span>
            <h1>Good morning, Admin <span>✦</span></h1>
            <p>Here’s a quick look at your student community.</p>
          </div>
          
          <div className="welcome-actions">
            <button className="outline-btn" onClick={exportCsv}>⇩ 
              <span>Export report</span>
            </button>
          </div>
        </section>

        <section className="student-stats">
          <StatCard label="Enrolled students" value={enrolled.length} detail="Currently active this term" icon="♙" color="coral" trend="↗ 8.2%" />
          <StatCard label="Average GPA" value={avgGpa.toFixed(2)} detail="Across enrolled students" icon="✦" color="blue" trend="↗ 0.14" />
          <StatCard label="Need attention" value={attention.length} detail="GPA below 2.50" icon="⚑" color="yellow" trend="Review list" />
          <StatCard label="Active programs" value={activePrograms} detail="With enrolled students" icon="▤" color="mint" trend={`${programs.length} programs`} />
        </section>

        <section className="overview-grid">
          <article className="overview-card enrollment-card">
            <div className="card-heading">
              <div>
                <h2>Enrollment overview</h2>
                <p>Student activity over the last 7 months</p>
              </div>
              <select aria-label="Enrollment chart period">
                <option>Last 7 months</option>
                <option>This year</option>
              </select>
            </div>

            <div className="chart-legend">
              <span><i className="legend-primary" />Enrolled students</span>
              <span><i className="legend-secondary" />New registrations</span>
            </div><EnrollmentChart total={enrolled.length} />
          </article>

          <article className="overview-card top-students-card">
            <div className="card-heading">
              <div>
                <h2>Top performing students</h2>
                <p>Highest GPA this term</p>
              </div>
              <button className="small-link" onClick={() => { setStatusFilter('Enrolled'); setPage(1); }}>View directory <span>→</span></button>
            </div>
            
            <div className="top-student-list">{topStudents.map((student, index) => 
              <button className="top-student" key={student.id} onClick={() => openProfile(student)}>
                <span className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span>
                <span className="mini-avatar">{initials(student.name)}</span>
                <span className="top-student-name"><b>{student.name}</b><small>{student.program}</small></span>
                <span className="gpa-pill">{student.gpa.toFixed(2)} GPA</span>
              </button>)}
            </div>
            
            <div className="top-card-foot">
              <span className="sparkle-ball">✦</span>
              <span>Recognize strong academic progress</span>
            </div>
          </article>
        </section>

        <section className="directory-card">
          <div className="directory-heading">
            <div>
              <div className="heading-title">
                <h2>Student directory</h2>
                <span>{filtered.length} records</span>
              </div>
              <p>Review student profiles, academic standing, and enrollment status.</p>
            </div>
            <button className="bright-btn small-add" onClick={() => { setSelected(null); setModal('create'); }}>＋ Add student</button>
          </div>
          
          <div className="directory-toolbar">
            <label className="student-search"><span>⌕</span>
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, ID, email, or program" />
              <kbd>⌘ K</kbd>
            </label>

            <div className="directory-filters">
              <label>
                <span>Status</span>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="all">All statuses</option>
                  <option>Enrolled</option><option>On leave</option>
                  <option>Graduated</option>
                </select>
              </label>
              <label>
                <span>Program</span>
                <select value={programFilter} onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }}>
                  <option value="all">All programs</option>
                    {programs.map((program) => 
                  <option key={program}>{program}</option>)}
                </select>
              </label>
              <button className="filter-reset" onClick={clearFilters} title="Clear filters">↺</button>
            </div>
          </div>
            
          <div className="student-table-wrap">
            <table className="student-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>PROGRAM</th>
                  <th>YEAR</th>
                  <th>GPA</th>
                  <th>CREDITS</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shownStudents.map((student) => 
                <tr key={student.id}>
                  <td>
                    <button className="student-cell" onClick={() => openProfile(student)}>
                      <span className={`student-avatar tone-${hashTone(student.name)}`}>{initials(student.name)}</span>
                      <span>
                        <b>{student.name}</b>
                        <small>{student.studentId} <i>·</i> {student.email}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="program-cell">{student.program}</span>
                  </td>
                  <td>
                    <span className="year-cell">Year {student.year}</span>
                  </td>
                  <td>
                    <span className={`gpa-value ${student.gpa < 2.5 ? 'low-gpa' : ''}`}>{student.gpa.toFixed(2)}</span>
                    <small className="gpa-scale">/ 4.00</small>
                  </td>
                  <td>
                    <span className="credit-value">{student.credits}</span>
                    <small className="gpa-scale">credits</small>
                  </td>
                  <td><StatusTag status={student.status} /></td>
                  <td>
                    <div className="student-actions">
                      <button title="View student" onClick={() => openProfile(student)}>↗</button>
                      <button title="Edit student" onClick={() => openEdit(student)}>✎</button>
                      <button title="Change enrollment status" onClick={() => changeStatus(student)}>⋯</button>
                    </div>
                  </td>
                </tr>)}{!shownStudents.length && 
                <tr>
                  <td colSpan={7} className="no-students">
                    <b>No students found</b>
                    <small>Try another search or clear the filters.</small>
                    <button onClick={clearFilters}>Clear filters</button>
                  </td>
                </tr>}
              </tbody>
            </table>
          </div>
              
          <div className="directory-footer">
            <span>Showing 
              <b>{filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)}</b> of 
              <b>{filtered.length}</b> students
            </span>
            
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
              <span>{page} <small>/</small> {pageCount}</span>
              <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>

          </div>
        </section>
            <footer className="student-footer">Campusly <span>·</span> Student administration 
              <span className="demo-caption">Fictional demo data · saved only in this browser</span>
            </footer>
      </div>
    </main>


   {modal === 'create' && (
      <StudentForm
        title="Add a student"
        student={null}
        programs={programs}
        onClose={() => setModal(null)}
        onSave={saveStudent}
      />
    )}
    
    {modal === 'edit' && selected && (
      <StudentForm
        title="Edit student record"
        student={selected}
        programs={programs}
        onClose={() => setModal(null)}
        onSave={saveStudent}
      />
    )}

    {modal === 'profile' && selected && 
      <StudentProfile 
        student={selected} 
        onClose={() => setModal(null)} 
        onEdit={() => setModal('edit')} 
        onStatus={() => { changeStatus(selected); setModal(null); }} 
      />
    }

    {toast && 
    <div className="student-toast"><span>✓</span>{toast}
      <button onClick={() => setToast('')}>×</button>
    </div>}

  </div>;
}

function initials(name: string) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(); }
function hashTone(value: string) { return value.charCodeAt(0) % 5 + 1; }

function StatCard({ label, value, detail, icon, color, trend }: { label: string; value: string | number; detail: string; icon: string; color: string; trend: string }) {
  return <article className="student-stat-card">
    <div className="stat-topline">
      <span>{label}</span>
      <span className={`stat-icon ${color}`}>{icon}</span>
    </div>
    <div className="stat-number">{value}</div>
    <div className="stat-bottom">
      <span>{detail}</span>
      <b className={color === 'yellow' ? 'neutral-trend' : ''}>{trend}</b>
    </div>
  </article>;
}

function StatusTag({ status }: { status: StudentStatus }) {
  const key = status === 'On leave' ? 'leave' : status.toLowerCase();
  return <span className={`student-status ${key}`}><i />{status}</span>;
}

function EnrollmentChart({ total }: { total: number }) {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  return <div className="chart-area">
  <div className="chart-y-labels">
    <span>{total + 100}</span>
    <span>{total + 75}</span>
    <span>{total + 50}</span>
    <span>{total + 25}</span>
    <span>{total}</span>
  </div>
  <svg className="chart-svg" viewBox="0 0 640 185" role="img" aria-label="Enrollment trend chart">
    <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stopColor="#ff957a" stopOpacity=".22"/>
      <stop offset="100%" stopColor="#ff957a" stopOpacity="0"/></linearGradient>
    </defs>
    <path d="M18 145 C58 126 74 119 108 123 S166 142 198 119 S248 103 278 111 S331 132 365 88 S421 83 451 90 S499 108 526 63 S581 53 622 35 L622 175 L18 175 Z" fill="url(#chartFill)"/>
    <path d="M18 145 C58 126 74 119 108 123 S166 142 198 119 S248 103 278 111 S331 132 365 88 S421 83 451 90 S499 108 526 63 S581 53 622 35" fill="none" stroke="#f18068" strokeWidth="3" strokeLinecap="round"/>
    <path d="M18 159 C65 153 80 147 108 148 S160 155 198 143 S246 135 278 139 S333 146 365 126 S419 120 451 123 S497 131 526 108 S580 104 622 95" fill="none" stroke="#67c5b6" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round"/>{[18,108,198,278,365,451,526,622].map((x, i) => 
      <circle key={x} cx={x} cy={[145,123,119,111,88,90,63,35][i]} r="4" fill="#fff" stroke="#f18068" strokeWidth="2"/>)}
      <line x1="526" y1="25" x2="526" y2="175" stroke="#e3e7ee" strokeDasharray="3 5"/>
      <rect x="476" y="26" width="94" height="34" rx="8" fill="#25334d"/>
      <text x="523" y="41" textAnchor="middle" fill="#aebbd4" fontSize="9">CURRENT TOTAL</text>
      <text x="523" y="53" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{total} students</text>
    </svg>
      <div className="chart-months">{months.map((month) => <span key={month}>{month}</span>)}
    </div>
  </div>;
}



function StudentForm({
  title,
  student,
  programs,
  onClose,
  onSave,
}: {
  title: string;
  student: Student | null;
  programs: string[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <div className="student-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="student-modal" role="dialog" aria-modal="true">
      <header>
        <div>
          <small>STUDENT RECORD</small>
          <h2>{title}</h2>
          <p>Use fictional records for this project demo.</p>
        </div>
        <button onClick={onClose}>×</button>
      </header>
      <form onSubmit={onSave}>
        <label>Full name<input name="name" defaultValue={student?.name} placeholder="e.g. Aye Chan" required autoFocus /></label>
        
        <div className="modal-two">
          <label>Student ID<input name="studentId" defaultValue={student?.studentId} placeholder="STU26011" required /></label>
          <label>Email<input name="email" type="email" defaultValue={student?.email} placeholder="student@example.test" required /></label>
        </div>
        <label>Program
          <select name="program" defaultValue={student?.program || programs[0]}>{programs.map((program) => 
            <option key={program}>{program}</option>)}
          </select>
        </label>

        <div className="modal-three">
          <label>Year
            <select name="year" defaultValue={student?.year || 1}>{[1, 2, 3, 4].map((year) => 
            <option key={year} value={year}>Year {year}</option>)}
            </select>
          </label>
          <label>GPA
            <input name="gpa" type="number" min="0" max="4" step="0.01" defaultValue={student?.gpa ?? 0} required />
          </label>
          <label>Credits<input name="credits" type="number" min="0" max="200" defaultValue={student?.credits ?? 0} required /></label>
        </div>
              
        <div className="modal-two">
          <label>Status
            <select name="status" defaultValue={student?.status || 'Enrolled'}>
              <option>Enrolled</option>
              <option>On leave</option>
              <option>Graduated</option>
            </select>
          </label>
          <label>Academic advisor<input name="advisor" defaultValue={student?.advisor} placeholder="Advisor name" required /></label>
        </div>
            
        <div className="student-modal-actions">
          <button type="button" className="outline-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="bright-btn">{student ? 'Save changes' : 'Add student'} <span>→</span></button>
        </div>
      </form>
    </section>
  </div>;
} 

function StudentProfile({
  student,
  onClose,
  onEdit,
  onStatus,
}: {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
  onStatus: () => void;
}) {
  return (
    <div
      className="student-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="student-profile-modal"
        role="dialog"
        aria-modal="true"
      >
        <button className="profile-close" onClick={onClose}>×</button>

        <div className={`profile-large-avatar tone-${hashTone(student.name)}`}>
          {initials(student.name)}
        </div>

        <h2>{student.name}</h2>
        <p>{student.program} · Year {student.year}</p>
        <StatusTag status={student.status} />

        <div className="profile-facts">
          <div>
            <small>STUDENT ID</small>
            <b>{student.studentId}</b></div>
          <div>
            <small>EMAIL</small>
            <b>{student.email}</b></div>
          <div>
            <small>GPA</small>
            <b>{student.gpa.toFixed(2)} / 4.00</b></div>
          <div>
            <small>CREDITS EARNED</small>
            <b>{student.credits}</b></div>
          <div>
            <small>ACADEMIC ADVISOR</small>
            <b>{student.advisor}</b></div>
        </div>

        <div className="student-modal-actions">
          <button className="outline-btn" onClick={onStatus}>
            {student.status === 'Enrolled' ? 'Set on leave' : 'Mark enrolled'}
          </button>
          <button className="bright-btn" onClick={onEdit}>
            Edit record <span>✎</span>
          </button>
        </div>
      </section>
    </div>
  );
}
