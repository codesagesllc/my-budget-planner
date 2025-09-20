// app/api/webhooks/plaid/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidSyncService } from '@/lib/services/plaid-sync'
import crypto from 'crypto'
import { headers } from 'next/headers'

// Webhook event types we handle
const WEBHOOK_EVENTS = {
  TRANSACTIONS: 'TRANSACTIONS',
  ITEM_LOGIN_REQUIRED: 'ITEM_LOGIN_REQUIRED',
  ITEM_ERROR: 'ITEM_ERROR',
  PENDING_EXPIRATION: 'PENDING_EXPIRATION',
  USER_PERMISSION_REVOKED: 'USER_PERMISSION_REVOKED',
  ITEM_WEBHOOK_UPDATE_ACKNOWLEDGED: 'ITEM_WEBHOOK_UPDATE_ACKNOWLEDGED',
} as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()

    // Verify webhook signature for security
    const signature = headersList.get('plaid-verification')

    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const webhookData = JSON.parse(body)
    const { webhook_type, webhook_code, item_id, environment, error } = webhookData

    console.log(`Plaid webhook received: ${webhook_type} - ${webhook_code} for item ${item_id}`)

    const supabase = await createClient()

    // Find the Plaid item in our database
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('item_id', item_id)
      .single()

    if (itemError || !plaidItem) {
      console.error('Plaid item not found:', item_id)
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Handle different webhook types
    switch (webhook_type) {
      case WEBHOOK_EVENTS.TRANSACTIONS:
        const syncResult = await plaidSyncService.syncWebhookItem(item_id, { priority: 'high' })
        console.log(`Transaction webhook sync result:`, syncResult)
        break

      case WEBHOOK_EVENTS.ITEM_LOGIN_REQUIRED:
        await plaidSyncService.updateItemStatus(item_id, 'login_required', 'ITEM_LOGIN_REQUIRED', 'Item requires user login to continue syncing')
        console.log(`Item ${item_id} requires login`)
        break

      case WEBHOOK_EVENTS.ITEM_ERROR:
        await plaidSyncService.updateItemStatus(item_id, 'error', error?.error_code, error?.error_message)
        console.log(`Item ${item_id} error: ${error?.error_code} - ${error?.error_message}`)
        break

      case WEBHOOK_EVENTS.PENDING_EXPIRATION:
        await plaidSyncService.updateItemStatus(item_id, 'expiring_soon')
        console.log(`Item ${item_id} consent expiring soon`)
        break

      case WEBHOOK_EVENTS.USER_PERMISSION_REVOKED:
        await plaidSyncService.updateItemStatus(item_id, 'disconnected', 'USER_PERMISSION_REVOKED', 'User revoked access to this item')
        // Mark accounts as inactive
        await supabase
          .from('accounts')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('plaid_item_id', plaidItem.id)
        console.log(`Item ${item_id} permission revoked`)
        break

      case WEBHOOK_EVENTS.ITEM_WEBHOOK_UPDATE_ACKNOWLEDGED:
        // No action needed, just acknowledgment
        console.log('Webhook update acknowledged for item:', item_id)
        break

      default:
        console.log('Unhandled webhook type:', webhook_type)
    }

    // Log webhook for monitoring
    await logWebhookEvent(webhookData, supabase)

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error processing Plaid webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Verify webhook signature for security
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.PLAID_WEBHOOK_SECRET) {
    console.warn('Missing webhook signature or secret')
    return process.env.NODE_ENV === 'development' // Allow in development
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PLAID_WEBHOOK_SECRET)
      .update(body)
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}


// Log webhook events for monitoring and debugging
async function logWebhookEvent(webhookData: any, supabase: any) {
  try {
    // Create a webhook_logs table to store events
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: webhookData.webhook_type,
        webhook_code: webhookData.webhook_code,
        item_id: webhookData.item_id,
        environment: webhookData.environment,
        data: webhookData,
        processed_at: new Date().toISOString(),
      })
  } catch (error) {
    // Don't fail webhook processing if logging fails
    console.error('Error logging webhook event:', error)
  }
}

// GET endpoint for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')

  if (challenge) {
    return NextResponse.json({ challenge })
  }

  return NextResponse.json({ status: 'Plaid webhook endpoint active' })
}