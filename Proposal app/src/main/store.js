const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');

const store = new Store({
  schema: {
    firstRun: { type: 'boolean', default: true },
    rules: { type: 'array', default: [] },
    reminders: { type: 'array', default: [] },
  },
});

function getRules() {
  return store.get('rules', []);
}

function saveRule(rule) {
  const rules = getRules();
  if (!rule.id) {
    rule.id = uuidv4();
    rules.push(rule);
  } else {
    const idx = rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) rules[idx] = rule;
    else rules.push(rule);
  }
  store.set('rules', rules);
  return rule;
}

function deleteRule(id) {
  store.set('rules', getRules().filter((r) => r.id !== id));
}

function getReminders() {
  return store.get('reminders', []);
}

function getReminderById(id) {
  return getReminders().find((r) => r.id === id) || null;
}

function saveReminder(reminder) {
  const reminders = getReminders();
  if (!reminder.id) {
    reminder.id = uuidv4();
    reminders.push(reminder);
  } else {
    const idx = reminders.findIndex((r) => r.id === reminder.id);
    if (idx >= 0) reminders[idx] = reminder;
    else reminders.push(reminder);
  }
  store.set('reminders', reminders);
  return reminder;
}

function deleteReminder(id) {
  store.set('reminders', getReminders().filter((r) => r.id !== id));
  // Also remove references from rules
  const rules = getRules().map((r) => {
    if (r.reminderId === id) r.reminderId = null;
    return r;
  });
  store.set('rules', rules);
}

module.exports = { store, getRules, saveRule, deleteRule, getReminders, getReminderById, saveReminder, deleteReminder, get: store.get.bind(store), set: store.set.bind(store) };
