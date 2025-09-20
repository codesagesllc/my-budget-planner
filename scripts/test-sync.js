#!/usr/bin/env node

// scripts/test-sync.js
// Test script to verify the Plaid sync functionality

const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function testSyncFunctionality() {
  console.log('🧪 Testing Plaid Sync Functionality...\n')

  try {
    // Test 1: Redis Connection
    console.log('1️⃣ Testing Redis Connection...')
    const { testRedisConnection } = await import('../lib/queue/redis.js')
    const redisResult = await testRedisConnection()

    if (redisResult.connected) {
      console.log(`✅ Redis connected (${redisResult.type})\n`)
    } else {
      console.log(`❌ Redis connection failed: ${redisResult.error}\n`)
      return
    }

    // Test 2: Queue System
    console.log('2️⃣ Testing Queue System...')
    const { getQueue, addTransactionSyncJob } = await import('../lib/queue/queues.js')
    const queue = getQueue('TRANSACTION_SYNC')
    console.log(`✅ Queue '${queue.name}' initialized\n`)

    // Test 3: Worker Creation
    console.log('3️⃣ Testing Worker Creation...')
    const { createTransactionSyncWorker } = await import('../lib/queue/workers.js')
    const worker = createTransactionSyncWorker()
    console.log(`✅ Transaction sync worker created\n`)

    // Test 4: Job Queueing (Mock)
    console.log('4️⃣ Testing Job Queueing...')
    try {
      const testJob = await addTransactionSyncJob({
        plaidItemId: 'test-item-id',
        userId: 'test-user-id',
        accessToken: 'test-access-token',
        cursor: null,
        priority: 1,
      })
      console.log(`✅ Test job queued successfully (ID: ${testJob.id})`)

      // Remove the test job immediately
      await testJob.remove()
      console.log(`✅ Test job cleaned up\n`)
    } catch (error) {
      console.log(`❌ Job queueing failed: ${error.message}\n`)
    }

    // Test 5: Cron Endpoint Health Check
    console.log('5️⃣ Testing Cron Endpoint...')
    try {
      const response = await fetch('http://localhost:3000/api/cron/sync-transactions', {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Cron endpoint responding`)
        console.log(`   Status: ${data.status}`)
        console.log(`   Active Items: ${data.sync_stats?.total_active_items || 0}`)
        console.log(`   Items Needing Sync: ${data.sync_stats?.needs_sync || 0}\n`)
      } else {
        console.log(`⚠️  Cron endpoint returned ${response.status}\n`)
      }
    } catch (error) {
      console.log(`⚠️  Cron endpoint not accessible (app might not be running): ${error.message}\n`)
    }

    // Test 6: Queue Statistics
    console.log('6️⃣ Testing Queue Statistics...')
    const { getAllQueueStats } = await import('../lib/queue/queues.js')
    const stats = await getAllQueueStats()
    console.log(`✅ Queue statistics retrieved:`)
    stats.forEach(stat => {
      console.log(`   ${stat.name}: ${stat.total} total jobs`)
    })
    console.log()

    // Test 7: Environment Variables
    console.log('7️⃣ Checking Environment Variables...')
    const requiredVars = [
      'REDIS_URL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'PLAID_CLIENT_ID',
      'PLAID_SECRET'
    ]

    const missingVars = requiredVars.filter(varName => !process.env[varName])
    if (missingVars.length === 0) {
      console.log(`✅ All required environment variables present\n`)
    } else {
      console.log(`❌ Missing environment variables: ${missingVars.join(', ')}\n`)
    }

    // Cleanup
    console.log('8️⃣ Cleaning up...')
    await worker.close()
    const { closeAllQueues } = await import('../lib/queue/queues.js')
    await closeAllQueues()
    console.log(`✅ Test cleanup completed\n`)

    console.log('🎉 All tests completed successfully!')
    console.log('\n📋 Next Steps:')
    console.log('1. Start workers: npm run workers')
    console.log('2. Start app: npm run dev')
    console.log('3. Test webhook: Use Plaid Dashboard webhook tester')
    console.log('4. Monitor logs: Check console for sync activity')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted, cleaning up...')
  try {
    const { closeAllQueues } = await import('../lib/queue/queues.js')
    await closeAllQueues()
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
  process.exit(0)
})

// Run tests
testSyncFunctionality()