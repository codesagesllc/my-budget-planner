# Background Jobs & Real-Time Plaid Sync

This document explains the background job system that handles real-time synchronization of Plaid transactions to the Supabase transactions table.

## Overview

The system uses **BullMQ** with **Redis** to process background jobs that sync Plaid transactions in real-time. This ensures that user transactions are always up-to-date without requiring manual sync actions.

## Architecture

```
Plaid Webhooks → Queue Jobs → Workers → Supabase Transactions Table
     ↓              ↓           ↓              ↓
Webhook Handler → BullMQ → Background Workers → Real-time Updates
```

## Components

### 1. Webhook Handler (`/api/webhooks/plaid/route.ts`)
- Receives webhooks from Plaid when new transactions are available
- Validates webhook signatures for security
- Queues transaction sync jobs with high priority
- Handles different webhook types (transactions, errors, login required, etc.)

### 2. Scheduled Sync (`/api/cron/sync-transactions/route.ts`)
- Runs every 15 minutes via Vercel Cron
- Queues sync jobs for all active Plaid items that haven't synced recently
- Uses staggered delays to avoid API rate limits
- Provides health check endpoint for monitoring

### 3. Queue System (`/lib/queue/`)
- **Queues**: Manages different job types (transaction sync, webhooks, notifications)
- **Workers**: Processes jobs in the background with retry logic
- **Redis**: Stores job data and state

### 4. Background Workers (`/lib/queue/workers.ts`)
- **Transaction Sync Worker**: Processes Plaid transaction sync jobs
- **Webhook Processing Worker**: Handles webhook events asynchronously
- Includes bill matching, duplicate detection, and error handling

## Real-Time Sync Flow

### Webhook-Triggered Sync (Real-time)
1. User makes a transaction
2. Plaid sends webhook to `/api/webhooks/plaid`
3. Webhook handler validates and queues sync job
4. Worker processes job immediately (high priority)
5. New transactions appear in Supabase within seconds

### Scheduled Sync (Backup)
1. Cron job runs every 15 minutes
2. Finds Plaid items that haven't synced recently
3. Queues sync jobs with medium priority
4. Ensures no transactions are missed

### Manual Sync (User-initiated)
1. User clicks sync in UI
2. Calls `/api/plaid/sync-transactions`
3. Direct sync or queue job based on configuration
4. Immediate feedback to user

## Deployment

### Development
```bash
# Start Redis locally
docker run -d -p 6379:6379 redis:alpine

# Start workers in development
npm run workers:dev

# Start Next.js app
npm run dev
```

### Production (Docker Compose)
```bash
# Start workers and Redis
docker-compose -f docker-compose.workers.yml up -d

# Check logs
docker-compose -f docker-compose.workers.yml logs -f
```

### Production (Kubernetes)
```bash
# Deploy workers
kubectl apply -f k8s/workers-deployment.yaml

# Check status
kubectl get pods -l app=budget-planner-workers
kubectl logs -l app=budget-planner-workers
```

### Production (Manual)
```bash
# Start workers with production config
npm run workers:prod
```

## Configuration

### Environment Variables
```bash
# Required
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=production

# Optional
WORKER_HEALTH_PORT=3003
CRON_SECRET=your-secret-for-cron-auth
PLAID_WEBHOOK_SECRET=your-plaid-webhook-secret
```

### Cron Configuration (vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-transactions",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

## Monitoring & Health Checks

### Health Endpoints
- **Workers**: `GET /health` on port 3003
- **Scheduled Sync**: `GET /api/cron/sync-transactions`
- **Queue Status**: `GET /api/queue/status`

### Monitoring Commands
```bash
# Check queue statistics
npm run queue:status

# Test Redis connection
npm run queue:test

# View worker health (if running)
curl http://localhost:3003/health
curl http://localhost:3003/metrics
```

### Logs to Monitor
- ✅ `Transaction sync job completed`
- ❌ `Transaction sync job failed`
- 📋 `Queued transaction sync job`
- 🔄 `Processing transaction sync job`
- ⚠️ `High failure rate in queue`

## Error Handling

### Automatic Retries
- Jobs retry 3 times with exponential backoff
- Failed jobs are kept for debugging (last 50)
- Completed jobs are cleaned up (keep last 10)

### Error Types & Resolution
1. **Plaid API Errors**
   - `ITEM_LOGIN_REQUIRED`: User needs to re-authenticate
   - `RATE_LIMIT_EXCEEDED`: Automatic retry with backoff
   - `INVALID_ACCESS_TOKEN`: Mark item as error state

2. **Database Errors**
   - Duplicate transactions: Filtered out automatically
   - Connection issues: Automatic retry
   - Constraint violations: Log and skip

3. **Worker Errors**
   - Out of memory: Restart worker
   - Redis connection: Automatic reconnection
   - Uncaught exceptions: Graceful shutdown

## Bill Matching

The sync process automatically matches transactions with existing bills:

1. **Amount Matching**: Within 10% tolerance
2. **Name Matching**: Merchant name or description contains bill name
3. **Category Matching**: Transaction category matches bill category
4. **Auto-Tagging**: Matched transactions marked as bill payments

## Performance & Scaling

### Current Limits
- **Concurrency**: 5 sync jobs, 10 webhook jobs
- **Rate Limiting**: 10 jobs per minute per queue
- **Memory**: ~256MB per worker
- **Throughput**: ~100 transactions per minute

### Scaling Options
1. **Horizontal**: Add more worker replicas
2. **Vertical**: Increase worker memory/CPU
3. **Queue Partitioning**: Separate queues by user or institution
4. **Database**: Connection pooling and read replicas

## Troubleshooting

### Common Issues

**Jobs stuck in waiting:**
```bash
# Check Redis connection
redis-cli ping

# Restart workers
npm run workers:prod
```

**High memory usage:**
```bash
# Check queue sizes
curl localhost:3003/metrics

# Clear completed jobs
# (automatically handled by cleanup)
```

**Missing transactions:**
```bash
# Trigger manual sync
curl -X POST localhost:3000/api/cron/sync-transactions \
  -H "Authorization: Bearer your-cron-secret"

# Check webhook logs
tail -f logs/webhook.log
```

**Webhook delivery issues:**
```bash
# Verify webhook URL in Plaid Dashboard
# Check webhook signature validation
# Review firewall/security group settings
```

## Security

### Webhook Security
- HMAC signature validation using `PLAID_WEBHOOK_SECRET`
- Cron endpoint protection with `CRON_SECRET`
- Environment-based access controls

### Data Security
- Service role key for Supabase (not user tokens)
- Encrypted Redis connections in production
- No sensitive data in job payloads (references only)

### Network Security
- Workers run in private networks
- Health checks on internal ports only
- Rate limiting on external APIs

## Future Enhancements

1. **Real-time Notifications**: Push notifications when transactions are synced
2. **Advanced Matching**: ML-based transaction categorization
3. **Batch Processing**: Group small transactions for efficiency
4. **Analytics**: Job performance metrics and dashboards
5. **Multi-tenant**: User-specific job prioritization
6. **Event Sourcing**: Transaction change history tracking