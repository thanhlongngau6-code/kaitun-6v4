import { getToken, destroySession, clearCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const token = getToken(req);
  await destroySession(token);
  res.setHeader('Set-Cookie', clearCookie());
  return res.status(200).json({ ok: true });
}
