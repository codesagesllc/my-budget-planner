// app/admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Users,
  CreditCard,
  Activity,
  Settings,
  RefreshCw,
  Shield,
  Database,
  TrendingUp,
  ArrowLeft,
  X
} from 'lucide-react'

interface UserData {
  id: string
  email: string
  subscription_tier: string
  subscription_status: string
  created_at: string
  last_login?: string
  usage_stats?: Record<string, number>
}

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  aiUsage: {
    insights: number
    billParsing: number
    incomeDetection: number
    debtStrategies: number
  }
  subscriptionBreakdown: {
    free_trial: number
    basic: number
    premium: number
  }
}

export default function AdminPage() {
  const router = useRouter()
  const { role, canAccessUI, loading, user } = useRolePermissions()
  const [users, setUsers] = useState<UserData[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  // Debug admin access without auto-redirect
  useEffect(() => {
    if (!loading) {
      const hasAccess = canAccessUI('accessAdminPanel')
      console.log('Admin page access check:', {
        loading,
        role,
        userEmail: user?.email,
        hasAccess,
        isAdmin: role === 'admin',
        timestamp: new Date().toISOString()
      })
    }
  }, [loading, role, user?.email, canAccessUI])

  // Fetch admin data
  useEffect(() => {
    if (canAccessUI('accessAdminPanel')) {
      fetchAdminData()
    }
  }, [canAccessUI])

  const fetchAdminData = async () => {
    setLoadingData(true)
    try {
      // Fetch users
      const usersRes = await fetch('/api/admin/users')
      if (!usersRes.ok) throw new Error('Failed to fetch users')
      const usersData = await usersRes.json()
      setUsers(usersData.users)

      // Fetch system stats
      const statsRes = await fetch('/api/admin/stats')
      if (!statsRes.ok) throw new Error('Failed to fetch stats')
      const statsData = await statsRes.json()
      setSystemStats(statsData)
    } catch (error) {
      console.error('Error fetching admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setLoadingData(false)
    }
  }

  const handleUserUpdate = async (userId: string, updates: Partial<UserData>) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) throw new Error('Failed to update user')
      
      toast.success('User updated successfully')
      fetchAdminData() // Refresh data
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  const handleClearCache = async () => {
    try {
      const res = await fetch('/api/admin/cache', {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to clear cache')
      
      toast.success('Cache cleared successfully')
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast.error('Failed to clear cache')
    }
  }

  const handleResetUsage = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-usage`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to reset usage')

      toast.success('Usage stats reset successfully')
      fetchAdminData()
    } catch (error) {
      console.error('Error resetting usage:', error)
      toast.error('Failed to reset usage stats')
    }
  }

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/auth/admin-check')
      const data = await res.json()

      if (res.ok) {
        console.log('Admin Status Check:', data.data)
        toast.info(`Admin Status: ${data.data.hasAdminAccess ? 'GRANTED' : 'DENIED'} (Role: ${data.data.role})`, {
          duration: 5000
        })
      } else {
        console.error('Admin check failed:', data)
        toast.error('Failed to check admin status')
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      toast.error('Error checking admin status')
    }
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.includes(searchQuery)
  )

  if (loading || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!canAccessUI('accessAdminPanel')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Admin privileges required to access this page.</p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm">
            <p><strong>Current Role:</strong> {role}</p>
            <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
            <p className="text-xs text-gray-500 mt-2">
              To get admin access, your email must be added to ADMIN_EMAILS or your account must have admin privileges.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={checkAdminStatus} variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Debug Admin Status
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loadingData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold flex items-center justify-center gap-2 text-gray-900">
                <Shield className="h-8 w-8 text-blue-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-700 mt-1">Loading admin data...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex items-center gap-2 bg-white/50 hover:bg-white/80 border-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>

            <div className="text-center flex-1">
              <div className="inline-flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
              </div>
              <p className="text-slate-600 text-lg font-medium">
                System administration and user management
              </p>
            </div>

            <Button
              onClick={fetchAdminData}
              variant="outline"
              className="bg-white/50 hover:bg-white/80 border-slate-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Stats */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">{systemStats.totalUsers}</div>
                <p className="text-sm text-slate-500 mt-1">
                  {systemStats.activeUsers} active
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">
                  ${systemStats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-sm text-slate-500 mt-1">Monthly recurring</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  AI Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">
                  {Object.values(systemStats.aiUsage).reduce((a, b) => a + b, 0)}
                </div>
                <p className="text-sm text-slate-500 mt-1">Total requests</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                  </div>
                  Premium Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">
                  {systemStats.subscriptionBreakdown.premium}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {Math.round((systemStats.subscriptionBreakdown.premium / systemStats.totalUsers) * 100)}% of total
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100/50">
              <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
                Users
              </TabsTrigger>
              <TabsTrigger value="system" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
                System
              </TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
                AI Management
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-800">User Management</CardTitle>
                <CardDescription className="text-slate-600">Manage user subscriptions and permissions</CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Search users by email or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Email</th>
                      <th className="text-left p-4">Tier</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Created</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <Select
                            value={user.subscription_tier}
                            onValueChange={(value) => 
                              handleUserUpdate(user.id, { subscription_tier: value })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free_trial">Free Trial</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.subscription_status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.subscription_status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetUsage(user.id)}
                            >
                              Reset Usage
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-800">System Settings</CardTitle>
                <CardDescription className="text-slate-600">Manage system configuration and cache</CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Cache Management</Label>
                  <div className="flex gap-4 mt-2">
                    <Button onClick={handleClearCache} variant="destructive">
                      <Database className="h-4 w-4 mr-2" />
                      Clear All Cache
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Admin Emails</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure in environment variables: ADMIN_EMAILS
                  </p>
                </div>

                <div>
                  <Label>Admin Domains</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure in environment variables: ADMIN_DOMAINS
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-800">AI Usage Statistics</CardTitle>
                <CardDescription className="text-slate-600">Monitor AI feature usage across the platform</CardDescription>
              </CardHeader>
            <CardContent>
              {systemStats && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total Insights Generated</Label>
                    <p className="text-2xl font-bold">{systemStats.aiUsage.insights}</p>
                  </div>
                  <div>
                    <Label>Bills Parsed</Label>
                    <p className="text-2xl font-bold">{systemStats.aiUsage.billParsing}</p>
                  </div>
                  <div>
                    <Label>Income Patterns Detected</Label>
                    <p className="text-2xl font-bold">{systemStats.aiUsage.incomeDetection}</p>
                  </div>
                  <div>
                    <Label>Debt Strategies Created</Label>
                    <p className="text-2xl font-bold">{systemStats.aiUsage.debtStrategies}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">User Details</h3>
                <Button
                  onClick={() => setSelectedUser(null)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <Card className="bg-white/60 backdrop-blur-sm border-white/40">
                  <CardHeader>
                    <CardTitle className="text-slate-800">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">User ID</Label>
                      <p className="text-sm text-gray-600 font-mono">{selectedUser.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Subscription Tier</Label>
                      <p className="text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedUser.subscription_tier === 'premium'
                            ? 'bg-purple-100 text-purple-700'
                            : selectedUser.subscription_tier === 'basic'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedUser.subscription_tier.replace('_', ' ').toUpperCase()}
                        </span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <p className="text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedUser.subscription_status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedUser.subscription_status.toUpperCase()}
                        </span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {selectedUser.last_login && (
                      <div>
                        <Label className="text-sm font-medium">Last Login</Label>
                        <p className="text-sm text-gray-600">
                          {new Date(selectedUser.last_login).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Usage Stats */}
                {selectedUser.usage_stats && (
                  <Card className="bg-white/60 backdrop-blur-sm border-white/40">
                    <CardHeader>
                      <CardTitle className="text-slate-800">Usage Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(selectedUser.usage_stats).map(([feature, count]) => (
                          <div key={feature}>
                            <Label className="text-sm font-medium capitalize">
                              {feature.replace('_', ' ')}
                            </Label>
                            <p className="text-lg font-semibold">{count}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <Card className="bg-white/60 backdrop-blur-sm border-white/40">
                  <CardHeader>
                    <CardTitle className="text-slate-800">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleResetUsage(selectedUser.id)}
                        variant="outline"
                        size="sm"
                      >
                        Reset Usage Stats
                      </Button>
                      <Select
                        value={selectedUser.subscription_tier}
                        onValueChange={(value) => {
                          handleUserUpdate(selectedUser.id, { subscription_tier: value })
                          setSelectedUser({...selectedUser, subscription_tier: value})
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Change Tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free_trial">Free Trial</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}