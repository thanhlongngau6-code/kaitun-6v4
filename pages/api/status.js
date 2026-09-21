import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { username, jobId, placeId, race, role, status, running, timestamp } = req.body

    if (!username) {
        return res.status(400).json({ error: 'Missing username' })
    }

    // TTL 30s — nếu script mất kết nối tự expire
    await redis.setex(`acc:${username}`, 30, JSON.stringify({
        username,
        jobId,
        placeId,
        race,
        role,
        status,
        running,
        timestamp,
        updatedAt: Date.now(),
    }))

    return res.status(200).json({ ok: true })
      }
