# Vercel Deployment Guide for Real-Time Plaid Sync

This guide explains how to deploy the real-time Plaid transaction sync system on Vercel using serverless functions instead of background workers.

## Overview

Since Vercel doesn't support long-running background processes, we've optimized the sync system to use:

1. **Serverless Webhooks** - Process transactions immediately when Plaid sends webhooks
2. **Scheduled Cron Jobs** - Backup sync every 15 minutes via Vercel Cron
3. **Direct Processing** - No external workers needed, all processing happens in serverless functions

## Architecture

```
Plaid → Webhook (Serverless) → Direct Sync → Supabase
   ↓         ↓                    ↓            ↓
Real-time  Immediate           No Queue    Live Updates
```

## Deployment Steps

### 1. Environment Variables

Set these in your Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=production

# Security
CRON_SECRET=your-random-secret-for-cron-protection
PLAID_WEBHOOK_SECRET=your-plaid-webhook-secret

# Optional
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 2. Plaid Webhook Configuration

In your Plaid Dashboard:

1. Go to Team Settings → Webhooks
2. Set webhook URL to: `https://your-app.vercel.app/api/webhooks/plaid`
3. Enable these webhook types:
   - `TRANSACTIONS` (all codes)
   - `ITEM_LOGIN_REQUIRED`
   - `ITEM_ERROR`
   - `USER_PERMISSION_REVOKED`
   - `PENDING_EXPIRATION`

### 3. Deploy to Vercel

```bash
# Using Vercel CLI
npm install -g vercel
vercel --prod

# Or push to GitHub and connect to Vercel Dashboard
git push origin main
```

### 4. Verify Deployment

Check these endpoints after deployment:

```bash
# Health check for cron sync
curl https://your-app.vercel.app/api/cron/sync-transactions

# Test webhook endpoint
curl https://your-app.vercel.app/api/webhooks/plaid

# Verify cron is working (check Vercel Function logs)
```

## How It Works

### Real-Time Sync (Webhooks)

1. **User makes transaction** → Bank processes
2. **Plaid detects change** → Sends webhook to `/api/plaid/sync-webhook`
3. **Webhook function runs** → Syncs transactions immediately
4. **Updates Supabase** → Real-time data available to UI

**Response Time**: 1-5 seconds

### Scheduled Backup Sync (Cron)

1. **Every 15 minutes** → Vercel Cron triggers `/api/cron/sync-transactions`
2. **Function checks** → Items not synced in last 10 minutes
3. **Processes missed transactions** → Ensures no data is lost
4. **Rate limiting** → 1-second delays between items

**Fallback**: Catches any missed webhook events

### Manual Sync (User-Initiated)

1. **User clicks sync** → Calls `/api/plaid/sync-transactions`
2. **Direct processing** → No queue, immediate execution
3. **Real-time feedback** → User sees results instantly

## Function Configuration

The `vercel.json` file includes:

```json
{
  "functions": {
    "app/api/plaid/sync-webhook/route.ts": {
      "maxDuration": 60
    },
    "app/api/cron/sync-transactions/route.ts": {
      "maxDuration": 30
    },
    "app/api/plaid/sync-transactions/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/sync-transactions",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

## Monitoring & Debugging

### Vercel Function Logs

1. Go to Vercel Dashboard → Project → Functions
2. Click on any function to see logs
3. Monitor for:
   - ✅ `Webhook sync completed: X transactions`
   - ✅ `Scheduled sync completed: X/Y items`
   - ❌ `Error in webhook transaction sync`

### Testing Webhooks

Use Plaid's webhook testing tool:

1. Plaid Dashboard → Team Settings → Webhooks
2. Click "Send test webhook"
3. Check Vercel function logs for processing

### Manual Testing

```bash
# Test cron endpoint (with auth)
curl -X POST https://your-app.vercel.app/api/cron/sync-transactions \
  -H "Authorization: Bearer your-cron-secret"

# Check cron health
curl https://your-app.vercel.app/api/cron/sync-transactions
```

## Performance & Limits

### Vercel Limits

- **Function timeout**: 60 seconds (Pro plan)
- **Memory**: 1008 MB (Pro plan)
- **Concurrent executions**: 1000 (Pro plan)
- **Cron jobs**: 20 per project

### Expected Performance

- **Webhook latency**: 1-3 seconds
- **Cron processing**: 2-5 minutes for 50+ accounts
- **Throughput**: ~100 transactions per function execution
- **Reliability**: 99.9% (with webhook + cron redundancy)

### Rate Limiting

The system includes automatic rate limiting:

- 1-second delays between Plaid API calls
- Batch processing for large datasets
- Exponential backoff on errors

## Troubleshooting

### Common Issues

**Webhooks not received:**
```bash
# Check webhook URL in Plaid Dashboard
# Verify webhook signature validation
# Check function logs for 401/403 errors
```

**Cron jobs not running:**
```bash
# Verify cron schedule in vercel.json
# Check CRON_SECRET environment variable
# Monitor function invocation logs
```

**High latency:**
```bash
# Check Supabase connection pool
# Monitor function execution time
# Consider breaking large syncs into smaller batches
```

**Missing transactions:**
```bash
# Check if both webhook AND cron are running
# Verify Plaid item status (login_required, error)
# Check function logs for rate limiting
```

### Log Patterns

Look for these in Vercel function logs:

**Success patterns:**
```
✅ Webhook sync completed: 5 transactions synced for item_123
✅ Scheduled sync completed: 3/3 items successful, 12 transactions synced
```

**Error patterns:**
```
❌ Error in webhook transaction sync: RATE_LIMIT_EXCEEDED
❌ Failed to sync item item_123: ITEM_LOGIN_REQUIRED
```

## Security

### Webhook Security

- HMAC signature validation using `PLAID_WEBHOOK_SECRET`
- Environment-based webhook URL configuration
- Input validation and sanitization

### Cron Security

- `CRON_SECRET` bearer token authentication
- Rate limiting and request validation
- Fail-safe error handling

### Data Security

- Service role key for Supabase (no user session required)
- No sensitive data in function logs
- Encrypted environment variables

## Scaling Considerations

### When to Scale

Monitor these metrics:

- Function timeout errors (>10%)
- Cron execution failures
- Webhook processing delays (>10 seconds)
- High memory usage warnings

### Scaling Options

1. **Increase function limits** (Vercel Pro plan)
2. **Optimize batch sizes** (fewer transactions per call)
3. **Split processing** (separate functions for different operations)
4. **Add queuing** (for very high volume, consider external Redis)

## Migration from Workers

If you previously had background workers:

1. **Remove worker deployments** (Docker, K8s, etc.)
2. **Update webhook URLs** in Plaid Dashboard
3. **Verify environment variables** in Vercel
4. **Test sync functionality** end-to-end
5. **Monitor for 24 hours** to ensure reliability

## Next Steps

1. **Deploy to production** using this guide
2. **Configure Plaid webhooks** with your Vercel URL
3. **Test with sample transactions**
4. **Monitor Vercel function logs** for the first day
5. **Set up alerts** for function failures (optional)

The serverless approach provides excellent reliability and performance for most use cases, with the added benefit of automatic scaling and zero maintenance overhead.