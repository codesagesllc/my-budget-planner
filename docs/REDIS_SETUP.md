# Redis Setup Guide for My Budget Planner

## Overview
Redis is **optional** but recommended for caching AI responses and rate limiting. The application will work without Redis using an in-memory cache fallback.

## Benefits of Using Redis
- **50% reduction in AI costs** through response caching
- **Persistent rate limiting** across server restarts
- **Shared cache** across multiple server instances
- **Better performance** for high-traffic scenarios

## Without Redis (Default)
The application automatically falls back to an in-memory cache when Redis is not available. This means:
- ✅ Application works normally
- ✅ AI features function correctly
- ⚠️ Cache is lost on server restart
- ⚠️ Rate limits reset on restart
- ⚠️ No cache sharing between instances

## Setting Up Redis (Optional)

### Option 1: Local Development (Windows)
```bash
# Using Docker (Recommended)
docker run -d -p 6379:6379 --name redis redis:alpine

# Using WSL2
wsl --install
# Inside WSL:
sudo apt update
sudo apt install redis-server
redis-server
```

### Option 2: Local Development (Mac)
```bash
# Using Homebrew
brew install redis
brew services start redis

# Using Docker
docker run -d -p 6379:6379 --name redis redis:alpine
```

### Option 3: Cloud Redis Services (Production)

#### Upstash (Recommended - Free tier available)
1. Sign up at https://upstash.com
2. Create a Redis database
3. Copy the connection string
4. Add to `.env.local`:
```env
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
```

#### Redis Cloud (Free 30MB)
1. Sign up at https://redis.com/try-free/
2. Create a database
3. Copy connection details
4. Add to `.env.local`:
```env
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.redis.com:16379
```

#### Vercel KV (For Vercel deployments)
1. In Vercel dashboard, go to Storage
2. Create a KV database
3. Connect to your project
4. Vercel automatically sets the environment variables

## Environment Configuration

### Development (`.env.local`)
```env
# Optional - If not set, uses in-memory cache
REDIS_URL=redis://localhost:6379
```

### Production
```env
# Use your cloud Redis URL
REDIS_URL=redis://default:password@your-redis-host.com:6379
```

## Verify Redis Connection

### Check Application Logs
When Redis is connected:
```
Redis Client Connected
```

When using fallback:
```
Using in-memory cache (Redis not available)
```

### Test Caching
1. Generate AI insights for a user
2. Generate the same insights again
3. Second request should be instant (cached)

## Monitoring Cache Performance

The application shows cache statistics in the AI Usage Stats component:
- Cache hit rate (target: >50%)
- Response times (cached vs fresh)
- Usage limits per tier

## Troubleshooting

### Connection Refused Error
```
Redis Client Error: Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: This is normal if Redis isn't running. The app will use in-memory cache.

### To Disable Redis Completely
Set in `.env.local`:
```env
NODE_ENV=development
# Don't set REDIS_URL
```

### To Force Redis Connection
Set in `.env.local`:
```env
NODE_ENV=production
REDIS_URL=redis://localhost:6379
```

## Cache Management Commands

### Clear All AI Caches (Admin)
```javascript
// In your admin panel or API
import { cacheInvalidation } from '@/lib/redis'
await cacheInvalidation.clearAllAICaches()
```

### Clear User Cache
```javascript
import { cacheInvalidation } from '@/lib/redis'
await cacheInvalidation.invalidateUserCache(userId)
```

## Performance Impact

### With Redis:
- First AI request: 2-3 seconds
- Cached requests: <100ms
- Cache valid for: 24 hours

### Without Redis (In-Memory):
- First AI request: 2-3 seconds
- Cached requests: <100ms
- Cache lost on: Server restart

## Conclusion

Redis is optional but recommended for production deployments. The application works perfectly fine without it, using an in-memory cache as a fallback. For development, you can skip Redis setup entirely and the app will work normally.
