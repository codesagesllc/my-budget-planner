# BullMQ & Redis Setup Guide

This project uses **BullMQ** with **Redis** for background job processing, particularly for transaction syncing from Plaid webhooks.

## 🏗️ Architecture

- **Production**: BullMQ + Redis for scalable background processing
- **Local Development**: In-memory fallback when Redis is not available
- **Hybrid**: Automatically detects Redis availability and switches modes

## 🔧 Environment Variables

Add these to your `.env.local`:

```bash
# Redis Configuration (for production/testing)
REDIS_URL=redis://localhost:6379
# OR for Upstash/cloud Redis:
# UPSTASH_REDIS_REST_URL=your-upstash-redis-url

# Cron job security (already configured)
CRON_SECRET=your-secret-key

# Plaid webhook secret (already configured)
PLAID_WEBHOOK_SECRET=your-plaid-webhook-secret
```

## 🚀 Development Setup

### Option 1: Local Redis (Recommended for testing BullMQ)

1. **Install Redis locally:**
   ```bash
   # Windows (using Chocolatey)
   choco install redis-64

   # macOS (using Homebrew)
   brew install redis

   # Linux (Ubuntu/Debian)
   sudo apt-get install redis-server
   ```

2. **Start Redis:**
   ```bash
   redis-server
   ```

3. **Set environment variable:**
   ```bash
   # In .env.local
   REDIS_URL=redis://localhost:6379
   ```

### Option 2: Cloud Redis (Upstash - Pay as you go)

1. **Create Upstash Redis instance** (you already have this)
2. **Get connection URL** from Upstash dashboard
3. **Set environment variable:**
   ```bash
   # In .env.local
   UPSTASH_REDIS_REST_URL=your-upstash-connection-url
   ```

### Option 3: In-Memory Fallback (Default)

- **No setup required** - works automatically when no Redis URL is configured
- **Good for**: Basic development when you don't need to test queue functionality
- **Limitations**: Jobs run immediately, no persistence, no scaling

## 🎮 Testing & Usage

### Start the Application
```bash
# Start Next.js app
npm run dev

# In a separate terminal, start workers (when using Redis)
npm run workers:dev
```

### Test Redis Connection
```bash
# Check queue status
npm run queue:status

# Test Redis operations
npm run queue:test
```

### Test via API
```bash
# Check queue status
curl http://localhost:3000/api/queue/status

# Test Redis directly
curl -X POST -H "Content-Type: application/json" \
  -d '{"action":"test-redis"}' \
  http://localhost:3000/api/queue/test

# Test transaction sync job
curl -X POST -H "Content-Type: application/json" \
  -d '{"action":"test-sync-job"}' \
  http://localhost:3000/api/queue/test
```

## 🔄 How Transaction Sync Works

### With Redis (Production/Testing):
1. **Webhook received** → Creates BullMQ job
2. **Worker processes job** → Syncs transactions with bill matching
3. **Real-time updates** → UI updates via Supabase realtime

### Without Redis (Local Dev):
1. **Webhook received** → Processes immediately
2. **Direct sync** → Same logic, no queue
3. **Real-time updates** → UI updates via Supabase realtime

## 📊 Monitoring

### Queue Dashboard (Development)
- **Status**: `GET /api/queue/status`
- **Test Jobs**: `POST /api/queue/test`

### Worker Logs
```bash
# When running workers
npm run workers:dev

# Look for:
✅ Redis connected (external/in-memory)
✅ All workers started
📋 Added transaction sync job
✅ Transaction sync job completed
```

### Queue Statistics
The worker script shows stats every 30 seconds:
```
📊 Queue Statistics:
  transaction-sync: 0 waiting, 1 active, 15 completed, 0 failed
  webhook-processing: 0 waiting, 0 active, 8 completed, 0 failed
```

## 🚚 Production Deployment

### Vercel (Current Setup)
- **API Routes**: Handle webhooks and queue management
- **Cron Jobs**: Backup sync every 3 hours (already configured)
- **External Workers**: Run workers on separate instance/container

### Worker Deployment Options

1. **Separate Vercel Function**:
   ```bash
   # Deploy workers as serverless functions
   npm run workers
   ```

2. **Docker Container**:
   ```dockerfile
   FROM node:18
   COPY . .
   RUN npm install
   CMD ["npm", "run", "workers"]
   ```

3. **Background Service**:
   ```bash
   # On your server
   npm run workers
   # Use PM2, systemd, or similar for process management
   ```

## 🛠️ Queue Types

- **`transaction-sync`**: Syncs Plaid transactions with bill matching
- **`webhook-processing`**: Processes Plaid webhooks
- **`notifications`**: Sends user notifications
- **`analytics`**: Background analytics processing

## 🔍 Troubleshooting

### Redis Connection Issues
```bash
# Check Redis status
npm run queue:status

# Expected response:
{
  "redis": {
    "connected": true,
    "type": "redis" // or "in-memory"
  }
}
```

### Worker Not Processing Jobs
1. **Check Redis connection**
2. **Ensure workers are running**: `npm run workers:dev`
3. **Check logs** for errors
4. **Verify queue stats**: Jobs should move from waiting → active → completed

### Local Development Without Redis
- **Expected behavior**: Direct processing, immediate execution
- **Logs show**: "Using direct sync (local development)"
- **No impact**: All functionality works the same

## ✅ Benefits

- **🚀 Scalable**: Queue jobs across multiple workers
- **🔄 Reliable**: Jobs retry on failure with exponential backoff
- **📊 Monitorable**: Real-time queue statistics and job tracking
- **🔧 Flexible**: Automatic fallback for local development
- **⚡ Fast**: Background processing doesn't block webhooks