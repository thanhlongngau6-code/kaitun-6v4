import { createSession, sessionCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Sai mật khẩu' });
  }
  const token = await createSession();
  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(200).json({ ok: true });
}
