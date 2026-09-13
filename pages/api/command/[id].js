import redis from '../../../lib/redis';
import { requireApiKey, requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    if (!requireApiKey(req, res)) return;
    const cmd = await redis.rpop(`acc:${id}:cmd`);
    return res.status(200).json({ command: cmd || null });
  }

  if (req.method === 'POST') {
    if (!await requireAdmin(req, res)) return;
    const { action, ...extra } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });
    await redis.lpush(`acc:${id}:cmd`, { action, ...extra, ts: Date.now() });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
