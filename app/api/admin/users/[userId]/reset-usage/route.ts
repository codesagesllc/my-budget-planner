// app/api/admin/users/[userId]/reset-usage/route.ts
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { clearUsageStats } from '@/lib/auth/middleware'

export const POST = withAuth(
  async (req, { params }) => {
    const userId = params.userId
    
    try {
      const result = await clearUsageStats(userId)
      
      return Response.json({
        success: true,
        cleared: result.cleared,
      })
    } catch (error) {
      return Response.json(
        { error: 'Failed to reset usage stats' },
        { status: 500 }
      )
    }
  },
  { requiredRole: 'admin' }
)