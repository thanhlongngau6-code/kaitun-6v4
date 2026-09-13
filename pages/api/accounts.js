import redis from '../../lib/redis';
import { requireAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (!await requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const ids = await redis.smembers('acc:list');
    if (!ids || ids.length === 0) return res.status(200).json({ accounts: [] });
    const accounts = await Promise.all(
      ids.map(async (id) => {
        const state = await redis.get(`acc:${id}:state`);
        const qlen  = await redis.llen(`acc:${id}:cmd`);
        return { id, ...(state || {}), pendingCmds: qlen || 0 };
      })
    );
    accounts.sort((a, b) => a.id.localeCompare(b.id));
    return res.status(200).json({ accounts });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    await redis.srem('acc:list', id);
    await redis.del(`acc:${id}:state`);
    await redis.del(`acc:${id}:cmd`);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
      }
