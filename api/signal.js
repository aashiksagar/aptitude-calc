const { pushSignal, getSignals } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      await pushSignal(body);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Signal push failed' });
    }
  }

  if (req.method === 'GET') {
    const since = parseInt(req.query.since || '0', 10);
    const signals = await getSignals(since);
    return res.status(200).json({ signals });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
