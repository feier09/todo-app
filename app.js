const STORAGE_KEY = 'todo-app-tasks';
const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const PENCIL_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 20h9"></path>' +
  '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"></path>' +
  '</svg>';

const TRASH_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="3 6 5 6 21 6"></polyline>' +
  '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
  '<path d="M10 11v6"></path>' +
  '<path d="M14 11v6"></path>' +
  '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>' +
  '</svg>';

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
  'stroke="currentColor" stroke-width="3" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true" class="check-icon">' +
  '<polyline points="20 6 9 17 4 12"></polyline>' +
  '</svg>';

const addForm = document.getElementById('addForm');
const taskInput = document.getElementById('taskInput');
const priorityChips = document.getElementById('priorityChips');
const taskList = document.getElementById('taskList');
const pendingCount = document.getElementById('pendingCount');
const completedCount = document.getElementById('completedCount');
const emptyState = document.getElementById('emptyState');
const clearCompletedBtn = document.getElementById('clearCompleted');
const clearAllBtn = document.getElementById('clearAll');
const modalOverlay = document.getElementById('modalOverlay');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

let tasks = loadTasks();
let currentPriority = 'medium';

function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return parsed.map((t) => ({
      ...t,
      priority: PRIORITY_LABELS[t.priority] ? t.priority : 'medium',
    }));
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function sortedTasks() {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return 0;
  });
}

function updateStats() {
  const done = tasks.filter((t) => t.completed).length;
  const pending = tasks.length - done;
  pendingCount.textContent = pending;
  completedCount.textContent = done;
  emptyState.classList.toggle('hidden', tasks.length > 0);
  clearCompletedBtn.disabled = done === 0;
  clearAllBtn.disabled = tasks.length === 0;
}

function renderTasks() {
  taskList.innerHTML = '';

  sortedTasks().forEach((task) => {
    const li = document.createElement('li');
    li.className =
      'task-item priority-' + task.priority + (task.completed ? ' completed' : '');
    li.dataset.id = task.id;

    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = 'task-checkbox' + (task.completed ? ' checked' : '');
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-checked', String(task.completed));
    checkbox.setAttribute('aria-label', '标记完成');
    checkbox.innerHTML = CHECK_SVG;
    checkbox.addEventListener('click', () => toggleTask(task.id));

    const badge = document.createElement('span');
    badge.className = 'priority-badge priority-' + task.priority;
    badge.textContent = PRIORITY_LABELS[task.priority];

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;
    span.title = '双击编辑';
    span.addEventListener('dblclick', () => startEditTask(li, task));

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon btn-edit';
    editBtn.type = 'button';
    editBtn.title = '编辑';
    editBtn.setAttribute('aria-label', '编辑任务');
    editBtn.innerHTML = PENCIL_SVG;
    editBtn.addEventListener('click', () => startEditTask(li, task));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.type = 'button';
    deleteBtn.title = '删除任务';
    deleteBtn.setAttribute('aria-label', '删除任务');
    deleteBtn.innerHTML = TRASH_SVG;
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.append(checkbox, badge, span, editBtn, deleteBtn);
    taskList.appendChild(li);
  });

  updateStats();
}

function startEditTask(li, task) {
  const span = li.querySelector('.task-text');
  if (!span) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-edit-input';
  input.value = task.text;
  input.maxLength = 200;

  span.replaceWith(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  let finished = false;
  const commit = (save) => {
    if (finished) return;
    finished = true;
    const newText = input.value.trim();
    if (save && newText && newText !== task.text) {
      task.text = newText;
      saveTasks();
    }
    renderTasks();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      commit(false);
    }
  });
  input.addEventListener('blur', () => commit(true));
}

function addTask(text, priority) {
  const trimmed = text.trim();
  if (!trimmed) return;

  tasks.unshift({
    id: generateId(),
    text: trimmed,
    completed: false,
    priority: priority || 'medium',
  });

  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

function showConfirm({ title, message, confirmText = '确定', cancelText = '取消', danger = true, icon = '⚠️' }) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalConfirm.textContent = confirmText;
    modalCancel.textContent = cancelText;
    modalIcon.textContent = icon;
    modalIcon.classList.toggle('info', !danger);
    modalConfirm.classList.toggle('safe', !danger);

    modalOverlay.classList.add('visible');
    modalOverlay.setAttribute('aria-hidden', 'false');

    const close = (result) => {
      modalOverlay.classList.remove('visible');
      modalOverlay.setAttribute('aria-hidden', 'true');
      modalConfirm.removeEventListener('click', onConfirm);
      modalCancel.removeEventListener('click', onCancel);
      modalOverlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const onConfirm = () => close(true);
    const onCancel = () => close(false);
    const onOverlay = (e) => { if (e.target === modalOverlay) close(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    };

    modalConfirm.addEventListener('click', onConfirm);
    modalCancel.addEventListener('click', onCancel);
    modalOverlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);

    setTimeout(() => modalConfirm.focus(), 50);
  });
}

function clearCompleted() {
  const hasCompleted = tasks.some((t) => t.completed);
  if (!hasCompleted) return;
  showConfirm({
    title: '清空已完成任务？',
    message: '将删除所有已标记为完成的任务，此操作不可撤销。',
    confirmText: '清空',
    danger: true,
    icon: '🗑️',
  }).then((ok) => {
    if (!ok) return;
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    renderTasks();
  });
}

function clearAll() {
  if (tasks.length === 0) return;
  showConfirm({
    title: '清空全部任务？',
    message: '将删除列表中的所有任务，此操作不可撤销。',
    confirmText: '全部清空',
    danger: true,
    icon: '⚡',
  }).then((ok) => {
    if (!ok) return;
    tasks = [];
    saveTasks();
    renderTasks();
  });
}

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addTask(taskInput.value, currentPriority);
  taskInput.value = '';
  taskInput.focus();
});

priorityChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.priority-chip');
  if (!chip) return;
  currentPriority = chip.dataset.priority;
  priorityChips.querySelectorAll('.priority-chip').forEach((c) => {
    c.classList.toggle('active', c === chip);
  });
});

clearCompletedBtn.addEventListener('click', clearCompleted);
clearAllBtn.addEventListener('click', clearAll);

renderTasks();
