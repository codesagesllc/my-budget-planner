// app/api/admin/cache/route.ts
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { redis } from '@/lib/redis'

export const DELETE = withAuth(
  async (req) => {
    try {
      // Clear all cache keys
      await redis.flushdb()
      
      return Response.json({
        success: true,
        message: 'Cache cleared successfully',
      })
    } catch (error) {
      console.error('Error clearing cache:', error)
      return Response.json(
        { error: 'Failed to clear cache' },
        { status: 500 }
      )
    }
  },
  { requiredRole: 'admin' }
)