import { Redis } from 'ioredis'

const redisUrl = process.env.REDIS_URL

export const redis = redisUrl ? new Redis(redisUrl) : null

export async function getCachedTenant(subdomain: string) {
  if (!redis) return null
  const data = await redis.get(`tenant:${subdomain}`)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export async function setCachedTenant(subdomain: string, tenant: object, ttlSeconds = 300) {
  if (!redis) return
  await redis.setex(`tenant:${subdomain}`, ttlSeconds, JSON.stringify(tenant))
}

export async function invalidateTenantCache(subdomain: string) {
  if (!redis) return
  await redis.del(`tenant:${subdomain}`)
}
