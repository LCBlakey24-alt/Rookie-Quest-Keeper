const crypto = require('crypto');

const BRANCH = 'rqk-1-0-staging-performance';
const REGISTER_URL = 'https://rookie-quest-keeper-api.onrender.com/api/auth/register';

async function run() {
  if (process.env.VERCEL_GIT_COMMIT_REF !== BRANCH) {
    console.log('Skipping staging account seed outside the staging branch.');
    return;
  }

  const suffix = crypto.randomInt(1000, 9999);
  const username = `RQK_Staging_${suffix}`;
  const password = `RookTest-${crypto.randomBytes(6).toString('hex')}!`;

  try {
    const response = await fetch(REGISTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.json().catch(() => ({}));

    if (response.status === 201) {
      console.log('RQK_STAGING_ACCOUNT_CREATED');
      console.log(`RQK_STAGING_USERNAME=${username}`);
      console.log(`RQK_STAGING_PASSWORD=${password}`);
      return;
    }

    console.warn('RQK_STAGING_ACCOUNT_SEED_FAILED', response.status, body.detail || 'unknown response');
  } catch (error) {
    console.warn('RQK_STAGING_ACCOUNT_SEED_FAILED', error.message);
  }
}

run();
