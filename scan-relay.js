/**
 * Lightweight scan relay server.
 * Replaces SignalR for phone-to-PC barcode relay during development.
 *
 * POST /relay/send   { sessionId, purpose, code }  → stores scan
 * GET  /relay/poll/:sessionId                       → returns & clears pending scans
 */
const http = require('http');

const sessions = new Map(); // sessionId → [{ purpose, code, ts }]

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /relay/send
  if (req.method === 'POST' && req.url === '/relay/send') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { sessionId, purpose, code } = JSON.parse(body);
        if (!sessionId || !purpose || !code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing fields' }));
          return;
        }
        if (!sessions.has(sessionId)) sessions.set(sessionId, []);
        sessions.get(sessionId).push({ purpose, code, ts: Date.now() });
        // Auto-cleanup sessions older than 10 minutes
        for (const [id, scans] of sessions) {
          if (scans.length > 0 && Date.now() - scans[0].ts > 600000) sessions.delete(id);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // GET /relay/poll/:sessionId
  if (req.method === 'GET' && req.url?.startsWith('/relay/poll/')) {
    const sessionId = decodeURIComponent(req.url.slice('/relay/poll/'.length));
    const scans = sessions.get(sessionId) || [];
    sessions.set(sessionId, []); // clear after reading
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(scans));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3199;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[scan-relay] Listening on http://0.0.0.0:${PORT}`);
});
