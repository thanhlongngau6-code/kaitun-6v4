import redis from '../../lib/redis';
import { requireApiKey } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const { accId, jobId, placeId, race, stage, level, status } = req.body;
  if (!accId) return res.status(400).json({ error: 'accId required' });

  const state = {
    jobId:    jobId    || '',
    placeId:  placeId  || '',
    race:     race     || 'Unknown',
    stage:    stage    || 'V1',
    level:    Number(level) || 0,
    status:   status   || 'idle',
    lastSeen: new Date().toISOString(),
  };

  await redis.set(`acc:${accId}:state`, state);
  await redis.sadd('acc:list', accId);
  return res.status(200).json({ ok: true });
}
