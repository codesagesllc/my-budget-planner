#!/usr/bin/env node

// scripts/start-workers-production.js
// Production-ready worker startup script with health checks and monitoring

const path = require('path')
const fs = require('fs')

// Set up production environment
process.env.NODE_ENV = 'production'

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

// Health check server
const http = require('http')

let healthServer = null
let workers = null
let isShuttingDown = false

async function startHealthServer() {
  return new Promise((resolve) => {
    healthServer = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json')

      if (req.url === '/health') {
        res.statusCode = 200
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          workers: workers ? 'running' : 'not_started',
          shutting_down: isShuttingDown
        }))
      } else if (req.url === '/metrics') {
        handleMetricsRequest(res)
      } else {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Not found' }))
      }
    })

    const port = process.env.WORKER_HEALTH_PORT || 3003
    healthServer.listen(port, () => {
      console.log(`🏥 Health check server running on port ${port}`)
      console.log(`   - Health: http://localhost:${port}/health`)
      console.log(`   - Metrics: http://localhost:${port}/metrics`)
      resolve()
    })
  })
}

async function handleMetricsRequest(res) {
  try {
    const { getAllQueueStats } = await import('../lib/queue/queues.js')
    const stats = await getAllQueueStats()

    res.statusCode = 200
    res.end(JSON.stringify({
      timestamp: new Date().toISOString(),
      queues: stats,
      redis_connected: true,
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      }
    }))
  } catch (error) {
    res.statusCode = 500
    res.end(JSON.stringify({
      error: 'Failed to get metrics',
      details: error.message
    }))
  }
}

async function startWorkers() {
  try {
    console.log('🚀 Starting BullMQ workers in production mode...')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('Redis URL:', process.env.REDIS_URL ? 'Configured' : 'Not configured')
    console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Configured' : 'Not configured')

    // Validate required environment variables
    const requiredEnvVars = [
      'REDIS_URL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'PLAID_CLIENT_ID',
      'PLAID_SECRET'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }

    // Test Redis connection first
    console.log('🔍 Testing Redis connection...')
    const { testRedisConnection } = await import('../lib/queue/redis.js')
    const redisStatus = await testRedisConnection()

    if (!redisStatus.connected) {
      throw new Error(`Redis connection failed: ${redisStatus.error}`)
    }

    console.log(`✅ Redis connected (${redisStatus.type})`)

    // Start health check server
    await startHealthServer()

    // Import and start workers
    const { startAllWorkers } = await import('../lib/queue/workers.js')
    workers = await startAllWorkers()

    console.log('✅ All workers started successfully')
    console.log('💡 Workers are now processing jobs from the queue')
    console.log('🛑 Send SIGTERM or SIGINT to stop workers gracefully')

    // Monitor and report statistics
    const statsInterval = setInterval(async () => {
      try {
        const { getAllQueueStats } = await import('../lib/queue/queues.js')
        const stats = await getAllQueueStats()

        console.log('\n📊 Queue Statistics:')
        stats.forEach(stat => {
          const total = stat.waiting + stat.active + stat.completed + stat.failed
          if (total > 0) {
            console.log(`  ${stat.name}: ${stat.waiting} waiting, ${stat.active} active, ${stat.completed} completed, ${stat.failed} failed`)
          }
        })

        // Alert on high failure rates
        stats.forEach(stat => {
          if (stat.failed > 10) {
            console.warn(`⚠️  High failure rate in ${stat.name}: ${stat.failed} failed jobs`)
          }
        })

      } catch (error) {
        console.error('❌ Error getting queue stats:', error)
      }
    }, 60000) // Every minute

    // Memory monitoring
    const memoryInterval = setInterval(() => {
      const memUsage = process.memoryUsage()
      const memMB = Math.round(memUsage.rss / 1024 / 1024)

      if (memMB > 500) { // Alert if memory usage exceeds 500MB
        console.warn(`⚠️  High memory usage: ${memMB}MB`)
      }
    }, 300000) // Every 5 minutes

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) {
        console.log('🔄 Shutdown already in progress...')
        return
      }

      isShuttingDown = true
      console.log(`\n🔄 Received ${signal}, gracefully shutting down...`)

      // Clear intervals
      clearInterval(statsInterval)
      clearInterval(memoryInterval)

      try {
        // Stop accepting new jobs and finish current ones
        console.log('🛑 Stopping workers...')
        const { stopAllWorkers } = await import('../lib/queue/workers.js')
        await stopAllWorkers()

        // Close Redis connections
        console.log('📡 Closing Redis connections...')
        const { closeRedisConnection } = await import('../lib/queue/redis.js')
        await closeRedisConnection()

        // Close health server
        if (healthServer) {
          healthServer.close()
        }

        console.log('✅ Graceful shutdown completed')
        process.exit(0)

      } catch (error) {
        console.error('❌ Error during shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    // Handle uncaught exceptions in production
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error)
      if (!isShuttingDown) {
        gracefulShutdown('UNCAUGHT_EXCEPTION')
      }
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
      if (!isShuttingDown) {
        gracefulShutdown('UNHANDLED_REJECTION')
      }
    })

  } catch (error) {
    console.error('❌ Failed to start workers:', error)
    process.exit(1)
  }
}

// Start everything
startWorkers()