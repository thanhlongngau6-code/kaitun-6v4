import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { username, action, jobId } = req.body

    if (!username || !action) {
        return res.status(400).json({ error: 'Missing username or action' })
    }

    // TTL 120s — nếu script offline lệnh tự expire
    await redis.setex(`cmd:${username}`, 120, JSON.stringify({
        action,
        jobId: jobId || null,
        sentAt: Date.now(),
    }))

    return res.status(200).json({ ok: true })
}
