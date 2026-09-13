import crypto from 'crypto';
import redis from './redis';

export function getToken(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/tlp_session=([^;]+)/);
  return m ? m[1] : null;
}

export async function requireAdmin(req, res) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return false;
  }
  const ok = await redis.get(`session:${token}`);
  if (!ok) {
    res.status(401).json({ error: 'Session expired' });
    return false;
  }
  return true;
}

export async function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  await redis.set(`session:${token}`, '1', { ex: 604800 });
  return token;
}

export async function destroySession(token) {
  if (token) await redis.del(`session:${token}`);
}

export function requireApiKey(req, res) {
  const key = req.headers['x-api-key'];
  if (!process.env.API_KEY || key !== process.env.API_KEY) {
    res.status(401).json({ error: 'Invalid API key' });
    return false;
  }
  return true;
}

export function sessionCookie(token) {
  return `tlp_session=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Strict`;
}

export function clearCookie() {
  return `tlp_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;
}
