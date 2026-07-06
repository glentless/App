const fg = window.focusGuard;

// ── Tab navigation ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function filePath(p) {
  return p ? `file://${p.replace(/\\/g, '/')}` : '';
}

function basename(p) {
  if (!p) return '';
  return p.replace(/\\/g, '/').split('/').pop();
}

// ── REMINDERS ─────────────────────────────────────────────────────────────────
let reminders = [];
let editingReminder = null;
let pendingImagePath = null;
let pendingAudioPath = null;

async function loadReminders() {
  reminders = await fg.getReminders();
  renderReminders();
}

function renderReminders() {
  const list = document.getElementById('reminders-list');
  if (reminders.length === 0) {
    list.innerHTML = '<div class="empty-state">No reminders yet. Add one to get started.</div>';
    return;
  }
  list.innerHTML = reminders.map((r) => `
    <div class="card" data-id="${r.id}">
      ${r.imagePath
        ? `<img class="card-thumb" src="${filePath(r.imagePath)}" alt="" />`
        : `<div class="card-thumb-placeholder">🖼</div>`}
      <div class="card-info">
        <div class="card-name">${escHtml(r.name || 'Unnamed')}</div>
        <div class="card-meta">${r.audioPath ? '🔊 Voice recording' : 'No audio'} · ${r.countdownSeconds || 10}s countdown</div>
      </div>
      <div class="card-actions">
        <button class="btn-secondary" style="font-size:12px" data-action="test" data-id="${r.id}">Test</button>
        <button class="btn-icon" data-action="edit" data-id="${r.id}">✏️</button>
        <button class="btn-icon danger" data-action="delete" data-id="${r.id}">🗑</button>
      </div>
    </div>
  `).join('');
}

function showReminderForm(reminder = null) {
  editingReminder = reminder;
  pendingImagePath = null;
  pendingAudioPath = null;

  document.getElementById('reminder-form-title').textContent = reminder ? 'Edit Reminder' : 'New Reminder';
  document.getElementById('reminder-id').value = reminder?.id || '';
  document.getElementById('reminder-name').value = reminder?.name || '';
  document.getElementById('reminder-message').value = reminder?.message || '';
  document.getElementById('reminder-countdown').value = reminder?.countdownSeconds ?? 10;

  const imgPrev = document.getElementById('image-preview');
  const imgLabel = document.getElementById('image-filename');
  if (reminder?.imagePath) {
    imgPrev.src = filePath(reminder.imagePath);
    imgPrev.classList.remove('hidden');
    imgLabel.textContent = basename(reminder.imagePath);
  } else {
    imgPrev.src = '';
    imgPrev.classList.add('hidden');
    imgLabel.textContent = 'No file selected';
  }

  const audPrev = document.getElementById('audio-preview');
  const audLabel = document.getElementById('audio-filename');
  if (reminder?.audioPath) {
    audPrev.src = filePath(reminder.audioPath);
    audPrev.classList.remove('hidden');
    audLabel.textContent = basename(reminder.audioPath);
  } else {
    audPrev.src = '';
    audPrev.classList.add('hidden');
    audLabel.textContent = 'No file selected';
  }

  document.getElementById('reminder-form-wrap').classList.remove('hidden');
  document.getElementById('reminder-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

function hideReminderForm() {
  document.getElementById('reminder-form-wrap').classList.add('hidden');
  editingReminder = null;
}

document.getElementById('reminders-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'test') fg.testReminder(id);
  if (btn.dataset.action === 'edit') showReminderForm(reminders.find((r) => r.id === id));
  if (btn.dataset.action === 'delete') {
    if (!confirm('Delete this reminder? Rules using it will lose their reminder.')) return;
    await fg.deleteReminder(id);
    await loadReminders();
  }
});

document.getElementById('add-reminder-btn').addEventListener('click', () => showReminderForm());
document.getElementById('reminder-cancel-btn').addEventListener('click', hideReminderForm);

document.getElementById('pick-image-btn').addEventListener('click', async () => {
  const src = await fg.pickFile([{ name: 'Images', extensions: ['png','jpg','jpeg','gif','webp'] }]);
  if (!src) return;
  const dest = await fg.copyMediaFile(src);
  pendingImagePath = dest;
  document.getElementById('image-filename').textContent = basename(dest);
  const prev = document.getElementById('image-preview');
  prev.src = filePath(dest);
  prev.classList.remove('hidden');
});

document.getElementById('pick-audio-btn').addEventListener('click', async () => {
  const src = await fg.pickFile([{ name: 'Audio', extensions: ['mp3','wav','ogg','m4a','aac'] }]);
  if (!src) return;
  const dest = await fg.copyMediaFile(src);
  pendingAudioPath = dest;
  document.getElementById('audio-filename').textContent = basename(dest);
  const prev = document.getElementById('audio-preview');
  prev.src = filePath(dest);
  prev.classList.remove('hidden');
});

document.getElementById('reminder-save-btn').addEventListener('click', async () => {
  const name = document.getElementById('reminder-name').value.trim();
  if (!name) { alert('Please enter a name for this reminder.'); return; }

  const reminder = {
    id: document.getElementById('reminder-id').value || undefined,
    name,
    message: document.getElementById('reminder-message').value.trim(),
    countdownSeconds: parseInt(document.getElementById('reminder-countdown').value, 10) || 10,
    imagePath: pendingImagePath ?? editingReminder?.imagePath ?? null,
    audioPath: pendingAudioPath ?? editingReminder?.audioPath ?? null,
  };

  await fg.saveReminder(reminder);
  await loadReminders();
  hideReminderForm();
});

// ── RULES ─────────────────────────────────────────────────────────────────────
let rules = [];
let editingRule = null;

async function loadRules() {
  rules = await fg.getRules();
  renderRules();
}

function renderRules() {
  const list = document.getElementById('rules-list');
  if (rules.length === 0) {
    list.innerHTML = '<div class="empty-state">No rules yet. Add one to start blocking distracting sites.</div>';
    return;
  }
  list.innerHTML = rules.map((r) => {
    const reminder = reminders.find((rem) => rem.id === r.reminderId);
    const patternCount = (r.urlPatterns || []).length;
    const kwCount = (r.channelKeywords || []).length;
    return `
      <div class="card" data-id="${r.id}">
        <div class="card-thumb-placeholder">${r.enabled ? '🚫' : '⏸'}</div>
        <div class="card-info">
          <div class="card-name">${escHtml(r.name || 'Unnamed Rule')}</div>
          <div class="card-meta">${patternCount} URL pattern${patternCount !== 1 ? 's' : ''} · ${kwCount} keyword${kwCount !== 1 ? 's' : ''} · ${reminder ? escHtml(reminder.name) : 'No reminder set'}</div>
        </div>
        <div class="card-actions">
          <label class="toggle" title="${r.enabled ? 'Enabled' : 'Disabled'}">
            <input type="checkbox" ${r.enabled ? 'checked' : ''} data-action="toggle" data-id="${r.id}" />
            <span class="toggle-slider"></span>
          </label>
          <button class="btn-icon" data-action="edit" data-id="${r.id}">✏️</button>
          <button class="btn-icon danger" data-action="delete" data-id="${r.id}">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

function showRuleForm(rule = null) {
  editingRule = rule;
  document.getElementById('rule-form-title').textContent = rule ? 'Edit Rule' : 'New Rule';
  document.getElementById('rule-id').value = rule?.id || '';
  document.getElementById('rule-name').value = rule?.name || '';
  document.getElementById('rule-patterns').value = (rule?.urlPatterns || []).join('\n');
  document.getElementById('rule-keywords').value = (rule?.channelKeywords || []).join(', ');

  // Populate reminder dropdown
  const sel = document.getElementById('rule-reminder-select');
  sel.innerHTML = '<option value="">— select a reminder —</option>' +
    reminders.map((r) => `<option value="${r.id}" ${r.id === rule?.reminderId ? 'selected' : ''}>${escHtml(r.name)}</option>`).join('');

  document.getElementById('rule-form-wrap').classList.remove('hidden');
  document.getElementById('rule-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

function hideRuleForm() {
  document.getElementById('rule-form-wrap').classList.add('hidden');
  editingRule = null;
}

document.getElementById('rules-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'edit') showRuleForm(rules.find((r) => r.id === id));
  if (btn.dataset.action === 'delete') {
    if (!confirm('Delete this rule?')) return;
    await fg.deleteRule(id);
    await loadRules();
  }
});

document.getElementById('rules-list').addEventListener('change', async (e) => {
  const chk = e.target.closest('[data-action="toggle"]');
  if (!chk) return;
  const rule = rules.find((r) => r.id === chk.dataset.id);
  if (!rule) return;
  await fg.saveRule({ ...rule, enabled: chk.checked });
  await loadRules();
});

document.getElementById('add-rule-btn').addEventListener('click', () => showRuleForm());
document.getElementById('rule-cancel-btn').addEventListener('click', hideRuleForm);

document.getElementById('rule-save-btn').addEventListener('click', async () => {
  const name = document.getElementById('rule-name').value.trim();
  if (!name) { alert('Please enter a name for this rule.'); return; }

  const patternsRaw = document.getElementById('rule-patterns').value;
  const urlPatterns = patternsRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  const kwRaw = document.getElementById('rule-keywords').value;
  const channelKeywords = kwRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const reminderId = document.getElementById('rule-reminder-select').value || null;

  const rule = {
    id: document.getElementById('rule-id').value || undefined,
    name,
    urlPatterns,
    channelKeywords,
    reminderId,
    enabled: editingRule ? editingRule.enabled : true,
  };

  await fg.saveRule(rule);
  await loadRules();
  hideRuleForm();
});

// ── EXTENSION SETUP ───────────────────────────────────────────────────────────
async function loadExtensionPath() {
  const p = await fg.getExtensionPath();
  const box = document.getElementById('extension-path-box');
  if (box) box.textContent = p || 'Path not found';
}

document.getElementById('copy-path-btn')?.addEventListener('click', async () => {
  const p = await fg.getExtensionPath();
  if (p) navigator.clipboard.writeText(p).then(() => {
    const btn = document.getElementById('copy-path-btn');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(async () => {
  await loadReminders();
  await loadRules();
  await loadExtensionPath();
})();
