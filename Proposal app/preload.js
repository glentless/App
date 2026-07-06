const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('focusGuard', {
  getRules: () => ipcRenderer.invoke('get-rules'),
  saveRule: (rule) => ipcRenderer.invoke('save-rule', rule),
  deleteRule: (id) => ipcRenderer.invoke('delete-rule', id),

  getReminders: () => ipcRenderer.invoke('get-reminders'),
  saveReminder: (reminder) => ipcRenderer.invoke('save-reminder', reminder),
  deleteReminder: (id) => ipcRenderer.invoke('delete-reminder', id),
  getReminderById: (id) => ipcRenderer.invoke('get-reminder-by-id', id),

  copyMediaFile: (srcPath) => ipcRenderer.invoke('copy-media-file', srcPath),
  pickFile: (filters) => ipcRenderer.invoke('pick-file', filters),
  testReminder: (reminderId) => ipcRenderer.invoke('test-reminder', reminderId),
  goBack: (tabId) => ipcRenderer.invoke('go-back', tabId),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getExtensionPath: () => ipcRenderer.invoke('get-extension-path'),
});
