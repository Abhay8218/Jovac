const COLS = ['todo', 'inprogress', 'done'];
const GROQ_API_KEY = 'YOUR_GROQ_KEY';
let tasks = loadTasks();
let skipDuplicateCheck = false;

function loadTasks() {
  return JSON.parse(localStorage.getItem("mini-trello-tasks")) || [
    { id: uid(), title: "Design", priority: "high", col: "todo" },
    { id: uid(), title: "Set up project repo", priority: "med", col: "todo" },
    { id: uid(), title: "Build API endpoints", priority: "high", col: "inprogress" },
    { id: uid(), title: "Write unit tests", priority: "low", col: "done" }
  ];
}

const saveTasks = () => localStorage.setItem("mini-trello-tasks", JSON.stringify(tasks));

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' toast--error' : ' toast--ok');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.className = 'toast toast--hidden'; }, 3500);
}

async function callClaude(prompt) {
  const key = GROQ_API_KEY;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API error ' + res.status);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function checkDuplicate(newTitle) {
  const existing = tasks.map(t => t.title);
  if (!existing.length) return { similar: false, matchedTitle: null };

  const text = await callClaude(
    `You are a duplicate task detector. Decide if the new task is semantically similar or a duplicate of any existing task.

New task: "${newTitle}"
Existing tasks: ${JSON.stringify(existing)}

Rules:
- "Set up repo" and "Set up project repo" ARE similar
- "Design" and "Design the UI" ARE similar
- "Buy groceries" and "Build API" are NOT similar
- Focus on intent, not exact wording

You MUST respond with ONLY this JSON and nothing else, no explanation, no markdown:
{"similar":true,"matchedTitle":"the matching task title"}
OR
{"similar":false,"matchedTitle":null}`
  );

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function runAutoPrioritize() {
  const active = tasks.filter(t => t.col !== 'done');
  if (!active.length) return [];

  const text = await callClaude(
    `You are a task prioritizer. Assign a priority to each task based on its title and urgency.

Tasks: ${JSON.stringify(active.map(t => ({ id: t.id, title: t.title, col: t.col })))}

Priority rules:
- "high": bugs, production issues, deadlines, critical features, anything in "inprogress"
- "med": important but not urgent tasks, regular features
- "low": nice-to-haves, documentation, refactoring, minor tasks

You MUST respond with ONLY a JSON array and nothing else, no explanation, no markdown:
[{"id":"exact_task_id_here","priority":"high"},{"id":"exact_task_id_here","priority":"med"}]

Include every task ID from the input. Use only "high", "med", or "low".`
  );

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function render() {
  COLS.forEach(function(col) {
    const colTasks = tasks.filter(function(t) { return t.col === col; });
    document.getElementById('count-' + col).textContent = colTasks.length;
    const body = document.getElementById('body-' + col);
    body.innerHTML = '';

    if (colTasks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No tasks yet';
      body.appendChild(empty);
    }

    colTasks.forEach(function(task) {
      body.appendChild(buildCard(task, col));
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+ Add task';
    addBtn.addEventListener('click', function() { openModal(null, col); });
    body.appendChild(addBtn);

    setupDropZone(body, col);
  });
  renderStats();
}

function buildCard(task, col) {
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('draggable', 'true');
  card.dataset.id = task.id;

  const badge = document.createElement('span');
  badge.className = 'priority ' + getPriorityClass(task.priority);
  badge.textContent = getPriorityLabel(task.priority);

  const title = document.createElement('span');
  title.className = 'card-title';
  title.textContent = task.title;

  const top = document.createElement('div');
  top.className = 'card-top';
  top.appendChild(title);
  top.appendChild(badge);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const editBtn = makeCardBtn('Edit', false);
  editBtn.addEventListener('click', function() { openModal(task.id, col); });
  actions.appendChild(editBtn);

  COLS.filter(function(c) { return c !== col; }).forEach(function(targetCol) {
    const moveBtn = makeCardBtn('→ ' + colLabel(targetCol), false);
    moveBtn.addEventListener('click', function() { moveTask(task.id, targetCol); });
    actions.appendChild(moveBtn);
  });

  const delBtn = makeCardBtn('Delete', true);
  delBtn.addEventListener('click', function() { deleteTask(task.id); });
  actions.appendChild(delBtn);

  card.appendChild(top);
  card.appendChild(actions);

  card.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('taskId', task.id);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', function() { card.classList.remove('dragging'); });

  return card;
}

function makeCardBtn(label, isDanger) {
  const btn = document.createElement('button');
  btn.className = 'card-btn' + (isDanger ? ' card-btn--danger' : '');
  btn.textContent = label;
  return btn;
}

function setupDropZone(body, col) {
  body.addEventListener('dragover', function(e) {
    e.preventDefault();
    body.classList.add('drag-over');
  });
  body.addEventListener('dragleave', function() { body.classList.remove('drag-over'); });
  body.addEventListener('drop', function(e) {
    e.preventDefault();
    body.classList.remove('drag-over');
    moveTask(e.dataTransfer.getData('taskId'), col);
  });
}

function moveTask(taskId, newCol) {
  const task = tasks.find(function(t) { return t.id === taskId; });
  if (task) { task.col = newCol; saveTasks(); render(); }
}

function deleteTask(taskId) {
  tasks = tasks.filter(function(t) { return t.id !== taskId; });
  saveTasks();
  render();
}

function addTask(title, priority, col) {
  tasks.push({ id: uid(), title, priority, col });
  saveTasks();
  render();
}

function editTask(taskId, newTitle, newPriority) {
  const task = tasks.find(function(t) { return t.id === taskId; });
  if (task) { task.title = newTitle; task.priority = newPriority; saveTasks(); render(); }
}

const modalBg         = document.getElementById('modal-bg');
const modalHeading    = document.getElementById('modal-heading');
const inputTitle      = document.getElementById('input-title');
const inputPriority   = document.getElementById('input-priority');
const inputCol        = document.getElementById('input-col');
const colGroup        = document.getElementById('col-group');
const btnSave         = document.getElementById('btn-save');
const btnCancel       = document.getElementById('btn-cancel');
const aiWarning       = document.getElementById('ai-warning');
const btnAiPrioritize = document.getElementById('btn-ai-prioritize');

let editingTaskId = null;

function openModal(taskId, defaultCol) {
  editingTaskId = taskId;
  skipDuplicateCheck = false;
  aiWarning.classList.add('hidden');
  aiWarning.textContent = '';

  if (taskId) {
    const task = tasks.find(function(t) { return t.id === taskId; });
    modalHeading.textContent = 'Edit task';
    btnSave.textContent = 'Save changes';
    inputTitle.value = task.title;
    inputPriority.value = task.priority;
    colGroup.classList.add('hidden');
  } else {
    modalHeading.textContent = 'Add task';
    btnSave.textContent = 'Add task';
    inputTitle.value = '';
    inputPriority.value = 'med';
    inputCol.value = defaultCol;
    colGroup.classList.remove('hidden');
  }

  modalBg.classList.remove('hidden');
  inputTitle.focus();
}

function closeModal() {
  modalBg.classList.add('hidden');
  editingTaskId = null;
  skipDuplicateCheck = false;
  aiWarning.classList.add('hidden');
  aiWarning.textContent = '';
  btnSave.disabled = false;
  btnSave.textContent = 'Add task';
}

btnSave.addEventListener('click', async function() {
  const title = inputTitle.value.trim();
  if (!title) { inputTitle.focus(); return; }

  const priority = inputPriority.value;

  if (editingTaskId) {
    editTask(editingTaskId, title, priority);
    closeModal();
    return;
  }

  if (!skipDuplicateCheck) {
    btnSave.textContent = 'Checking…';
    btnSave.disabled = true;
    aiWarning.classList.add('hidden');

    try {
      const result = await checkDuplicate(title);

      if (result && result.similar) {
        aiWarning.textContent = `⚠ Similar task found: "${result.matchedTitle}" — still want to add?`;
        aiWarning.classList.remove('hidden');
        btnSave.textContent = 'Add Anyway';
        btnSave.disabled = false;
        skipDuplicateCheck = true;
        return;
      }

      btnSave.textContent = 'Add task';
      btnSave.disabled = false;
    } catch (e) {
      const msg = e.message === 'NO_KEY' ? 'API key not set' : e.message;
      showToast('Duplicate check failed: ' + msg, true);
      btnSave.textContent = 'Add task';
      btnSave.disabled = false;
    }
  }

  addTask(title, priority, inputCol.value);
  closeModal();
});

btnCancel.addEventListener('click', closeModal);

modalBg.addEventListener('click', function(e) {
  if (e.target === modalBg) closeModal();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

btnAiPrioritize.addEventListener('click', async function() {
  const active = tasks.filter(t => t.col !== 'done');
  if (!active.length) {
    showToast('No active tasks to prioritize', false);
    return;
  }

  btnAiPrioritize.textContent = 'Prioritizing…';
  btnAiPrioritize.disabled = true;

  try {
    const updates = await runAutoPrioritize();

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Unexpected response format');
    }

    let changed = 0;
    updates.forEach(function(u) {
      const task = tasks.find(t => t.id === u.id);
      if (task && ['high', 'med', 'low'].includes(u.priority)) {
        if (task.priority !== u.priority) changed++;
        task.priority = u.priority;
      }
    });

    saveTasks();
    render();
    showToast(`✓ Priorities updated (${changed} task${changed !== 1 ? 's' : ''} changed)`, false);
    btnAiPrioritize.textContent = '✦ AI Prioritize';
    btnAiPrioritize.disabled = false;
  } catch (e) {
    const msg = e.message === 'NO_KEY' ? 'API key not set' : e.message;
    showToast('Prioritize failed: ' + msg, true);
    btnAiPrioritize.textContent = '✦ AI Prioritize';
    btnAiPrioritize.disabled = false;
  }
});

function renderStats() {
  const statsEl = document.getElementById('stats');
  const total = tasks.length;
  const done = tasks.filter(function(t) { return t.col === 'done'; }).length;
  const urgent = tasks.filter(function(t) { return t.priority === 'high' && t.col !== 'done'; }).length;

  statsEl.innerHTML = '';

  function makeStat(text, isUrgent) {
    const s = document.createElement('span');
    s.className = 'stat' + (isUrgent ? ' stat--urgent' : '');
    s.textContent = text;
    statsEl.appendChild(s);
  }

  makeStat(total + ' tasks');
  makeStat(done + ' done');
  if (urgent > 0) makeStat(urgent + ' urgent', true);
}

function getPriorityClass(priority) {
  if (priority === 'high') return 'p-high';
  if (priority === 'med') return 'p-med';
  return 'p-low';
}

function getPriorityLabel(priority) {
  if (priority === 'high') return 'High';
  if (priority === 'med') return 'Medium';
  return 'Low';
}

function colLabel(col) {
  if (col === 'todo') return 'To Do';
  if (col === 'inprogress') return 'In Progress';
  return 'Completed';
}

render();
