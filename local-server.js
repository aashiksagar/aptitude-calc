const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory message store with disk persistence
let messages = [];

function loadMessages() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      messages = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading messages from disk:', err);
    messages = [];
  }
}

function saveMessages() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving messages to disk:', err);
  }
}

loadMessages();

// Server-Sent Events (SSE) clients
const sseClients = new Set();

function broadcastEvent(eventType, payload) {
  const data = JSON.stringify({ type: eventType, data: payload, timestamp: Date.now() });
  for (const client of sseClients) {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// 5-Minute Auto-Purge Loop: runs every 2 seconds
// Purges any message that has been read for >= 5 minutes (300,000 ms)
const FIVE_MINUTES_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  let changed = false;
  const remaining = [];

  for (const msg of messages) {
    if (msg.readAt && now - msg.readAt >= FIVE_MINUTES_MS) {
      changed = true;
      broadcastEvent('message_purged', { id: msg.id });
    } else {
      remaining.push(msg);
    }
  }

  if (changed) {
    messages = remaining;
    saveMessages();
    broadcastUnreadCount();
  }
}, 2000);

function getUnreadCount(userId) {
  // If userId provided, count messages not sent by userId and not yet read
  return messages.filter(m => (!userId || m.sender !== userId) && !m.readAt).length;
}

function broadcastUnreadCount() {
  const totalUnread = messages.filter(m => !m.readAt).length;
  broadcastEvent('unread_update', { count: totalUnread, version: `v1.0.${totalUnread}` });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB max for media
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // --- API: Status / Unread count (Disguised version info) ---
  if (req.method === 'GET' && pathname === '/api/status') {
    const userId = parsedUrl.searchParams.get('userId') || '';
    const unread = getUnreadCount(userId);
    return sendJson(res, 200, {
      status: 'ok',
      unreadCount: unread,
      version: `v1.0.${unread}`
    });
  }

  // --- API: Real-time SSE Stream ---
  if (req.method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(': connected\n\n');

    const client = { res, id: crypto.randomUUID() };
    sseClients.add(client);

    req.on('close', () => {
      sseClients.delete(client);
    });
    return;
  }

  // --- API: Get Messages (and mark as read) ---
  if (req.method === 'GET' && pathname === '/api/messages') {
    const userId = parsedUrl.searchParams.get('userId') || '';
    const now = Date.now();
    let updatedAny = false;

    // Mark unread messages sent by others as read now
    for (const msg of messages) {
      if (userId && msg.sender !== userId && !msg.readAt) {
        msg.readAt = now;
        updatedAny = true;
      }
    }

    if (updatedAny) {
      saveMessages();
      broadcastUnreadCount();
      broadcastEvent('messages_read', { readerId: userId, readAt: now });
    }

    return sendJson(res, 200, {
      messages: messages.map(m => ({
        id: m.id,
        sender: m.sender,
        content: m.content, // encrypted ciphertext
        iv: m.iv,
        mediaType: m.mediaType,
        mediaData: m.mediaData, // encrypted media ciphertext
        createdAt: m.createdAt,
        readAt: m.readAt || null,
        expiresAt: m.readAt ? m.readAt + FIVE_MINUTES_MS : null
      }))
    });
  }

  // --- API: Send Encrypted Message / Media ---
  if (req.method === 'POST' && pathname === '/api/send') {
    try {
      const data = await parseJsonBody(req);
      if (!data.content && !data.mediaData) {
        return sendJson(res, 400, { error: 'Content or media required' });
      }

      const newMsg = {
        id: crypto.randomUUID(),
        sender: data.sender || 'anonymous',
        content: data.content || '',
        iv: data.iv || '',
        mediaType: data.mediaType || null,
        mediaData: data.mediaData || null,
        createdAt: Date.now(),
        readAt: null
      };

      messages.push(newMsg);
      saveMessages();

      // Broadcast new message event
      broadcastEvent('new_message', newMsg);
      broadcastUnreadCount();

      return sendJson(res, 201, {
        success: true,
        message: newMsg
      });
    } catch (err) {
      console.error('Send error:', err);
      return sendJson(res, 500, { error: 'Failed to process message' });
    }
  }

  // --- API: WebRTC Signaling (Call Offer, Answer, ICE Candidates, Hangup) ---
  if (req.method === 'POST' && pathname === '/api/signal') {
    try {
      const signalData = await parseJsonBody(req);
      // Broadcast signal to other connected peer(s)
      broadcastEvent('webrtc_signal', signalData);
      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { error: 'Signaling failed' });
    }
  }

  // --- API: Panic Wipe (Deletes all messages immediately) ---
  if (req.method === 'POST' && pathname === '/api/panic-wipe') {
    messages = [];
    saveMessages();
    broadcastEvent('panic_wiped', {});
    broadcastUnreadCount();
    return sendJson(res, 200, { success: true, message: 'All messages securely purged' });
  }

  // --- Static File Serving ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File Not Found');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Aptitude & Calc Chat] Server listening on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}`);
});
