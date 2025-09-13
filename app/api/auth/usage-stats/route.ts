// app/api/auth/usage-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getUsageStats } from '@/lib/auth/middleware'

export const GET = withAuth(async (req) => {
  const user = req.user!
  const stats = await getUsageStats(user.id, user.role)
  
  return NextResponse.json({
    stats,
    role: user.role,
    features: user.rbac.getPermissions().features,
  })
})

