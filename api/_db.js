// Vercel Serverless Database Adapter
// Uses Upstash Redis REST API if configured (1-click free on Vercel)
// Falls back to in-memory store for local testing/development

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

// In-memory fallback
global._memStore = global._memStore || {
  messages: [],
  signals: []
};

async function redisCommand(commandArray) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null; // Fallback to memory
  }

  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commandArray)
    });
    const json = await res.json();
    return json.result;
  } catch (err) {
    console.error('Redis REST command error:', err);
    return null;
  }
}

// Five minutes in milliseconds and seconds
const FIVE_MINUTES_SEC = 5 * 60;
const FIVE_MINUTES_MS = FIVE_MINUTES_SEC * 1000;

async function getMessages(userId) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    // Upstash Redis storage: fetch all message IDs from set
    const ids = await redisCommand(['SMEMBERS', 'chat:msg_ids']) || [];
    if (!ids || ids.length === 0) return [];

    const pipelineCommands = ids.map(id => ['GET', `msg:${id}`]);
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pipelineCommands)
    });
    const results = await res.json();

    const messages = [];
    const now = Date.now();
    const expiredIds = [];

    for (let i = 0; i < results.length; i++) {
      const raw = results[i].result;
      if (raw) {
        try {
          const msg = JSON.parse(raw);
          // Check if message read and expired
          if (msg.readAt && now - msg.readAt >= FIVE_MINUTES_MS) {
            expiredIds.push(msg.id);
          } else {
            messages.push(msg);
          }
        } catch (e) {}
      } else {
        expiredIds.push(ids[i]);
      }
    }

    // Clean up expired IDs from index
    if (expiredIds.length > 0) {
      await redisCommand(['SREM', 'chat:msg_ids', ...expiredIds]);
    }

    // Mark unread messages sent by others as read & set 5-minute TTL
    let updatePipeline = [];
    for (const msg of messages) {
      if (userId && msg.sender !== userId && !msg.readAt) {
        msg.readAt = now;
        msg.expiresAt = now + FIVE_MINUTES_MS;
        // Set in Redis with 5-minute (300s) TTL
        updatePipeline.push(['SETEX', `msg:${msg.id}`, FIVE_MINUTES_SEC, JSON.stringify(msg)]);
      }
    }

    if (updatePipeline.length > 0) {
      await fetch(`${UPSTASH_URL}/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePipeline)
      });
    }

    // Sort by createdAt ascending
    messages.sort((a, b) => a.createdAt - b.createdAt);
    return messages;
  }

  // Memory Fallback
  const now = Date.now();
  global._memStore.messages = global._memStore.messages.filter(m => !m.readAt || now - m.readAt < FIVE_MINUTES_MS);

  for (const msg of global._memStore.messages) {
    if (userId && msg.sender !== userId && !msg.readAt) {
      msg.readAt = now;
      msg.expiresAt = now + FIVE_MINUTES_MS;
    }
  }

  return [...global._memStore.messages].sort((a, b) => a.createdAt - b.createdAt);
}

async function saveMessage(newMsg) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    // Save to Redis: keep up to 48 hours if unread, or until read
    await redisCommand(['SETEX', `msg:${newMsg.id}`, 48 * 3600, JSON.stringify(newMsg)]);
    await redisCommand(['SADD', 'chat:msg_ids', newMsg.id]);
    return newMsg;
  }

  global._memStore.messages.push(newMsg);
  return newMsg;
}

async function getUnreadCount(userId) {
  const msgs = await getMessages('');
  return msgs.filter(m => (!userId || m.sender !== userId) && !m.readAt).length;
}

async function panicWipe() {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const ids = await redisCommand(['SMEMBERS', 'chat:msg_ids']) || [];
    if (ids.length > 0) {
      const delCommands = ids.map(id => ['DEL', `msg:${id}`]);
      delCommands.push(['DEL', 'chat:msg_ids']);
      delCommands.push(['DEL', 'chat:signals']);
      await fetch(`${UPSTASH_URL}/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(delCommands)
      });
    }
    return true;
  }

  global._memStore.messages = [];
  global._memStore.signals = [];
  return true;
}

async function pushSignal(signal) {
  signal.timestamp = Date.now();
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    await redisCommand(['LPUSH', 'chat:signals', JSON.stringify(signal)]);
    await redisCommand(['LTRIM', 'chat:signals', 0, 19]); // Keep last 20
    await redisCommand(['EXPIRE', 'chat:signals', 60]); // Expire after 60s
    return true;
  }

  global._memStore.signals.unshift(signal);
  if (global._memStore.signals.length > 20) {
    global._memStore.signals = global._memStore.signals.slice(0, 20);
  }
  return true;
}

async function getSignals(sinceTimestamp) {
  let signals = [];
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const raw = await redisCommand(['LRANGE', 'chat:signals', 0, 19]) || [];
    signals = raw.map(r => {
      try { return JSON.parse(r); } catch(e) { return null; }
    }).filter(Boolean);
  } else {
    signals = global._memStore.signals || [];
  }

  if (sinceTimestamp) {
    return signals.filter(s => s.timestamp > sinceTimestamp);
  }
  return signals;
}

module.exports = {
  getMessages,
  saveMessage,
  getUnreadCount,
  panicWipe,
  pushSignal,
  getSignals
};
