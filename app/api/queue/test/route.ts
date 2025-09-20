// app/api/queue/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { addTransactionSyncJob, addNotificationJob } from '@/lib/queue/queues'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'test-sync-job':
        return await testSyncJob(data)

      case 'test-notification-job':
        return await testNotificationJob(data)

      case 'test-redis':
        return await testRedisDirectly()

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: test-sync-job, test-notification-job, test-redis' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in queue test:', error)
    return NextResponse.json(
      {
        error: 'Test failed',
        details: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

async function testSyncJob(data: any) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's first Plaid item for testing
    const { data: plaidItems } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .limit(1)

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({ error: 'No connected Plaid items found for testing' }, { status: 404 })
    }

    const plaidItem = plaidItems[0]

    // Add a test transaction sync job
    const job = await addTransactionSyncJob({
      plaidItemId: plaidItem.id,
      userId: user.id,
      accessToken: plaidItem.access_token,
      cursor: plaidItem.sync_cursor,
      priority: 1, // Low priority for testing
    })

    return NextResponse.json({
      success: true,
      message: 'Transaction sync job added to queue',
      jobId: job.id,
      jobName: job.name,
      plaidItemId: plaidItem.id,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    throw new Error(`Sync job test failed: ${error}`)
  }
}

async function testNotificationJob(data: any) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Add a test notification job
    const job = await addNotificationJob({
      userId: user.id,
      type: 'in-app',
      message: `Test notification from BullMQ at ${new Date().toLocaleTimeString()}`,
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Notification job added to queue',
      jobId: job.id,
      jobName: job.name,
      userId: user.id,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    throw new Error(`Notification job test failed: ${error}`)
  }
}

async function testRedisDirectly() {
  try {
    const { getRedisConnection } = await import('@/lib/queue/redis')
    const redis = getRedisConnection()

    // Test basic Redis operations
    const testKey = `test:${Date.now()}`
    const testValue = 'BullMQ Redis test'

    await redis.set(testKey, testValue)
    const result = await redis.get(testKey)
    await redis.del(testKey)

    // Test list operations (used by BullMQ)
    const listKey = `test:list:${Date.now()}`
    await redis.lpush(listKey, 'item1', 'item2', 'item3')
    const listLength = await redis.llen(listKey)
    const poppedItem = await redis.rpop(listKey)
    await redis.del(listKey)

    return NextResponse.json({
      success: true,
      message: 'Redis test completed successfully',
      tests: {
        setGet: result === testValue,
        listOperations: listLength === 3 && poppedItem === 'item1'
      },
      redisType: process.env.REDIS_URL ? 'external' : 'in-memory',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    throw new Error(`Redis test failed: ${error}`)
  }
}

// GET endpoint to show available test actions
export async function GET() {
  return NextResponse.json({
    message: 'Queue testing endpoint',
    availableActions: [
      {
        action: 'test-sync-job',
        method: 'POST',
        description: 'Add a test transaction sync job to the queue',
        example: { action: 'test-sync-job' }
      },
      {
        action: 'test-notification-job',
        method: 'POST',
        description: 'Add a test notification job to the queue',
        example: { action: 'test-notification-job' }
      },
      {
        action: 'test-redis',
        method: 'POST',
        description: 'Test Redis connection and basic operations',
        example: { action: 'test-redis' }
      }
    ],
    timestamp: new Date().toISOString()
  })
}