# Focus Guard

A Windows tray app that intercepts distracting URLs (and specific YouTube channels) with a
full-screen reminder and a forced reflection countdown, so you get a moment to reconsider
before you keep scrolling.

## How it works

```
Chrome extension  ──WebSocket (127.0.0.1:9123)──►  Electron desktop app
   (detects URL /                                    (matches rules, shows
    YouTube channel)                                  full-screen reminder)
```

- A **Chrome extension** (Manifest V3) reports the active tab's URL — and, on YouTube, the
  channel name — to the desktop app over a local WebSocket.
- The **Electron app** lives in the system tray, matches each URL/channel against your
  **rules**, and when one matches it shows a full-screen **reminder** (image, optional voice
  recording, and a countdown) before letting you choose *Go Back* or *I'm Aware*.
- *Go Back* tells the extension to navigate the tab back out of the distracting page.

## Features

- **Reminders** — a full-screen image and/or a voice recording, a custom message, and a
  configurable reflection countdown (3–120 s).
- **Rules** — match by URL glob patterns (`*youtube.com/@MrBeast*`) and/or YouTube channel
  keywords, each mapped to a reminder. Rules can be toggled on/off.
- **Tray-only** — no taskbar clutter; single-instance enforced.
- **Local & private** — everything runs on `127.0.0.1`; no data leaves your machine.

## Setup

### 1. Install & run the desktop app

```bash
npm install
npm start
```

The app starts in the system tray and opens Settings on first run.

### 2. Load the Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select the `extension/` folder
   (the Settings → *Extension Setup* tab shows the exact path and a Copy button)

### 3. Configure

- Create a **Reminder** (Reminders tab), then a **Rule** (Rules tab) that points at it.
- Use the **Test** button on any reminder to preview the full-screen popup.

## Run on startup (optional)

`start-focus-guard.vbs` launches the app silently (no console window). Put a shortcut to it in
your `shell:startup` folder. Edit the two paths at the top of the file if you install the app
somewhere other than `d:\Builds\App\Proposal app`.

## Build a Windows installer

```bash
npm run build
```

Produces an NSIS installer in `dist/` via `electron-builder`.

## Project layout

```
main.js                     Electron entry — app lifecycle + IPC handlers
preload.js                  contextBridge API exposed to renderers
src/main/
  store.js                  electron-store persistence (rules, reminders)
  tray.js                   system-tray icon + menu
  url-matcher.js            glob/keyword rule matching
  websocket-server.js       local WS server, per-tab client tracking
  windows.js                settings + full-screen popup windows
src/renderer/
  settings/                 settings UI (reminders, rules, extension setup)
  popup/                    full-screen reminder overlay + countdown
extension/                  Manifest V3 Chrome extension (background + content)
```

## Tech

Electron 28 · electron-store · ws · Manifest V3 Chrome extension
