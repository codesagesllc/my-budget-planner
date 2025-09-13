// Redis configuration with in-memory fallback
import { Redis } from 'ioredis'

// In-memory cache fallback when Redis is not available
class InMemoryCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map()
  
  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return JSON.stringify(item.value)
  }
  
  async set(key: string, value: string): Promise<'OK'> {
    this.cache.set(key, {
      value: typeof value === 'string' ? value : JSON.stringify(value),
      expiry: Date.now() + 86400000 // 24 hours default
    })
    return 'OK'
  }
  
  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.cache.set(key, {
      value: typeof value === 'string' ? value : JSON.stringify(value),
      expiry: Date.now() + (seconds * 1000)
    })
    return 'OK'
  }
  
  async incr(key: string): Promise<number> {
    const item = this.cache.get(key)
    let value = 1
    
    if (item && Date.now() <= item.expiry) {
      value = (parseInt(item.value as any) || 0) + 1
    }
    
    this.cache.set(key, {
      value: value.toString(),
      expiry: Date.now() + 86400000 // 24 hours default
    })
    
    return value
  }
  
  async decr(key: string): Promise<number> {
    const item = this.cache.get(key)
    let value = -1
    
    if (item && Date.now() <= item.expiry) {
      value = (parseInt(item.value as any) || 0) - 1
    }
    
    if (value < 0) value = 0 // Don't go below 0
    
    this.cache.set(key, {
      value: value.toString(),
      expiry: Date.now() + 86400000 // 24 hours default
    })
    
    return value
  }
  
  async expire(key: string, seconds: number): Promise<number> {
    const item = this.cache.get(key)
    if (!item) return 0
    
    this.cache.set(key, {
      ...item,
      expiry: Date.now() + (seconds * 1000)
    })
    
    return 1
  }
  
  async exists(key: string): Promise<number> {
    const item = this.cache.get(key)
    if (!item) return 0
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return 0
    }
    
    return 1
  }
  
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    const matchingKeys: string[] = []
    
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() <= item.expiry && regex.test(key)) {
        matchingKeys.push(key)
      }
    }
    
    return matchingKeys
  }
  
  async del(...keys: string[]): Promise<number> {
    let deleted = 0
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deleted++
      }
    }
    return deleted
  }
  
  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key)
    if (!item) return -2
    
    const ttl = Math.floor((item.expiry - Date.now()) / 1000)
    return ttl > 0 ? ttl : -2
  }
  
  async flushdb(): Promise<'OK'> {
    this.cache.clear()
    return 'OK'
  }
  
  async flushall(): Promise<'OK'> {
    this.cache.clear()
    return 'OK'
  }
  
  // Redis compatibility methods
  on(event: string, callback: Function): void {
    // No-op for in-memory cache
    if (event === 'connect') {
      console.log('Using in-memory cache (Redis not available)')
    }
  }
  
  multi(): any {
    const operations: Array<() => any> = []
    return {
      incr: (key: string) => {
        operations.push(() => this.incr(key))
        return this
      },
      expire: (key: string, seconds: number) => {
        operations.push(() => this.expire(key, seconds))
        return this
      },
      exec: async () => {
        const results = []
        for (const op of operations) {
          results.push([null, await op()])
        }
        return results
      }
    }
  }
}

// Try to connect to Redis, fallback to in-memory if not available
let redis: Redis | InMemoryCache

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL
  }
  // Default to local Redis
  return 'redis://localhost:6379'
}

// Initialize Redis or fallback
const initializeCache = (): Redis | InMemoryCache => {
  // If we're in development and Redis URL is not explicitly set, use in-memory
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
    console.log('Development mode: Using in-memory cache')
    return new InMemoryCache()
  }

  try {
    const redisClient = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('Redis unavailable, switching to in-memory cache')
          // Switch to in-memory cache
          redis = new InMemoryCache()
          return null
        }
        return Math.min(times * 100, 3000)
      },
      enableReadyCheck: true,
      lazyConnect: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true
        }
        return false
      }
    })

    redisClient.on('error', (err) => {
      if (!err.message.includes('ECONNREFUSED')) {
        console.error('Redis Client Error:', err)
      }
      // Switch to in-memory cache on error
      if (!redis || redis instanceof Redis) {
        console.log('Switching to in-memory cache due to Redis error')
        redis = new InMemoryCache()
      }
    })

    redisClient.on('connect', () => {
      console.log('Redis Client Connected')
    })

    // Try to connect
    redisClient.connect().catch(() => {
      console.log('Redis connection failed, using in-memory cache')
      redis = new InMemoryCache()
    })

    return redisClient
  } catch (error) {
    console.log('Redis initialization failed, using in-memory cache')
    return new InMemoryCache()
  }
}

// Initialize cache
redis = initializeCache()

// Export the redis instance
export { redis }

// Helper functions for common operations
export const redisHelpers = {
  // Set with expiry
  async setWithExpiry(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  },

  // Get and parse JSON
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      if (!value) return null
      
      return JSON.parse(value) as T
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  },

  // Increment with expiry
  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    try {
      const multi = redis.multi()
      multi.incr(key)
      multi.expire(key, ttlSeconds)
      const results = await multi.exec()
      return results?.[0]?.[1] as number || 1
    } catch (error) {
      console.error('Cache increment error:', error)
      return 1
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  },

  // Delete keys by pattern
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length === 0) return 0
      return await redis.del(...keys)
    } catch (error) {
      console.error('Cache delete error:', error)
      return 0
    }
  },

  // Get TTL for a key
  async getTTL(key: string): Promise<number> {
    try {
      return await redis.ttl(key)
    } catch (error) {
      console.error('Cache TTL error:', error)
      return -2
    }
  },
}

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate user's AI cache
  async invalidateUserCache(userId: string): Promise<void> {
    await redisHelpers.deletePattern(`ai:cache:*:${userId}:*`)
  },

  // Invalidate specific feature cache
  async invalidateFeatureCache(userId: string, feature: string): Promise<void> {
    await redisHelpers.deletePattern(`ai:cache:${feature}:${userId}:*`)
  },

  // Clear all AI caches (admin only)
  async clearAllAICaches(): Promise<number> {
    return await redisHelpers.deletePattern('ai:cache:*')
  },
}

// Rate limiting helpers
export const rateLimiting = {
  // Check if request is allowed
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const key = `rate:${identifier}:${Math.floor(Date.now() / 1000 / windowSeconds)}`
    const current = await redisHelpers.incrementWithExpiry(key, windowSeconds)
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt: new Date((Math.floor(Date.now() / 1000 / windowSeconds) + 1) * windowSeconds * 1000),
    }
  },

  // Get current usage
  async getCurrentUsage(identifier: string, windowSeconds: number): Promise<number> {
    try {
      const key = `rate:${identifier}:${Math.floor(Date.now() / 1000 / windowSeconds)}`
      const value = await redis.get(key)
      return value ? parseInt(value, 10) : 0
    } catch (error) {
      console.error('Rate limit get error:', error)
      return 0
    }
  },
}

// Session management
export const sessionCache = {
  // Store session data
  async set(sessionId: string, data: any, ttlSeconds = 3600): Promise<void> {
    await redisHelpers.setWithExpiry(`session:${sessionId}`, data, ttlSeconds)
  },

  // Get session data
  async get<T>(sessionId: string): Promise<T | null> {
    return await redisHelpers.getJSON<T>(`session:${sessionId}`)
  },

  // Delete session
  async delete(sessionId: string): Promise<void> {
    try {
      await redis.del(`session:${sessionId}`)
    } catch (error) {
      console.error('Session delete error:', error)
    }
  },

  // Extend session TTL
  async extend(sessionId: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await redis.expire(`session:${sessionId}`, ttlSeconds)
      return result === 1
    } catch (error) {
      console.error('Session extend error:', error)
      return false
    }
  },
}

// AI response cache management
export const aiCache = {
  // Store AI response
  async store(key: string, response: any, ttlSeconds: number): Promise<void> {
    const cacheData = {
      response,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    }
    await redisHelpers.setWithExpiry(`ai:cache:${key}`, cacheData, ttlSeconds)
  },

  // Get cached AI response
  async get<T>(key: string): Promise<{ data: T; age: number } | null> {
    const cached = await redisHelpers.getJSON<{ response: T; timestamp: number }>(`ai:cache:${key}`)
    if (!cached) return null
    
    return {
      data: cached.response,
      age: Date.now() - cached.timestamp,
    }
  },

  // Check if cache is fresh
  async isFresh(key: string, maxAgeSeconds: number): Promise<boolean> {
    const cached = await this.get(key)
    if (!cached) return false
    return cached.age < maxAgeSeconds * 1000
  },
}

export default redis
