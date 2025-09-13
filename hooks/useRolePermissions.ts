// hooks/useRolePermissions.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { RBACService, mapSubscriptionToRole, type UserRole } from '@/lib/auth/rbac'
import { toast } from 'sonner'

interface UsageStats {
  [key: string]: {
    used: number
    limit: number | boolean
  }
}

export function useRolePermissions() {
  const { user, loading } = useUser()
  const [role, setRole] = useState<UserRole>('free_trial')
  const [rbac, setRbac] = useState<RBACService>(new RBACService('free_trial'))
  const [usageStats, setUsageStats] = useState<UsageStats>({})
  const [loadingStats, setLoadingStats] = useState(false)

  // Initialize RBAC based on user
  useEffect(() => {
    if (user) {
      const userRole = mapSubscriptionToRole(
        user.subscription_tier || null, 
        user.email,
        user.is_admin,
        user.free_trial_start_date,
        user.free_trial_end_date
      )
      setRole(userRole)
      setRbac(new RBACService(userRole))
    }
  }, [user])

  // Fetch usage statistics
  const fetchUsageStats = useCallback(async () => {
    if (!user) return
    
    setLoadingStats(true)
    try {
      const response = await fetch('/api/auth/usage-stats')
      if (!response.ok) throw new Error('Failed to fetch usage stats')
      
      const data = await response.json()
      setUsageStats(data.stats)
    } catch (error) {
      console.error('Error fetching usage stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [user])

  // Load usage stats on mount and user change
  useEffect(() => {
    if (user) {
      fetchUsageStats()
    }
  }, [user, fetchUsageStats])

  // Check if user can access a feature
  const canAccess = useCallback((resource: string, action: string): boolean => {
    return rbac.canAccess(resource, action)
  }, [rbac])

  // Check if user has a feature
  const hasFeature = useCallback((feature: any): boolean => {
    return rbac.hasFeature(feature)
  }, [rbac])

  // Check if user is within limit
  const isWithinLimit = useCallback((resource: string, action: string, currentCount?: number): boolean => {
    const count = currentCount ?? usageStats[`${resource}_${action}`]?.used ?? 0
    return rbac.isWithinLimit(resource, action, count)
  }, [rbac, usageStats])

  // Check if user needs to upgrade
  const needsUpgrade = useCallback((feature: any): boolean => {
    const usage = usageStats[feature]?.used ?? 0
    return rbac.needsUpgrade(feature, usage)
  }, [rbac, usageStats])

  // Get feature limit and usage
  const getFeatureUsage = useCallback((feature: string) => {
    const limit = rbac.getFeatureLimit(feature as any)
    const used = usageStats[feature]?.used ?? 0
    const remaining = limit === -1 ? -1 : Math.max(0, (limit as number) - used)
    const percentage = limit === -1 || limit === 0 ? 0 : (used / (limit as number)) * 100
    
    return {
      used,
      limit,
      remaining,
      percentage,
      isUnlimited: limit === -1,
      isExhausted: limit !== -1 && used >= (limit as number)
    }
  }, [rbac, usageStats])

  // Show upgrade prompt
  const showUpgradePrompt = useCallback((feature?: string) => {
    const upgradeTo = rbac.getUpgradeSuggestion()
    if (!upgradeTo) return
    
    const message = feature
      ? `You've reached your ${role} limit for ${feature}. Upgrade to ${upgradeTo} for more access.`
      : `Upgrade to ${upgradeTo} to unlock more features!`
    
    toast.info(message, {
      action: {
        label: 'Upgrade',
        onClick: () => {
          // Navigate to pricing page
          window.location.href = '/pricing'
        }
      },
      duration: 5000,
    })
  }, [rbac, role])

  // Track feature usage
  const trackUsage = useCallback(async (feature: string): Promise<boolean> => {
    if (!user) return false
    
    try {
      const response = await fetch('/api/auth/track-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        if (response.status === 429) {
          showUpgradePrompt(feature)
          return false
        }
        throw new Error(data.error || 'Failed to track usage')
      }
      
      const data = await response.json()
      
      // Update local usage stats
      setUsageStats(prev => ({
        ...prev,
        [feature]: {
          used: (prev[feature]?.used ?? 0) + 1,
          limit: prev[feature]?.limit ?? data.limit
        }
      }))
      
      // Show warning if approaching limit
      if (data.remaining > 0 && data.remaining <= 3) {
        toast.warning(`You have ${data.remaining} ${feature} remaining this month`)
      }
      
      return true
    } catch (error) {
      console.error('Error tracking usage:', error)
      toast.error('Failed to track feature usage')
      return false
    }
  }, [user, showUpgradePrompt])

  // Check UI permissions
  const canAccessUI = useCallback((uiElement: any): boolean => {
    return rbac.canAccessUI(uiElement)
  }, [rbac])

  // Get all permissions
  const getPermissions = useCallback(() => {
    return rbac.getPermissions()
  }, [rbac])

  return {
    // User and role info
    user,
    role,
    loading,
    
    // Permission checks
    canAccess,
    hasFeature,
    isWithinLimit,
    needsUpgrade,
    canAccessUI,
    
    // Usage tracking
    usageStats,
    loadingStats,
    fetchUsageStats,
    trackUsage,
    getFeatureUsage,
    
    // UI helpers
    showUpgradePrompt,
    getPermissions,
    
    // Feature flags
    features: rbac.getPermissions().features,
    ui: rbac.getPermissions().ui,
  }
}