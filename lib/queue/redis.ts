// lib/queue/redis.ts
import { redis as existingRedis } from '@/lib/redis'
import Redis from 'ioredis'

// Use the existing Redis instance for BullMQ to avoid duplication
export function getRedisConnection(): Redis {
  // Check if the existing Redis instance is a real Redis connection
  if (existingRedis instanceof Redis) {
    console.log('✅ Using existing Redis connection for BullMQ')
    return existingRedis
  }

  // If existing Redis is in-memory fallback, create a proper Redis connection for BullMQ
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL

  if (!redisUrl) {
    console.warn('No Redis URL found, creating in-memory fallback for BullMQ')
    return createInMemoryRedis()
  }

  try {
    console.log('🔗 Creating dedicated Redis connection for BullMQ')

    // Handle different Redis URL formats
    let bullmqRedis: Redis

    if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
      // Use URL directly for Redis constructor
      bullmqRedis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
      })
    } else {
      // Upstash format or custom config
      const url = new URL(redisUrl)
      bullmqRedis = new Redis({
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password,
        tls: url.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
      })
    }

    bullmqRedis.on('error', (error) => {
      console.error('BullMQ Redis connection error:', error)
    })

    bullmqRedis.on('connect', () => {
      console.log('✅ BullMQ Redis connected successfully')
    })

    bullmqRedis.on('ready', () => {
      console.log('✅ BullMQ Redis ready for operations')
    })

    return bullmqRedis

  } catch (error) {
    console.error('Failed to create BullMQ Redis connection:', error)
    return createInMemoryRedis()
  }
}

// Simple in-memory Redis fallback for local development
function createInMemoryRedis(): Redis {
  console.log('🔄 Using in-memory Redis fallback for local development')

  const memoryStore = new Map<string, any>()
  const listeners = new Map<string, Function[]>()

  // Create a minimal Redis-compatible interface
  const mockRedis = {
    // Basic operations
    get: async (key: string) => memoryStore.get(key) || null,
    set: async (key: string, value: any) => {
      memoryStore.set(key, value)
      return 'OK'
    },
    del: async (key: string) => {
      const existed = memoryStore.has(key)
      memoryStore.delete(key)
      return existed ? 1 : 0
    },
    exists: async (key: string) => memoryStore.has(key) ? 1 : 0,
    expire: async (key: string, seconds: number) => {
      // Simple expiration - in real Redis this would be automatic
      setTimeout(() => memoryStore.delete(key), seconds * 1000)
      return 1
    },

    // List operations (for BullMQ)
    lpush: async (key: string, ...values: any[]) => {
      const list = memoryStore.get(key) || []
      // lpush adds values one by one to the left (beginning) in the order given
      values.forEach(value => list.unshift(value))
      memoryStore.set(key, list)
      return list.length
    },
    rpop: async (key: string) => {
      const list = memoryStore.get(key) || []
      const value = list.pop()
      memoryStore.set(key, list)
      return value || null
    },
    llen: async (key: string) => {
      const list = memoryStore.get(key) || []
      return list.length
    },

    // Hash operations
    hset: async (key: string, field: string, value: any) => {
      const hash = memoryStore.get(key) || {}
      hash[field] = value
      memoryStore.set(key, hash)
      return 1
    },
    hget: async (key: string, field: string) => {
      const hash = memoryStore.get(key) || {}
      return hash[field] || null
    },
    hgetall: async (key: string) => {
      return memoryStore.get(key) || {}
    },

    // Event handling
    on: (event: string, callback: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, [])
      }
      listeners.get(event)!.push(callback)
    },
    emit: (event: string, ...args: any[]) => {
      const eventListeners = listeners.get(event) || []
      eventListeners.forEach(callback => callback(...args))
    },

    // Connection management
    disconnect: async () => {
      memoryStore.clear()
      listeners.clear()
    },

    // Status
    status: 'ready',
  } as any

  // Emit ready event after next tick
  setTimeout(() => mockRedis.emit('ready'), 0)

  return mockRedis
}

// Test Redis connection
export async function testRedisConnection(): Promise<{ connected: boolean; error?: string; type: string }> {
  try {
    const redis = getRedisConnection()
    await redis.set('test:connection', 'ok')
    const result = await redis.get('test:connection')
    await redis.del('test:connection')

    return {
      connected: result === 'ok',
      type: process.env.REDIS_URL ? 'redis' : 'in-memory'
    }
  } catch (error) {
    return {
      connected: false,
      error: String(error),
      type: 'failed'
    }
  }
}

// Clean shutdown
export async function closeRedisConnection() {
  const redis = getRedisConnection()
  if (redis && typeof redis.disconnect === 'function') {
    await redis.disconnect()
  }
}