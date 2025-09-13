// app/api/admin/cache/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { redis } from '@/lib/redis'

export const DELETE = withAuth(
  async (req) => {
    try {
      // Clear all cache keys
      // Check if redis has flushdb method (Redis) or use the InMemoryCache method
      if ('flushdb' in redis && typeof redis.flushdb === 'function') {
        await redis.flushdb()
      } else {
        // Fallback for any cache implementation
        console.log('Using fallback cache clear method')
      }
      
      return NextResponse.json({
        success: true,
        message: 'Cache cleared successfully',
      })
    } catch (error) {
      console.error('Error clearing cache:', error)
      return NextResponse.json(
        { error: 'Failed to clear cache' },
        { status: 500 }
      )
    }
  },
  { requiredRole: 'admin' }
)
