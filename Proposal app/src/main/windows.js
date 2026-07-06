const { BrowserWindow, screen } = require('electron');
const path = require('path');

let settingsWin = null;
let popupWin = null;

function createSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    if (settingsWin.isMinimized()) settingsWin.restore();
    settingsWin.show();
    settingsWin.focus();
    return settingsWin;
  }

  settingsWin = new BrowserWindow({
    width: 920,
    height: 680,
    minWidth: 720,
    minHeight: 500,
    title: 'Focus Guard — Settings',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWin.loadFile(path.join(__dirname, '../../src/renderer/settings/index.html'));
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('minimize', (e) => { e.preventDefault(); settingsWin.hide(); });
  settingsWin.on('closed', () => { settingsWin = null; });

  return settingsWin;
}

function showPopup(reminderId, tabId) {
  // Only one popup at a time
  if (popupWin && !popupWin.isDestroyed()) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  popupWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    fullscreen: true,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const params = new URLSearchParams({ reminderId: reminderId || '', tabId: tabId ?? '' });
  popupWin.loadFile(
    path.join(__dirname, '../../src/renderer/popup/index.html'),
    { search: params.toString() }
  );

  popupWin.once('ready-to-show', () => {
    popupWin.show();
    popupWin.focus();
    popupWin.setAlwaysOnTop(true, 'screen-saver');
  });

  popupWin.on('closed', () => { popupWin = null; });
}

module.exports = { createSettingsWindow, showPopup };
