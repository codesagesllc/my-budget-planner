'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Database,
  TrendingUp
} from 'lucide-react'

interface PlaidSyncButtonProps {
  userId: string
  onSyncComplete?: () => void
  className?: string
}

interface SyncResult {
  success: boolean
  totalTransactionsSynced: number
  accountsProcessed: number
  results: Array<{
    institution: string
    success: boolean
    transactions?: number
    duplicatesSkipped?: number
    dateRange?: string
    error?: string
    message?: string
  }>
}

export default function PlaidSyncButton({ userId, onSyncComplete, className }: PlaidSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const handleManualSync = async () => {
    setIsLoading(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/plaid/manual-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (response.ok) {
        setSyncResult(result)
        setLastSyncTime(new Date())

        // Call callback to refresh parent component data
        if (onSyncComplete) {
          onSyncComplete()
        }
      } else {
        setSyncResult({
          success: false,
          totalTransactionsSynced: 0,
          accountsProcessed: 0,
          results: [{
            institution: 'System',
            success: false,
            error: result.error || 'Unknown error occurred'
          }]
        })
      }
    } catch (error) {
      console.error('Manual sync error:', error)
      setSyncResult({
        success: false,
        totalTransactionsSynced: 0,
        accountsProcessed: 0,
        results: [{
          institution: 'System',
          success: false,
          error: 'Network error - please try again'
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Button
          onClick={handleManualSync}
          disabled={isLoading}
          className="flex items-center gap-2"
          variant="outline"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Syncing...' : 'Sync Transactions'}
        </Button>

        {lastSyncTime && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="h-3 w-3" />
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </div>
        )}

        {syncResult && (
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="ghost"
            size="sm"
            className="text-sm"
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <Alert>
          <Database className="h-4 w-4 animate-pulse" />
          <AlertDescription className="flex items-center gap-2">
            <span>Fetching latest transactions from your bank accounts...</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Results */}
      {syncResult && !isLoading && (
        <div className="space-y-3">
          {/* Summary Alert */}
          <Alert variant={syncResult.success ? 'default' : 'destructive'}>
            {syncResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              {syncResult.success ? (
                <div className="flex items-center gap-4">
                  <span>
                    ✅ Successfully synced {syncResult.totalTransactionsSynced} new transactions
                    from {syncResult.accountsProcessed} account(s)
                  </span>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">Real-time updated</span>
                  </div>
                </div>
              ) : (
                'Failed to sync transactions. Please check your account connections.'
              )}
            </AlertDescription>
          </Alert>

          {/* Detailed Results */}
          {showDetails && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Sync Details by Institution
              </h4>

              <div className="space-y-2">
                {syncResult.results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{result.institution}</span>
                      </div>

                      {result.success && result.transactions !== undefined && (
                        <div className="text-sm text-gray-600">
                          {result.transactions} new transactions
                          {result.duplicatesSkipped && result.duplicatesSkipped > 0 && (
                            <span className="text-gray-500 ml-1">
                              ({result.duplicatesSkipped} duplicates skipped)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {result.dateRange && (
                      <div className="text-xs text-gray-500 mt-1">
                        Synced {result.dateRange} of data
                      </div>
                    )}

                    {result.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {result.error}
                      </div>
                    )}

                    {result.message && (
                      <div className="text-sm text-gray-600 mt-1">
                        {result.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Helpful Tips */}
              <div className="bg-blue-50 rounded-lg p-3 mt-4">
                <h5 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for Better Sync</h5>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Transactions typically appear within 1-2 business days of posting</li>
                  <li>• Pending transactions may not sync until they're completed</li>
                  <li>• If no transactions appear, check that your accounts are properly connected</li>
                  <li>• Real-time updates will automatically sync new transactions as they post</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}