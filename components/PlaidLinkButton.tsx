'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/useUser'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { toast } from 'sonner'
import {
  CreditCard,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Building2,
  Shield,
  Zap,
  Info,
  Trash2
} from 'lucide-react'

interface PlaidLinkButtonProps {
  userId?: string
  onSuccess?: (data: any) => void
  onExit?: (err: any, metadata: any) => void
  className?: string
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

interface PlaidItem {
  id: string
  item_id: string
  institution_name: string
  status: string
  last_sync: string | null
  accounts?: Array<{
    id: string
    name: string
    type: string
    balance: number
  }>
}

export default function PlaidLinkButton({
  onSuccess,
  onExit,
  className = '',
  variant = 'primary',
  size = 'md'
}: PlaidLinkButtonProps) {
  const { user } = useUser()
  const { hasFeature, needsUpgrade, showUpgradePrompt } = useRolePermissions()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([])
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Check if user has account connection feature
  const canConnectAccounts = hasFeature('account_connections')
  const accountLimit = hasFeature('account_connections') ?
    (needsUpgrade('account_connections') ? 2 : -1) : 0

  // Fetch existing Plaid connections
  const fetchPlaidItems = useCallback(async () => {
    if (!user) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: items, error } = await supabase
        .from('plaid_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && items) {
        setPlaidItems(items.map(item => ({
          id: item.id,
          item_id: item.item_id,
          institution_name: item.institution_name || 'Unknown Bank',
          status: item.status,
          last_sync: item.last_sync,
        })))
      }
    } catch (error) {
      console.error('Error fetching Plaid items:', error)
    }
  }, [user])

  useEffect(() => {
    fetchPlaidItems()
  }, [fetchPlaidItems])

  // Create link token
  const createLinkToken = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/plaid/link-token', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Link token creation failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Failed to create link token`)
      }

      const data = await response.json()
      setLinkToken(data.link_token)
    } catch (err: any) {
      console.error('Error creating link token:', err)
      setError(err.message || 'Failed to initialize bank connection')
      toast.error('Failed to initialize bank connection')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Handle successful connection
  const onSuccessCallback = useCallback(
    async (public_token: string, metadata: any) => {
      if (!user) return

      setLoading(true)
      toast.loading('Connecting your bank account...')

      try {
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_token,
            metadata,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to connect account')
        }

        const data = await response.json()

        toast.dismiss()
        toast.success(`Successfully connected ${metadata.institution.name}!`)

        // Refresh the items list
        await fetchPlaidItems()

        // Call external success handler
        if (onSuccess) {
          onSuccess(data)
        }

      } catch (err: any) {
        console.error('Error exchanging token:', err)
        toast.dismiss()
        toast.error(err.message || 'Failed to connect account')
        setError(err.message || 'Failed to connect account')
      } finally {
        setLoading(false)
      }
    },
    [user, onSuccess, fetchPlaidItems]
  )

  // Handle connection exit
  const onExitCallback = useCallback(
    (err: any, metadata: any) => {
      if (err && err.error_code !== 'USER_EXIT') {
        toast.error('Bank connection was interrupted')
        setError(err.display_message || 'Connection was interrupted')
      }

      if (onExit) {
        onExit(err, metadata)
      }

      setLoading(false)
    },
    [onExit]
  )

  // Handle deleting a plaid item
  const handleDeleteItem = useCallback(async (itemId: string, institutionName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${institutionName}? This will remove all associated accounts and transactions.`)) {
      return
    }

    setDeletingItemId(itemId)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Delete the plaid item (this will cascade delete accounts and transactions)
      const { error: deleteError } = await supabase
        .from('plaid_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user?.id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      toast.success(`Successfully disconnected ${institutionName}`)

      // Refresh the items list
      await fetchPlaidItems()

    } catch (error: any) {
      console.error('Error deleting Plaid item:', error)
      toast.error(`Failed to disconnect ${institutionName}: ${error.message}`)
    } finally {
      setDeletingItemId(null)
    }
  }, [user?.id, fetchPlaidItems])

  // Handle manual transaction sync
  const handleManualSync = useCallback(async () => {
    setSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/plaid/manual-sync', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sync failed')
      }

      const data = await response.json()

      if (data.totalTransactionsSynced > 0) {
        toast.success(`Successfully synced ${data.totalTransactionsSynced} transactions`)
        // Refresh plaid items to update last_sync timestamps
        await fetchPlaidItems()
        // Call onSuccess to refresh the dashboard
        if (onSuccess) {
          onSuccess(data)
        }
      } else {
        toast.info('No new transactions found')
      }

    } catch (error: any) {
      console.error('Error syncing transactions:', error)
      toast.error(`Sync failed: ${error.message}`)
      setError(error.message)
    } finally {
      setSyncing(false)
    }
  }, [onSuccess, fetchPlaidItems])


  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onSuccessCallback,
    onExit: onExitCallback,
  })

  // Handle click to start connection process
  const handleConnect = useCallback(() => {
    if (!canConnectAccounts) {
      showUpgradePrompt('account connections')
      return
    }

    if (accountLimit > 0 && plaidItems.length >= accountLimit) {
      showUpgradePrompt('account connections')
      return
    }

    if (!linkToken) {
      createLinkToken()
    } else if (ready) {
      open()
    }
  }, [canConnectAccounts, accountLimit, plaidItems.length, linkToken, ready, open, createLinkToken, showUpgradePrompt])

  // Removed auto-opening to prevent double Plaid modal
  // The Plaid link will open when user clicks the button

  if (!user) {
    return null
  }

  // Show connected banks as primary card if accounts exist, otherwise show connection card
  if (plaidItems.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connected Banks ({plaidItems.length})
          </CardTitle>
          <CardDescription>
            Your connected bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected Banks List */}
          <div className="space-y-3">
            {plaidItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{item.institution_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last sync: {item.last_sync ? new Date(item.last_sync).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={item.status === 'connected' ? 'default' : 'destructive'}
                  >
                    {item.status === 'connected' ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {item.status}
                  </Badge>
                  <button
                    onClick={() => handleDeleteItem(item.id, item.institution_name)}
                    disabled={deletingItemId === item.id}
                    className="p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700 transition-colors"
                    title={`Disconnect ${item.institution_name}`}
                  >
                    {deletingItemId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Manual Sync and Add Another Bank Section */}
          <div className="border-t pt-4 space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}


            {/* Manual Sync Button */}
            <Button
              onClick={handleManualSync}
              disabled={syncing}
              variant="outline"
              className="w-full"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {syncing ? 'Syncing Transactions...' : 'Sync Transactions'}
            </Button>

            {/* Add Another Bank Button */}
            {canConnectAccounts && !(accountLimit > 0 && plaidItems.length >= accountLimit) && (
              <Button
                onClick={handleConnect}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Connecting...' : 'Add Another Bank'}
              </Button>
            )}
          </div>

          {/* Upgrade Prompts */}
          {!canConnectAccounts && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Account connections are not available in your current plan.
                <Button
                  variant="ghost"
                  className="p-0 h-auto ml-1"
                  onClick={() => showUpgradePrompt('account connections')}
                >
                  Upgrade to connect banks
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {canConnectAccounts && accountLimit > 0 && plaidItems.length >= accountLimit && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You've reached your limit of {accountLimit} connected accounts.
                <Button
                  variant="ghost"
                  className="p-0 h-auto ml-1"
                  onClick={() => showUpgradePrompt('account connections')}
                >
                  Upgrade for unlimited connections
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Security Features */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Bank-level security with 256-bit encryption</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>Automatic transaction categorization and sync</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show initial connection card when no banks are connected
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Connect Bank Account
        </CardTitle>
        <CardDescription>
          Securely connect your bank account to automatically sync transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canConnectAccounts && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Account connections are not available in your current plan.
              <Button
                variant="ghost"
                className="p-0 h-auto ml-1"
                onClick={() => showUpgradePrompt('account connections')}
              >
                Upgrade to connect banks
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleConnect}
            disabled={loading || !canConnectAccounts}
            className={className}
            variant={variant}
            size={size}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Connect Bank Account'}
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Bank-level security with 256-bit encryption</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>Automatic transaction categorization and sync</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}