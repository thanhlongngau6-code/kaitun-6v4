import redis from '../../../lib/redis';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  if (!await requireAdmin(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    const cmds = await redis.lrange(`acc:${id}:cmd`, 0, 19);
    return res.status(200).json({ queue: cmds || [], count: cmds?.length || 0 });
  }

  if (req.method === 'DELETE') {
    await redis.del(`acc:${id}:cmd`);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
