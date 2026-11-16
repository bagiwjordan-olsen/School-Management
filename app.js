/* ============================================================
   EduManage — School Management App
   Vanilla JS + localStorage. Runs on desktop and mobile.
   ============================================================ */

const STORE_KEY = 'edumanage_v1';
const GRADES = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

/* ---------- Sample data (first run only) ---------- */
const SEED = {
  students: [
    { id: 's1', name: 'Alice Reyes',   grade: 'Grade 10', section: 'A', email: 'alice.reyes@example.com', phone: '0917 123 4567' },
    { id: 's2', name: 'Ben Cruz',      grade: 'Grade 10', section: 'A', email: 'ben.cruz@example.com',    phone: '0918 234 5678' },
    { id: 's3', name: 'Carla Santos',  grade: 'Grade 9',  section: 'B', email: 'carla.santos@example.com',phone: '0919 345 6789' },
    { id: 's4', name: 'Diego Lim',     grade: 'Grade 11', section: 'C', email: 'diego.lim@example.com',   phone: '0920 456 7890' },
    { id: 's5', name: 'Elena Bautista',grade: 'Grade 12', section: 'A', email: 'elena.b@example.com',     phone: '0921 567 8901' }
  ],
  teachers: [
    { id: 't1', name: 'Mr. Jose Dela Cruz', subject: 'Mathematics', email: 'jose.dc@school.edu',    phone: '0917 111 2222' },
    { id: 't2', name: 'Ms. Maria Lopez',    subject: 'Science',     email: 'maria.lopez@school.edu',phone: '0918 222 3333' },
    { id: 't3', name: 'Mrs. Ana Tan',       subject: 'English',     email: 'ana.tan@school.edu',    phone: '0919 333 4444' },
    { id: 't4', name: 'Mr. Paul Garcia',    subject: 'History',     email: 'paul.garcia@school.edu',phone: '0920 444 5555' }
  ],
  classes: [
    { id: 'c1', name: 'Section A — Math',    grade: 'Grade 10', adviser: 'Mr. Jose Dela Cruz', room: 'Room 201' },
    { id: 'c2', name: 'Section B — Science', grade: 'Grade 9',  adviser: 'Ms. Maria Lopez',    room: 'Lab 1' },
    { id: 'c3', name: 'Section C — English', grade: 'Grade 11', adviser: 'Mrs. Ana Tan',       room: 'Room 305' }
  ]
};

/* ---------- State ---------- */
let state = loadState();
let currentView = 'dashboard';
let searchTerms = { students: '', teachers: '', classes: '' };
let editing = { type: null, id: null };
let toastTimer = null;

/* ---------- Storage ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.students)) return parsed;
    }
  } catch (err) {
    console.warn('Could not read saved data:', err);
  }
  return JSON.parse(JSON.stringify(SEED));
}

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (err) { console.warn('Could not save data:', err); }
}

/* ---------- Helpers ---------- */
function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}
function initials(name) {
  return String(name || '?')
    .trim().split(/\s+/).slice(0, 2)
    .map(w => w[0] ? w[0].toUpperCase() : '')
    .join('') || '?';
}
function collectionOf(type) {
  return type === 'student' ? 'students' : type === 'teacher' ? 'teachers' : 'classes';
}
function prefixOf(type) {
  return type === 'student' ? 's' : type === 'teacher' ? 't' : 'c';
}
function labelOf(type) {
  return type === 'student' ? 'Student' : type === 'teacher' ? 'Teacher' : 'Class';
}

/* ---------- Views config ---------- */
const VIEWS = {
  dashboard: { title: 'Dashboard', action: null },
  students:  { title: 'Students',  action: 'Add Student', type: 'student' },
  teachers:  { title: 'Teachers',  action: 'Add Teacher', type: 'teacher' },
  classes:   { title: 'Classes',   action: 'Add Class',   type: 'class' }
};

/* ============================================================
   RENDER
   ============================================================ */
function renderApp() {
  const view = VIEWS[currentView];

  document.getElementById('pageTitle').textContent = view.title;

  const primaryBtn = document.getElementById('primaryBtn');
  if (view.action) {
    primaryBtn.style.display = '';
    primaryBtn.textContent = '+ ' + view.action;
    primaryBtn.onclick = () => openModal(view.type);
  } else {
    primaryBtn.style.display = 'none';
  }

  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
  });

  const content = document.getElementById('content');
  if (currentView === 'dashboard')      content.innerHTML = renderDashboard();
  else if (currentView === 'students')  content.innerHTML = renderStudents();
  else if (currentView === 'teachers')  content.innerHTML = renderTeachers();
  else                                  content.innerHTML = renderClasses();

  bindSearch();
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const recent = state.students.slice(-3).reverse();
  const gradeCount = new Set(state.students.map(s => s.grade)).size;

  return `
    <div class="stats">
      <div class="stat"><span class="stat-icon">👩‍🎓</span><div><strong>${state.students.length}</strong><small>Students</small></div></div>
      <div class="stat"><span class="stat-icon">👩‍🏫</span><div><strong>${state.teachers.length}</strong><small>Teachers</small></div></div>
      <div class="stat"><span class="stat-icon">🏫</span><div><strong>${state.classes.length}</strong><small>Classes</small></div></div>
      <div class="stat"><span class="stat-icon">📚</span><div><strong>${gradeCount}</strong><small>Grade levels</small></div></div>
    </div>

    <section class="panel">
      <h2>Recently added students</h2>
      ${recent.length
        ? `<ul class="meta">${recent.map(s =>
            `<li><strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.grade)}, Section ${escapeHtml(s.section)}</li>`
          ).join('')}</ul>`
        : '<p class="muted">No students yet.</p>'}
    </section>

    <section class="panel">
      <h2>Classes overview</h2>
      ${state.classes.length
        ? `<ul class="meta">${state.classes.map(c =>
            `<li><strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.grade)} · ${escapeHtml(c.room || 'No room')} · Adviser: ${escapeHtml(c.adviser || '—')}</li>`
          ).join('')}</ul>`
        : '<p class="muted">No classes yet.</p>'}
    </section>
  `;
}

/* ---------- Students ---------- */
function renderStudents() {
  return `
    <div class="toolbar">
      <input id="searchInput" class="search" type="search"
             placeholder="Search students by name, grade, or section…"
             value="${escapeHtml(searchTerms.students)}" />
    </div>
    <div id="listArea">${renderStudentList()}</div>
  `;
}

function renderStudentList() {
  const q = searchTerms.students.trim().toLowerCase();
  const list = state.students.filter(s =>
    !q || [s.name, s.grade, s.section, s.email, s.phone]
      .some(v => String(v || '').toLowerCase().includes(q))
  );

  if (!list.length) {
    return emptyState(q
      ? 'No students match your search.'
      : 'No students yet. Tap “+ Add Student” to create one.');
  }
  return `<div class="card-grid">${list.map(studentCard).join('')}</div>`;
}

function studentCard(s) {
  return `
    <article class="card">
      <div class="card-head">
        <div class="avatar">${escapeHtml(initials(s.name))}</div>
        <div>
          <h3>${escapeHtml(s.name)}</h3>
          <p class="muted">${escapeHtml(s.grade)} — Section ${escapeHtml(s.section)}</p>
        </div>
      </div>
      <ul class="meta">
        <li>✉️ ${escapeHtml(s.email || '—')}</li>
        <li>📞 ${escapeHtml(s.phone || '—')}</li>
      </ul>
      <div class="card-actions">
        <button class="btn small" data-action="edit" data-type="student" data-id="${s.id}">Edit</button>
        <button class="btn small danger" data-action="delete" data-type="student" data-id="${s.id}">Delete</button>
      </div>
    </article>`;
}

/* ---------- Teachers ---------- */
function renderTeachers() {
  return `
    <div class="toolbar">
      <input id="searchInput" class="search" type="search"
             placeholder="Search teachers by name or subject…"
             value="${escapeHtml(searchTerms.teachers)}" />
    </div>
    <div id="listArea">${renderTeacherList()}</div>
  `;
}

function renderTeacherList() {
  const q = searchTerms.teachers.trim().toLowerCase();
  const list = state.teachers.filter(t =>
    !q || [t.name, t.subject, t.email, t.phone]
      .some(v => String(v || '').toLowerCase().includes(q))
  );

  if (!list.length) {
    return emptyState(q
      ? 'No teachers match your search.'
      : 'No teachers yet. Tap “+ Add Teacher” to create one.');
  }
  return `<div class="card-grid">${list.map(teacherCard).join('')}</div>`;
}

function teacherCard(t) {
  return `
    <article class="card">
      <div class="card-head">
        <div class="avatar">${escapeHtml(initials(t.name))}</div>
        <div>
          <h3>${escapeHtml(t.name)}</h3>
          <p class="muted">${escapeHtml(t.subject || '—')}</p>
        </div>
      </div>
      <ul class="meta">
        <li>✉️ ${escapeHtml(t.email || '—')}</li>
        <li>📞 ${escapeHtml(t.phone || '—')}</li>
      </ul>
      <div class="card-actions">
        <button class="btn small" data-action="edit" data-type="teacher" data-id="${t.id}">Edit</button>
        <button class="btn small danger" data-action="delete" data-type="teacher" data-id="${t.id}">Delete</button>
      </div>
    </article>`;
}

/* ---------- Classes ---------- */
function renderClasses() {
  return `
    <div class="toolbar">
      <input id="searchInput" class="search" type="search"
             placeholder="Search classes by name, grade, or adviser…"
             value="${escapeHtml(searchTerms.classes)}" />
    </div>
    <div id="listArea">${renderClassList()}</div>
  `;
}

function renderClassList() {
  const q = searchTerms.classes.trim().toLowerCase();
  const list = state.classes.filter(c =>
    !q || [c.name, c.grade, c.adviser, c.room]
      .some(v => String(v || '').toLowerCase().includes(q))
  );

  if (!list.length) {
    return emptyState(q
      ? 'No classes match your search.'
      : 'No classes yet. Tap “+ Add Class” to create one.');
  }
  return `<div class="card-grid">${list.map(classCard).join('')}</div>`;
}

function classCard(c) {
  return `
    <article class="card">
      <div class="card-head">
        <div class="avatar">🏫</div>
        <div>
          <h3>${escapeHtml(c.name)}</h3>
          <p class="muted">${escapeHtml(c.grade)}</p>
        </div>
      </div>
      <ul class="meta">
        <li>👩‍🏫 Adviser: ${escapeHtml(c.adviser || '—')}</li>
        <li>🚪 ${escapeHtml(c.room || 'No room assigned')}</li>
      </ul>
      <div class="card-actions">
        <button class="btn small" data-action="edit" data-type="class" data-id="${c.id}">Edit</button>
        <button class="btn small danger" data-action="delete" data-type="class" data-id="${c.id}">Delete</button>
      </div>
    </article>`;
}

/* ---------- Shared UI ---------- */
function emptyState(msg) {
  return `<div class="empty">${escapeHtml(msg)}</div>`;
}

/* ============================================================
   SEARCH
   ============================================================ */
const LIST_RENDERERS = {
  students: renderStudentList,
  teachers: renderTeacherList,
  classes: renderClassList
};

function bindSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', e => {
    searchTerms[currentView] = e.target.value;
    const area = document.getElementById('listArea');
    if (area) area.innerHTML = LIST_RENDERERS[currentView]();
  });
}

/* ============================================================
   MODAL (add / edit)
   ============================================================ */
function fieldsFor(type) {
  if (type === 'student') {
    return [
      { name: 'name',    label: 'Full name',  type: 'text',   required: true },
      { name: 'grade',   label: 'Grade level',type: 'select', options: GRADES, required: true },
      { name: 'section', label: 'Section',    type: 'text',   required: true },
      { name: 'email',   label: 'Email',      type: 'email' },
      { name: 'phone',   label: 'Phone',      type: 'tel' }
    ];
  }
  if (type === 'teacher') {
    return [
      { name: 'name',    label: 'Full name', type: 'text', required: true },
      { name: 'subject', label: 'Subject',   type: 'text', required: true },
      { name: 'email',   label: 'Email',     type: 'email' },
      { name: 'phone',   label: 'Phone',     type: 'tel' }
    ];
  }
  // class
  return [
    { name: 'name',    label: 'Class name', type: 'text', required: true },
    { name: 'grade',   label: 'Grade level',type: 'select', options: GRADES, required: true },
    { name: 'adviser', label: 'Adviser',    type: 'select', options: () => state.teachers.map(t => t.name) },
    { name: 'room',    label: 'Room',       type: 'text' }
  ];
}

function fieldHTML(f, value) {
  const req = f.required ? 'required' : '';
  const star = f.required ? ' *' : '';

  if (f.type === 'select') {
    const opts = (typeof f.options === 'function' ? f.options() : f.options) || [];
    return `
      <div class="field">
        <label for="f_${f.name}">${escapeHtml(f.label)}${star}</label>
        <select id="f_${f.name}" name="${f.name}" ${req}>
          <option value="">Select…</option>
          ${opts.map(o => `<option value="${escapeHtml(o)}" ${o === value ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
        </select>
      </div>`;
  }

  return `
    <div class="field">
      <label for="f_${f.name}">${escapeHtml(f.label)}${star}</label>
      <input id="f_${f.name}" name="${f.name}" type="${f.type}" value="${escapeHtml(value || '')}" ${req} />
    </div>`;
}

function openModal(type, id = null) {
  editing = { type, id };
  const isEdit = Boolean(id);
  const record = isEdit
    ? state[collectionOf(type)].find(r => r.id === id)
    : null;

  document.getElementById('modalTitle').textContent =
    (isEdit ? 'Edit ' : 'Add ') + labelOf(type);

  document.getElementById('modalBody').innerHTML =
    fieldsFor(type).map(f => fieldHTML(f, record ? record[f.name] : '')).join('');

  document.getElementById('modalBackdrop').classList.add('show');

  setTimeout(() => {
    const first = document.querySelector('#modalBody input, #modalBody select');
    if (first) first.focus();
  }, 60);
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('show');
  document.getElementById('recordForm').reset();
  editing = { type: null, id: null };
}

/* ---------- Save form ---------- */
document.getElementById('recordForm').addEventListener('submit', e => {
  e.preventDefault();

  const type = editing.type;
  if (!type) return;

  const wasEdit = Boolean(editing.id);
  const data = {};
  new FormData(e.target).forEach((v, k) => { data[k] = String(v).trim(); });

  // Required-field check
  for (const f of fieldsFor(type)) {
    if (f.required && !data[f.name]) {
      toast('Please fill in: ' + f.label);
      return;
    }
  }

  const collection = collectionOf(type);

  if (wasEdit) {
    const idx = state[collection].findIndex(r => r.id === editing.id);
    if (idx > -1) state[collection][idx] = { ...state[collection][idx], ...data };
  } else {
    state[collection].push({ id: uid(prefixOf(type)), ...data });
  }

  saveState();
  closeModal();
  renderApp();
  toast(wasEdit ? 'Changes saved' : labelOf(type) + ' added');
});

/* ---------- Delete ---------- */
function deleteRecord(type, id) {
  const collection = collectionOf(type);
  const item = state[collection].find(r => r.id === id);
  if (!item) return;
  if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;

  state[collection] = state[collection].filter(r => r.id !== id);
  saveState();
  renderApp();
  toast('Deleted successfully');
}

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ============================================================
   SIDEBAR (mobile drawer)
   ============================================================ */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

document.getElementById('menuBtn').addEventListener('click', () => {
  sidebar.classList.add('open');
  overlay.classList.add('show');
});
overlay.addEventListener('click', closeSidebar);

/* ============================================================
   EVENT WIRING
   ============================================================ */
// Navigation
document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', () => {
    currentView = btn.dataset.view;
    closeSidebar();
    renderApp();
  });
});

// Edit / Delete (event delegation)
document.getElementById('content').addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, type, id } = btn.dataset;
  if (action === 'edit')   openModal(type, id);
  if (action === 'delete') deleteRecord(type, id);
});

// Modal close
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// Reset sample data
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Reset all data back to the sample records?')) return;
  state = JSON.parse(JSON.stringify(SEED));
  saveState();
  searchTerms = { students: '', teachers: '', classes: '' };
  currentView = 'dashboard';
  closeSidebar();
  renderApp();
  toast('Sample data restored');
});

/* ============================================================
   INIT
   ============================================================ */
renderApp();

// Register service worker (enables install / offline)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .catch(err => console.log('Service worker registration failed:', err));
  });
}