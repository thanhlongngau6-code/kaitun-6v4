import redis from '../../lib/redis';
import { requireAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!await requireAdmin(req, res)) return;

  const { accIds, jobId, placeId } = req.body;
  if (!accIds?.length || !jobId || !placeId)
    return res.status(400).json({ error: 'accIds, jobId, placeId required' });

  await Promise.all(
    accIds.map((id) => redis.lpush(`acc:${id}:cmd`, { action: 'join_server', jobId, placeId, ts: Date.now() }))
  );
  return res.status(200).json({ ok: true, sent: accIds.length });
}
