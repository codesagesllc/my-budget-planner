// lib/auth/rbac.ts
import { SubscriptionTier } from '@/lib/ai/services/ai-service'

export type UserRole = 'free_trial' | 'basic' | 'premium' | 'admin'

export interface Permission {
  resource: string
  action: string
  limit?: number
}

export interface RolePermissions {
  tier: UserRole
  permissions: Permission[]
  features: {
    ai_insights: number
    bill_parsing: number
    income_detection: number
    debt_strategies: number
    transaction_limit: number
    account_connections: number
    export_data: boolean
    priority_support: boolean
    api_access: boolean
    advanced_analytics: boolean
    team_collaboration: boolean
    custom_categories: boolean
    recurring_transaction_detection: boolean
    budget_forecasting: boolean
    goal_tracking: number
    file_uploads: number
    dashboard_customization: boolean
  }
  ui: {
    showUpgradePrompts: boolean
    showUsageMeters: boolean
    accessAdminPanel: boolean
    viewAllUsers: boolean
    manageSubscriptions: boolean
  }
}

// Complete role definitions with all permissions
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  free_trial: {
    tier: 'free_trial',
    permissions: [
      { resource: 'transactions', action: 'read', limit: 500 },
      { resource: 'transactions', action: 'create', limit: 50 },
      { resource: 'accounts', action: 'read', limit: 2 },
      { resource: 'accounts', action: 'create', limit: 2 },
      { resource: 'bills', action: 'read', limit: 10 },
      { resource: 'bills', action: 'create', limit: 10 },
      { resource: 'goals', action: 'read', limit: 3 },
      { resource: 'goals', action: 'create', limit: 3 },
    ],
    features: {
      ai_insights: 3,
      bill_parsing: 5,
      income_detection: 3,
      debt_strategies: 1,
      transaction_limit: 500,
      account_connections: 2,
      export_data: false,
      priority_support: false,
      api_access: false,
      advanced_analytics: false,
      team_collaboration: false,
      custom_categories: false,
      recurring_transaction_detection: false,
      budget_forecasting: false,
      goal_tracking: 3,
      file_uploads: 5,
      dashboard_customization: false,
    },
    ui: {
      showUpgradePrompts: true,
      showUsageMeters: true,
      accessAdminPanel: false,
      viewAllUsers: false,
      manageSubscriptions: false,
    },
  },
  basic: {
    tier: 'basic',
    permissions: [
      { resource: 'transactions', action: 'read', limit: 5000 },
      { resource: 'transactions', action: 'create', limit: 500 },
      { resource: 'accounts', action: 'read', limit: 10 },
      { resource: 'accounts', action: 'create', limit: 10 },
      { resource: 'bills', action: 'read', limit: 50 },
      { resource: 'bills', action: 'create', limit: 50 },
      { resource: 'goals', action: 'read', limit: 10 },
      { resource: 'goals', action: 'create', limit: 10 },
    ],
    features: {
      ai_insights: 20,
      bill_parsing: 20,
      income_detection: 10,
      debt_strategies: 5,
      transaction_limit: 5000,
      account_connections: 10,
      export_data: true,
      priority_support: false,
      api_access: false,
      advanced_analytics: true,
      team_collaboration: false,
      custom_categories: true,
      recurring_transaction_detection: true,
      budget_forecasting: true,
      goal_tracking: 10,
      file_uploads: 20,
      dashboard_customization: false,
    },
    ui: {
      showUpgradePrompts: true,
      showUsageMeters: true,
      accessAdminPanel: false,
      viewAllUsers: false,
      manageSubscriptions: false,
    },
  },
  premium: {
    tier: 'premium',
    permissions: [
      { resource: 'transactions', action: 'read', limit: -1 }, // Unlimited
      { resource: 'transactions', action: 'create', limit: -1 },
      { resource: 'accounts', action: 'read', limit: -1 },
      { resource: 'accounts', action: 'create', limit: -1 },
      { resource: 'bills', action: 'read', limit: -1 },
      { resource: 'bills', action: 'create', limit: -1 },
      { resource: 'goals', action: 'read', limit: -1 },
      { resource: 'goals', action: 'create', limit: -1 },
    ],
    features: {
      ai_insights: -1, // Unlimited
      bill_parsing: -1,
      income_detection: -1,
      debt_strategies: -1,
      transaction_limit: -1,
      account_connections: -1,
      export_data: true,
      priority_support: true,
      api_access: true,
      advanced_analytics: true,
      team_collaboration: true,
      custom_categories: true,
      recurring_transaction_detection: true,
      budget_forecasting: true,
      goal_tracking: -1,
      file_uploads: -1,
      dashboard_customization: true,
    },
    ui: {
      showUpgradePrompts: false,
      showUsageMeters: false,
      accessAdminPanel: false,
      viewAllUsers: false,
      manageSubscriptions: false,
    },
  },
  admin: {
    tier: 'admin',
    permissions: [
      { resource: '*', action: '*', limit: -1 }, // Full access to everything
    ],
    features: {
      ai_insights: -1,
      bill_parsing: -1,
      income_detection: -1,
      debt_strategies: -1,
      transaction_limit: -1,
      account_connections: -1,
      export_data: true,
      priority_support: true,
      api_access: true,
      advanced_analytics: true,
      team_collaboration: true,
      custom_categories: true,
      recurring_transaction_detection: true,
      budget_forecasting: true,
      goal_tracking: -1,
      file_uploads: -1,
      dashboard_customization: true,
    },
    ui: {
      showUpgradePrompts: false,
      showUsageMeters: false,
      accessAdminPanel: true,
      viewAllUsers: true,
      manageSubscriptions: true,
    },
  },
}

// Helper class for checking permissions
export class RBACService {
  private userRole: UserRole
  private permissions: RolePermissions

  constructor(role: UserRole) {
    this.userRole = role
    this.permissions = ROLE_PERMISSIONS[role]
  }

  // Check if user can perform an action on a resource
  canAccess(resource: string, action: string): boolean {
    // Admin has full access
    if (this.userRole === 'admin') return true

    const permission = this.permissions.permissions.find(
      p => (p.resource === resource || p.resource === '*') && 
          (p.action === action || p.action === '*')
    )

    return !!permission
  }

  // Check if user is within limit for a resource action
  isWithinLimit(resource: string, action: string, currentCount: number): boolean {
    // Admin has no limits
    if (this.userRole === 'admin') return true

    const permission = this.permissions.permissions.find(
      p => p.resource === resource && p.action === action
    )

    if (!permission) return false
    if (permission.limit === -1) return true // Unlimited
    return currentCount < permission.limit
  }

  // Get feature limit
  getFeatureLimit(feature: keyof RolePermissions['features']): number {
    return this.permissions.features[feature] as number
  }

  // Check if feature is available
  hasFeature(feature: keyof RolePermissions['features']): boolean {
    const value = this.permissions.features[feature]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    return false
  }

  // Check UI permissions
  canAccessUI(uiElement: keyof RolePermissions['ui']): boolean {
    return this.permissions.ui[uiElement]
  }

  // Get role tier
  getRole(): UserRole {
    return this.userRole
  }

  // Get all permissions
  getPermissions(): RolePermissions {
    return this.permissions
  }

  // Check if user needs to upgrade for a feature
  needsUpgrade(feature: keyof RolePermissions['features'], currentUsage: number = 0): boolean {
    if (this.userRole === 'admin' || this.userRole === 'premium') return false
    
    const limit = this.getFeatureLimit(feature)
    if (limit === -1) return false // Already unlimited
    if (typeof limit === 'boolean') return !limit
    return currentUsage >= limit
  }

  // Get upgrade suggestion based on usage
  getUpgradeSuggestion(): UserRole | null {
    if (this.userRole === 'free_trial') return 'basic'
    if (this.userRole === 'basic') return 'premium'
    return null
  }
}

// Hook usage helper for React components
export function useRBAC(role: UserRole) {
  const rbac = new RBACService(role)
  
  return {
    canAccess: rbac.canAccess.bind(rbac),
    isWithinLimit: rbac.isWithinLimit.bind(rbac),
    getFeatureLimit: rbac.getFeatureLimit.bind(rbac),
    hasFeature: rbac.hasFeature.bind(rbac),
    canAccessUI: rbac.canAccessUI.bind(rbac),
    needsUpgrade: rbac.needsUpgrade.bind(rbac),
    getUpgradeSuggestion: rbac.getUpgradeSuggestion.bind(rbac),
    role: rbac.getRole(),
    permissions: rbac.getPermissions(),
  }
}

// Utility to map subscription tier to role (including admin detection and trial period)
export function mapSubscriptionToRole(
  subscriptionTier: string | null,
  email?: string,
  isAdmin?: boolean,
  freeTrialStartDate?: string | null,
  freeTrialEndDate?: string | null
): UserRole {
  // Check for admin users first
  if (isAdmin) return 'admin'
  
  // Check for admin users by email domain or specific emails
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  const adminDomains = process.env.NEXT_PUBLIC_ADMIN_DOMAINS?.split(',').map(d => d.trim()) || []
  
  if (email) {
    // Check if email is in admin list
    if (adminEmails.includes(email)) return 'admin'
    
    // Check if email domain is admin domain
    const domain = email.split('@')[1]
    if (domain && adminDomains.includes(domain)) return 'admin'
  }
  
  // Check if user is in free trial period (14 days of premium access)
  if (subscriptionTier === 'free_trial' && freeTrialStartDate) {
    const trialStart = new Date(freeTrialStartDate)
    const trialEnd = freeTrialEndDate ? new Date(freeTrialEndDate) : new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000)
    const now = new Date()
    
    // If within trial period, give premium access
    if (now >= trialStart && now <= trialEnd) {
      return 'premium' // Premium access during trial
    }
    // After trial period, limited free access
    return 'free_trial'
  }
  
  // Map subscription tiers to roles
  switch (subscriptionTier) {
    case 'basic':
      return 'basic'
    case 'premium':
      return 'premium'
    default:
      return 'free_trial'
  }
}