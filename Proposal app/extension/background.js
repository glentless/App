// Service worker: connects to the Focus Guard desktop app via WebSocket and
// forwards URL change events. Handles go_back commands from the app.

const WS_URL = 'ws://127.0.0.1:9123';
const RECONNECT_DELAY_MS = 3000;

let ws = null;
let reconnectTimer = null;

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(WS_URL);

  ws.addEventListener('open', () => {
    clearTimeout(reconnectTimer);
  });

  ws.addEventListener('message', (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'go_back' && msg.tabId != null) {
      chrome.tabs.goBack(msg.tabId).catch(() => {
        // If can't go back (e.g. no history), just navigate away from current URL
        chrome.tabs.update(msg.tabId, { url: 'chrome://newtab/' });
      });
    }
  });

  ws.addEventListener('close', () => {
    ws = null;
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.addEventListener('error', () => {
    ws?.close();
  });
}

function sendToApp(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

async function handleNavigation(details) {
  if (details.frameId !== 0) return; // top-level frame only

  const { tabId, url } = details;

  // Ask content script for the channel name (YouTube only)
  let channel = null;
  if (url.includes('youtube.com')) {
    try {
      const resp = await chrome.tabs.sendMessage(tabId, { type: 'get_channel' });
      channel = resp?.channel || null;
    } catch {
      // Content script not ready yet — channel stays null
    }
  }

  sendToApp({ type: 'url_change', url, channel, tabId });
}

// Catch both full navigations and YouTube SPA history pushes
chrome.webNavigation.onCompleted.addListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);

// Reconnect when service worker wakes up
connect();
