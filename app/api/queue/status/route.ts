// app/api/queue/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { testRedisConnection } from '@/lib/queue/redis'
import { getAllQueueStats } from '@/lib/queue/queues'

export async function GET(request: NextRequest) {
  try {
    // Test Redis connection
    const redisStatus = await testRedisConnection()

    // Get queue statistics with timeout
    let queueStats = null
    let error = null

    try {
      // Add timeout for queue stats
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Queue stats timeout')), 5000)
      )

      queueStats = await Promise.race([
        getAllQueueStats(),
        timeoutPromise
      ])
    } catch (statsError) {
      error = `Failed to get queue stats: ${statsError}`
      console.error('Queue stats error:', statsError)
    }

    return NextResponse.json({
      redis: redisStatus,
      queues: queueStats,
      error,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasRedisUrl: !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL),
    })

  } catch (error) {
    console.error('Error getting queue status:', error)
    return NextResponse.json(
      {
        error: 'Failed to get queue status',
        details: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}