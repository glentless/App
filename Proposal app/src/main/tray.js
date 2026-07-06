const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const { createSettingsWindow } = require('./windows');

let tray = null;

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Focus Guard — Active');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => createSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit Focus Guard',
      click: () => app.exit(0),
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => createSettingsWindow());
  tray.on('double-click', () => createSettingsWindow());
}

module.exports = { createTray };
