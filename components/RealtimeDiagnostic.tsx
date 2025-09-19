'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Wifi,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'

interface RealtimeDiagnosticProps {
  userId: string
  className?: string
}

interface DiagnosticData {
  lastTransaction: any
  supabaseConnection: 'connected' | 'disconnected' | 'connecting'
  realtimeStatus: 'subscribed' | 'closed' | 'error'
  transactionCount: number
  lastSync: string | null
  plaidItemsStatus: any[]
}

export default function RealtimeDiagnostic({ userId, className }: RealtimeDiagnosticProps) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticData>({
    lastTransaction: null,
    supabaseConnection: 'connecting',
    realtimeStatus: 'closed',
    transactionCount: 0,
    lastSync: null,
    plaidItemsStatus: []
  })
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [realtimeEvents, setRealtimeEvents] = useState<string[]>([])

  const supabase = createClient()

  const runDiagnostic = async () => {
    try {
      // Check latest transaction
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      // Count total transactions
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Check Plaid items and sync status
      const { data: plaidItems, error: plaidError } = await supabase
        .from('plaid_items')
        .select('*')
        .eq('user_id', userId)

      setDiagnostic(prev => ({
        ...prev,
        lastTransaction: transactions?.[0] || null,
        transactionCount: count || 0,
        lastSync: plaidItems?.[0]?.last_sync || null,
        plaidItemsStatus: plaidItems || []
      }))

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Diagnostic error:', error)
    }
  }

  useEffect(() => {
    runDiagnostic()

    // Set up realtime diagnostic subscription
    const channel = supabase
      .channel('diagnostic-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          const event = `${new Date().toLocaleTimeString()}: ${payload.eventType} - ${(payload.new as any)?.description || (payload.old as any)?.description || 'Unknown'}`
          setRealtimeEvents(prev => [event, ...prev.slice(0, 4)])
          runDiagnostic()
        })
      .subscribe((status) => {
        setDiagnostic(prev => ({
          ...prev,
          realtimeStatus: status === 'SUBSCRIBED' ? 'subscribed' : status === 'CLOSED' ? 'closed' : 'error'
        }))
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'subscribed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'disconnected':
      case 'closed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const timeSince = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays} day(s) ago`
    if (diffHours > 0) return `${diffHours} hour(s) ago`
    if (diffMins > 0) return `${diffMins} minute(s) ago`
    return 'Just now'
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Real-time Diagnostic
        </h4>
        <button
          onClick={runDiagnostic}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Realtime Connection:</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(diagnostic.realtimeStatus)}
            <span className="capitalize">{diagnostic.realtimeStatus}</span>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Total Transactions:</span>
          <span className="font-medium">{diagnostic.transactionCount}</span>
        </div>

        {/* Last Transaction */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Last Transaction:</span>
          <span className="font-medium">
            {diagnostic.lastTransaction
              ? timeSince(diagnostic.lastTransaction.created_at)
              : 'None'}
          </span>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Last Plaid Sync:</span>
          <span className="font-medium">
            {diagnostic.lastSync
              ? timeSince(diagnostic.lastSync)
              : 'Never'}
          </span>
        </div>

        {/* Plaid Items Status */}
        <div className="border-t pt-2">
          <span className="text-gray-600 text-xs">Plaid Accounts:</span>
          {diagnostic.plaidItemsStatus.length === 0 ? (
            <p className="text-xs text-gray-500 mt-1">No Plaid accounts connected</p>
          ) : (
            <div className="mt-1 space-y-1">
              {diagnostic.plaidItemsStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span>{item.institution_name}</span>
                  <span className={`px-2 py-1 rounded-full ${
                    item.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Events */}
        {realtimeEvents.length > 0 && (
          <div className="border-t pt-2">
            <span className="text-gray-600 text-xs">Recent Events:</span>
            <div className="mt-1 space-y-1">
              {realtimeEvents.map((event, index) => (
                <p key={index} className="text-xs text-gray-500">{event}</p>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          Last checked: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {diagnostic.plaidItemsStatus.length === 0 && (
        <Alert className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            No Plaid accounts connected. Real-time updates require active bank connections.
          </AlertDescription>
        </Alert>
      )}

      {diagnostic.lastSync && new Date().getTime() - new Date(diagnostic.lastSync).getTime() > 24 * 60 * 60 * 1000 && (
        <Alert className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Last sync was over 24 hours ago. Consider manually syncing transactions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}