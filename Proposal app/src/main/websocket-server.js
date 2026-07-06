const { WebSocketServer } = require('ws');
const { getRules } = require('./store');
const { findMatchingRule } = require('./url-matcher');
const { showPopup } = require('./windows');

let wss = null;
// Map tabId → WebSocket client for targeted messaging
const clientsByTab = new Map();

function startWebSocketServer() {
  wss = new WebSocketServer({ host: '127.0.0.1', port: 9123 });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'url_change') {
        const { url, channel, tabId } = msg;

        // Track this socket by tabId
        if (tabId != null) clientsByTab.set(tabId, ws);

        const rules = getRules();
        const matched = findMatchingRule(rules, { url, channel });
        if (matched && matched.reminderId) {
          showPopup(matched.reminderId, tabId);
        }
      }
    });

    ws.on('close', () => {
      // Remove tab entries pointing to this socket
      for (const [tabId, sock] of clientsByTab) {
        if (sock === ws) clientsByTab.delete(tabId);
      }
    });
  });

  wss.on('error', (err) => {
    // Port already in use means another instance is running — handled by single-instance lock
    console.error('WebSocket server error:', err.message);
  });
}

function sendGoBack(tabId) {
  const ws = tabId != null ? clientsByTab.get(tabId) : null;
  const payload = JSON.stringify({ type: 'go_back', tabId });

  if (ws && ws.readyState === ws.OPEN) {
    ws.send(payload);
  } else {
    // Broadcast to all connected clients as fallback
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) client.send(payload);
      });
    }
  }
}

module.exports = { startWebSocketServer, sendGoBack };
