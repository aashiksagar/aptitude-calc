const { saveMessage } = require('./_db');
const crypto = require('node:crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    if (!body || (!body.content && !body.mediaData)) {
      return res.status(400).json({ error: 'Message content or media required' });
    }

    const newMsg = {
      id: crypto.randomUUID(),
      sender: body.sender || 'anonymous',
      content: body.content || '',
      iv: body.iv || '',
      mediaType: body.mediaType || null,
      mediaData: body.mediaData || null,
      createdAt: Date.now(),
      readAt: null
    };

    await saveMessage(newMsg);

    return res.status(201).json({
      success: true,
      message: newMsg
    });
  } catch (err) {
    console.error('API Send Error:', err);
    return res.status(500).json({ error: 'Failed to save message' });
  }
};
