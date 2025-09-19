// lib/queue/queues.ts
import { Queue, Worker, QueueEvents } from 'bullmq'
import { getRedisConnection } from './redis'

// Queue names
export const QUEUE_NAMES = {
  TRANSACTION_SYNC: 'transaction-sync',
  WEBHOOK_PROCESSING: 'webhook-processing',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
} as const

// Job types for better type safety
export interface TransactionSyncJob {
  type: 'sync-transactions'
  data: {
    plaidItemId: string
    userId: string
    accessToken: string
    cursor?: string
    priority?: number
  }
}

export interface WebhookProcessingJob {
  type: 'process-webhook'
  data: {
    webhookType: string
    webhookCode: string
    itemId: string
    userId: string
    payload: any
  }
}

export interface NotificationJob {
  type: 'send-notification'
  data: {
    userId: string
    type: 'email' | 'push' | 'in-app'
    message: string
    metadata?: any
  }
}

// Queue instances (lazy-loaded)
let queues: Record<string, Queue> = {}
let workers: Record<string, Worker> = {}
let queueEvents: Record<string, QueueEvents> = {}

// Get or create a queue
export function getQueue(queueName: keyof typeof QUEUE_NAMES): Queue {
  const name = QUEUE_NAMES[queueName]

  if (!queues[name]) {
    const redis = getRedisConnection()

    queues[name] = new Queue(name, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50,     // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })

    queues[name].on('error', (error) => {
      console.error(`Queue ${name} error:`, error)
    })

    console.log(`✅ Queue '${name}' initialized`)
  }

  return queues[name]
}

// Get or create queue events (for monitoring)
export function getQueueEvents(queueName: keyof typeof QUEUE_NAMES): QueueEvents {
  const name = QUEUE_NAMES[queueName]

  if (!queueEvents[name]) {
    const redis = getRedisConnection()

    queueEvents[name] = new QueueEvents(name, {
      connection: redis,
    })

    queueEvents[name].on('completed', ({ jobId, returnvalue }) => {
      console.log(`✅ Job ${jobId} in queue ${name} completed`)
    })

    queueEvents[name].on('failed', ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} in queue ${name} failed:`, failedReason)
    })

    queueEvents[name].on('stalled', ({ jobId }) => {
      console.warn(`⚠️ Job ${jobId} in queue ${name} stalled`)
    })

    console.log(`✅ Queue events for '${name}' initialized`)
  }

  return queueEvents[name]
}

// Add a transaction sync job
export async function addTransactionSyncJob(
  data: TransactionSyncJob['data'],
  options?: {
    delay?: number
    priority?: number
    jobId?: string
  }
) {
  const queue = getQueue('TRANSACTION_SYNC')

  const job = await queue.add(
    'sync-transactions',
    data,
    {
      delay: options?.delay,
      priority: options?.priority || data.priority || 0,
      jobId: options?.jobId,
    }
  )

  console.log(`📋 Added transaction sync job ${job.id} for user ${data.userId}`)
  return job
}

// Add a webhook processing job
export async function addWebhookProcessingJob(
  data: WebhookProcessingJob['data'],
  options?: {
    delay?: number
    priority?: number
  }
) {
  const queue = getQueue('WEBHOOK_PROCESSING')

  const job = await queue.add(
    'process-webhook',
    data,
    {
      delay: options?.delay,
      priority: options?.priority || 10, // Higher priority for webhooks
    }
  )

  console.log(`📋 Added webhook processing job ${job.id} for webhook ${data.webhookType}`)
  return job
}

// Add a notification job
export async function addNotificationJob(
  data: NotificationJob['data'],
  options?: {
    delay?: number
    priority?: number
  }
) {
  const queue = getQueue('NOTIFICATIONS')

  const job = await queue.add(
    'send-notification',
    data,
    {
      delay: options?.delay,
      priority: options?.priority || 0,
    }
  )

  console.log(`📋 Added notification job ${job.id} for user ${data.userId}`)
  return job
}

// Get queue statistics
export async function getQueueStats(queueName: keyof typeof QUEUE_NAMES) {
  const queue = getQueue(queueName)

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
    queue.getDelayed(),
  ])

  return {
    name: QUEUE_NAMES[queueName],
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total: waiting.length + active.length + completed.length + failed.length + delayed.length,
  }
}

// Get all queue statistics
export async function getAllQueueStats() {
  const stats = await Promise.all([
    getQueueStats('TRANSACTION_SYNC'),
    getQueueStats('WEBHOOK_PROCESSING'),
    getQueueStats('NOTIFICATIONS'),
  ])

  return stats
}

// Clean up resources
export async function closeAllQueues() {
  console.log('🔄 Closing all queues and workers...')

  // Close workers first
  const workerPromises = Object.values(workers).map(worker => worker.close())
  await Promise.all(workerPromises)

  // Close queue events
  const eventPromises = Object.values(queueEvents).map(events => events.close())
  await Promise.all(eventPromises)

  // Close queues
  const queuePromises = Object.values(queues).map(queue => queue.close())
  await Promise.all(queuePromises)

  // Clear references
  queues = {}
  workers = {}
  queueEvents = {}

  console.log('✅ All queues and workers closed')
}

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGTERM', closeAllQueues)
  process.on('SIGINT', closeAllQueues)
}