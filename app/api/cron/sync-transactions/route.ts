// app/api/cron/sync-transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidSyncService } from '@/lib/services/plaid-sync'

// This endpoint should be called by a cron service (Vercel Cron, external cron, etc.)
// to trigger automatic transaction syncing every 15 minutes
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-vercel-cron-secret') || request.headers.get('vercel-cron-secret')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'dev-secret-change-in-production'}`

    // Allow Vercel cron (production) OR manual calls with secret (testing)
    const isVercelCron = cronSecret === process.env.CRON_SECRET
    const isManualAuth = authHeader === expectedAuth

    if (!isVercelCron && !isManualAuth) {
      console.warn('Unauthorized cron sync attempt', {
        hasAuthHeader: !!authHeader,
        hasCronSecret: !!cronSecret,
        isProduction: process.env.NODE_ENV === 'production'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Starting scheduled transaction sync...')

    // Use centralized sync service with 10-minute threshold
    const syncResult = await plaidSyncService.syncAllActiveItems({
      days: 0.17, // ~10 minutes in days (10/60/24)
      priority: 'medium'
    })

    console.log(`✅ Scheduled sync completed: ${syncResult.itemsProcessed} items, ${syncResult.transactionsSynced} transactions`)

    return NextResponse.json({
      success: syncResult.success,
      message: 'Scheduled transaction sync completed',
      synced_items: syncResult.itemsProcessed,
      total_items: syncResult.details?.totalItems || 0,
      total_transactions: syncResult.transactionsSynced,
      errors: syncResult.errors,
      results: syncResult.details?.itemResults || [],
      timestamp: syncResult.timestamp,
    })

  } catch (error) {
    console.error('❌ Error in scheduled transaction sync:', error)
    return NextResponse.json(
      {
        error: 'Scheduled sync failed',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// GET endpoint for health check
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get sync status for monitoring
    const { data: plaidItems } = await supabase
      .from('plaid_items')
      .select('id, item_id, status, last_sync, error_code')
      .eq('status', 'connected')

    const now = new Date()
    const stats = {
      total_active_items: plaidItems?.length || 0,
      recently_synced: plaidItems?.filter(item => {
        if (!item.last_sync) return false
        const lastSync = new Date(item.last_sync)
        const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60)
        return diffMinutes <= 30 // Synced in last 30 minutes
      }).length || 0,
      needs_sync: plaidItems?.filter(item => {
        if (!item.last_sync) return true
        const lastSync = new Date(item.last_sync)
        const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60)
        return diffMinutes > 15 // Hasn't been synced in 15+ minutes
      }).length || 0,
      has_errors: plaidItems?.filter(item => item.error_code).length || 0,
    }

    return NextResponse.json({
      status: 'Scheduled sync endpoint active',
      sync_stats: stats,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    return NextResponse.json({
      status: 'Error getting sync status',
      error: String(error),
      timestamp: new Date().toISOString(),
    })
  }
}

