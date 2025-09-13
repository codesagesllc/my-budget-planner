// lib/auth/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { RBACService, mapSubscriptionToRole, type UserRole } from './rbac'
import { redis } from '@/lib/redis'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: UserRole
    rbac: RBACService
  }
}

// Rate limiting configuration
const RATE_LIMITS = {
  free_trial: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
  },
  basic: {
    windowMs: 60000,
    maxRequests: 30,
  },
  premium: {
    windowMs: 60000,
    maxRequests: 100,
  },
  admin: {
    windowMs: 60000,
    maxRequests: -1, // Unlimited
  },
}

// Create authenticated middleware
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options?: {
    requiredRole?: UserRole
    resource?: string
    action?: string
    rateLimit?: boolean
  }
) {
  return async (req: NextRequest) => {
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // We don't need to set cookies in API routes
          },
        },
      }
    )

    // Get user
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's subscription tier from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, email, is_admin, free_trial_start_date, free_trial_end_date')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Map subscription to role
    const role = mapSubscriptionToRole(
      userData.subscription_tier, 
      userData.email,
      userData.is_admin,
      userData.free_trial_start_date,
      userData.free_trial_end_date
    )
    const rbac = new RBACService(role)

    // Check required role
    if (options?.requiredRole) {
      const roleHierarchy: UserRole[] = ['free_trial', 'basic', 'premium', 'admin']
      const userRoleIndex = roleHierarchy.indexOf(role)
      const requiredRoleIndex = roleHierarchy.indexOf(options.requiredRole)
      
      if (userRoleIndex < requiredRoleIndex) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            requiredRole: options.requiredRole,
            currentRole: role
          },
          { status: 403 }
        )
      }
    }

    // Check resource permissions
    if (options?.resource && options?.action) {
      if (!rbac.canAccess(options.resource, options.action)) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            resource: options.resource,
            action: options.action
          },
          { status: 403 }
        )
      }
    }

    // Apply rate limiting
    if (options?.rateLimit !== false) {
      const rateLimitResult = await checkRateLimit(user.id, role)
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter
          },
          { status: 429 }
        )
      }
    }

    // Add user info to request
    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = {
      id: user.id,
      email: userData.email,
      role,
      rbac,
    }

    // Call the handler
    return handler(authenticatedReq)
  }
}

// Rate limiting helper
async function checkRateLimit(
  userId: string,
  role: UserRole
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limits = RATE_LIMITS[role]
  
  // No rate limit for admins
  if (limits.maxRequests === -1) {
    return { allowed: true }
  }

  const key = `ratelimit:${userId}:${Date.now() / limits.windowMs | 0}`
  
  try {
    const count = await redis.incr(key)
    
    // Set expiry on first request
    if (count === 1) {
      await redis.expire(key, Math.ceil(limits.windowMs / 1000))
    }
    
    if (count > limits.maxRequests) {
      const ttl = await redis.ttl(key)
      return { 
        allowed: false, 
        retryAfter: ttl > 0 ? ttl * 1000 : limits.windowMs 
      }
    }
    
    return { allowed: true }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Allow request if Redis fails
    return { allowed: true }
  }
}

// Usage tracker middleware
export async function trackUsage(
  userId: string,
  feature: string,
  role: UserRole
): Promise<{ allowed: boolean; remaining: number }> {
  const rbac = new RBACService(role)
  const limit = rbac.getFeatureLimit(feature as any)
  
  // Unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1 }
  }
  
  // Boolean features
  if (typeof limit === 'boolean') {
    return { allowed: limit, remaining: limit ? 1 : 0 }
  }
  
  // Numeric limits
  const month = new Date().toISOString().slice(0, 7)
  const key = `usage:${userId}:${feature}:${month}`
  
  try {
    const usage = await redis.incr(key)
    
    // Set expiry on first use
    if (usage === 1) {
      await redis.expire(key, 2592000) // 30 days
    }
    
    const allowed = usage <= limit
    const remaining = Math.max(0, limit - usage)
    
    // Decrement if not allowed
    if (!allowed) {
      await redis.decr(key)
    }
    
    return { allowed, remaining }
  } catch (error) {
    console.error('Usage tracking error:', error)
    // Allow request if Redis fails
    return { allowed: true, remaining: 0 }
  }
}

// Get usage statistics
export async function getUsageStats(userId: string, role: UserRole) {
  const rbac = new RBACService(role)
  const month = new Date().toISOString().slice(0, 7)
  const features = Object.keys(rbac.getPermissions().features)
  
  const stats: Record<string, { used: number; limit: number | boolean }> = {}
  
  for (const feature of features) {
    const limit = rbac.getFeatureLimit(feature as any)
    const key = `usage:${userId}:${feature}:${month}`
    
    try {
      const usageStr = await redis.get(key)
      const used = usageStr ? parseInt(usageStr as string, 10) : 0
      stats[feature] = { used, limit }
    } catch (error) {
      console.error(`Error getting usage for ${feature}:`, error)
      stats[feature] = { used: 0, limit }
    }
  }
  
  return stats
}

// Clear usage stats (for testing or manual reset)
export async function clearUsageStats(userId: string) {
  const month = new Date().toISOString().slice(0, 7)
  const pattern = `usage:${userId}:*:${month}`
  
  try {
    // Get all keys matching pattern
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    return { cleared: keys.length }
  } catch (error) {
    console.error('Error clearing usage stats:', error)
    return { cleared: 0, error }
  }
}