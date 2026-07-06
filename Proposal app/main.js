const { app, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./src/main/store');
const { createTray } = require('./src/main/tray');
const { createSettingsWindow, showPopup } = require('./src/main/windows');
const { startWebSocketServer, sendGoBack } = require('./src/main/websocket-server');

// Keep single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  createSettingsWindow();
});

// Hide from taskbar, only live in tray
app.setAppUserModelId('com.focusguard.app');

app.whenReady().then(() => {
  // Startup is handled by the shortcut in shell:startup — no registry entry needed.

  // Ensure media directory exists
  const mediaDir = path.join(app.getPath('userData'), 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

  createTray();
  startWebSocketServer();

  // Open settings on first run
  if (store.get('firstRun', true)) {
    store.set('firstRun', false);
    createSettingsWindow();
  }
});

// Don't quit when all windows are closed — stay in tray
app.on('window-all-closed', (e) => e.preventDefault());

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('get-rules', () => store.getRules());
ipcMain.handle('save-rule', (_e, rule) => store.saveRule(rule));
ipcMain.handle('delete-rule', (_e, id) => store.deleteRule(id));

ipcMain.handle('get-reminders', () => store.getReminders());
ipcMain.handle('save-reminder', (_e, reminder) => store.saveReminder(reminder));
ipcMain.handle('delete-reminder', (_e, id) => store.deleteReminder(id));
ipcMain.handle('get-reminder-by-id', (_e, id) => store.getReminderById(id));

ipcMain.handle('copy-media-file', (_e, srcPath) => {
  const mediaDir = path.join(app.getPath('userData'), 'media');
  const ext = path.extname(srcPath);
  const destName = `${Date.now()}${ext}`;
  const destPath = path.join(mediaDir, destName);
  fs.copyFileSync(srcPath, destPath);
  return destPath;
});

ipcMain.handle('pick-file', async (_e, filters) => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('test-reminder', (_e, reminderId) => {
  showPopup(reminderId, null);
});

ipcMain.handle('go-back', (_e, tabId) => {
  sendGoBack(tabId);
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('get-extension-path', () => {
  // In production (packaged), extension is in resources/extension
  // In dev, it's in ./extension
  const devPath = path.join(__dirname, 'extension');
  const prodPath = path.join(process.resourcesPath, 'extension');
  return fs.existsSync(prodPath) ? prodPath : devPath;
});
