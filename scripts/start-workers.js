#!/usr/bin/env node

// scripts/start-workers.js
// This script starts BullMQ workers for processing background jobs

const path = require('path')

// Set up Next.js environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production'

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function startWorkers() {
  try {
    console.log('🚀 Starting BullMQ workers...')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('Redis URL:', process.env.REDIS_URL ? 'Connected' : 'Not configured')

    // Import the worker startup function
    const { startAllWorkers } = await import('../lib/queue/workers.js')

    // Start all workers
    await startAllWorkers()

    console.log('✅ All workers started successfully')
    console.log('💡 Workers are now processing jobs from the queue')
    console.log('🛑 Press Ctrl+C to stop workers')

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🔄 Received SIGINT, gracefully shutting down workers...')

      try {
        const { stopAllWorkers } = await import('../lib/queue/workers.js')
        await stopAllWorkers()

        const { closeRedisConnection } = await import('../lib/queue/redis.js')
        await closeRedisConnection()

        console.log('✅ Workers shut down successfully')
        process.exit(0)
      } catch (error) {
        console.error('❌ Error during shutdown:', error)
        process.exit(1)
      }
    })

    process.on('SIGTERM', async () => {
      console.log('\n🔄 Received SIGTERM, gracefully shutting down workers...')

      try {
        const { stopAllWorkers } = await import('../lib/queue/workers.js')
        await stopAllWorkers()

        const { closeRedisConnection } = await import('../lib/queue/redis.js')
        await closeRedisConnection()

        console.log('✅ Workers shut down successfully')
        process.exit(0)
      } catch (error) {
        console.error('❌ Error during shutdown:', error)
        process.exit(1)
      }
    })

    // Test Redis connection
    const { testRedisConnection } = await import('../lib/queue/redis.js')
    const redisStatus = await testRedisConnection()

    if (redisStatus.connected) {
      console.log(`✅ Redis connected (${redisStatus.type})`)
    } else {
      console.warn(`⚠️ Redis connection issue: ${redisStatus.error}`)
    }

    // Display queue stats periodically
    setInterval(async () => {
      try {
        const { getAllQueueStats } = await import('../lib/queue/queues.js')
        const stats = await getAllQueueStats()

        console.log('\n📊 Queue Statistics:')
        stats.forEach(stat => {
          console.log(`  ${stat.name}: ${stat.waiting} waiting, ${stat.active} active, ${stat.completed} completed, ${stat.failed} failed`)
        })
      } catch (error) {
        console.error('Error getting queue stats:', error)
      }
    }, 30000) // Every 30 seconds

  } catch (error) {
    console.error('❌ Failed to start workers:', error)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Start the workers
startWorkers()