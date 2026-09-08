const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const branch = process.env.VERCEL_GIT_COMMIT_REF || '';
  const env = process.env.VERCEL_ENV || '';

  if (env !== 'preview' || branch !== 'rqk-1-0-staging-performance') {
    return res.status(404).json({ detail: 'Not found' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const suffix = crypto.randomInt(1000, 9999);
  const username = `RQK_Staging_${suffix}`;
  const password = `Rook-Pink-${crypto.randomInt(1000, 9999)}!`;

  try {
    const response = await fetch('https://rookie-quest-keeper-api.onrender.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ detail: body.detail || 'Could not create test account' });
    }

    return res.status(201).json({ username, password });
  } catch (error) {
    return res.status(502).json({ detail: 'Test account service unavailable' });
  }
};
