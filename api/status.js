const { getUnreadCount } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = req.query.userId || '';
  const count = await getUnreadCount(userId);

  return res.status(200).json({
    status: 'ok',
    unreadCount: count,
    version: `v1.0.${count}`
  });
};
