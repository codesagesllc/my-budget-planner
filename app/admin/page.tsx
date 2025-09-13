// app/admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Button, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui'
import { toast } from 'sonner'
import { 
  Users, 
  CreditCard, 
  Activity, 
  Settings,
  RefreshCw,
  Shield,
  Database,
  TrendingUp
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
  const { role, canAccessUI, loading } = useRolePermissions()
  const [users, setUsers] = useState<UserData[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  // Check admin access
  useEffect(() => {
    if (!loading && !canAccessUI('accessAdminPanel')) {
      toast.error('Access denied: Admin privileges required')
      router.push('/dashboard')
    }
  }, [loading, canAccessUI, router])

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

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.includes(searchQuery)
  )

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!canAccessUI('accessAdminPanel')) {
    return null // Will redirect
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
            <Shield className="h-8 w-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-700 mt-1">
            System administration and user management
          </p>
        </div>
        <Button onClick={fetchAdminData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Stats */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.activeUsers} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${systemStats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Monthly recurring</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                AI Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(systemStats.aiUsage).reduce((a, b) => a + b, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Premium Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStats.subscriptionBreakdown.premium}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((systemStats.subscriptionBreakdown.premium / systemStats.totalUsers) * 100)}% of total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="ai">AI Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user subscriptions and permissions</CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Manage system configuration and cache</CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>AI Usage Statistics</CardTitle>
              <CardDescription>Monitor AI feature usage across the platform</CardDescription>
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
    </div>
  )
}