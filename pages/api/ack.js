import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { u } = req.query

    if (!u) {
        return res.status(400).json({ error: 'Missing username param ?u=' })
    }

    // xóa lệnh sau khi script đã execute — không fire lại
    await redis.del(`cmd:${u}`)

    return res.status(200).json({ ok: true })
      }
