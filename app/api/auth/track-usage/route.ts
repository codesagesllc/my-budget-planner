// app/api/auth/track-usage/route.ts
import { NextRequest } from 'next/server'
import { withAuth, trackUsage } from '@/lib/auth/middleware'

export const POST = withAuth(async (req) => {
  const user = req.user!
  const { feature } = await req.json()
  
  if (!feature) {
    return Response.json(
      { error: 'Feature name is required' },
      { status: 400 }
    )
  }
  
  const result = await trackUsage(user.id, feature, user.role)
  
  if (!result.allowed) {
    return Response.json(
      { 
        error: 'Feature limit exceeded',
        feature,
        remaining: result.remaining,
        limit: user.rbac.getFeatureLimit(feature as any)
      },
      { status: 429 }
    )
  }
  
  return Response.json({
    success: true,
    remaining: result.remaining,
    limit: user.rbac.getFeatureLimit(feature as any)
  })
})