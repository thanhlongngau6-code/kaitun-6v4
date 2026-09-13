import redis from '../../lib/redis';
import { requireAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!await requireAdmin(req, res)) return;

  const { accIds, action, ...extra } = req.body;
  if (!accIds?.length || !action)
    return res.status(400).json({ error: 'accIds, action required' });

  await Promise.all(
    accIds.map((id) => redis.lpush(`acc:${id}:cmd`, { action, ...extra, ts: Date.now() }))
  );
  return res.status(200).json({ ok: true, sent: accIds.length });
}
