# Role-Based Access Control (RBAC) Implementation

## Overview
This document describes the complete Role-Based Access Control system implemented in the My Budget Planner application. The system supports four tiers: Free Trial, Basic, Premium, and Admin.

## Subscription Tiers & Permissions

### Free Trial
- **AI Features**: 3 insights, 5 bill parsing, 3 income detection, 1 debt strategy per month
- **Data Limits**: 500 transactions, 2 accounts, 10 bills, 3 goals
- **Features**: Limited access to core functionality
- **Exports**: Not available
- **Support**: Community support only

### Basic ($9.99/month)
- **AI Features**: 20 insights, 20 bill parsing, 10 income detection, 5 debt strategies per month
- **Data Limits**: 5,000 transactions, 10 accounts, 50 bills, 10 goals
- **Features**: Full analytics, custom categories, recurring transaction detection
- **Exports**: CSV and Excel exports
- **Support**: Email support

### Premium ($29.99/month)
- **AI Features**: Unlimited with priority processing
- **Data Limits**: Unlimited everything
- **Features**: All features including team collaboration, API access, dashboard customization
- **Exports**: All formats with automated reports
- **Support**: Priority support with live chat

### Admin (Special Role)
- **Access**: Full system access including user management
- **Features**: Admin dashboard, usage statistics, system configuration
- **Special**: Can override limits, manage subscriptions, view all data

## Implementation Details

### 1. Core Files

#### `/lib/auth/rbac.ts`
- Defines role permissions and limits
- `RBACService` class for permission checking
- `mapSubscriptionToRole()` function for role assignment
- `useRBAC()` hook for React components

#### `/lib/auth/middleware.ts`
- `withAuth()` middleware for API route protection
- Rate limiting based on subscription tier
- Usage tracking and statistics
- Redis integration for caching

#### `/hooks/useRolePermissions.ts`
- React hook for client-side permission checking
- Usage tracking and limit monitoring
- Upgrade prompts and notifications
- Real-time usage statistics

### 2. Database Schema Updates

```sql
-- Users table additions
ALTER TABLE public.users ADD COLUMN is_admin boolean DEFAULT false;

-- App settings table for configuration
CREATE TABLE public.app_settings (
    id uuid PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value jsonb
);
```

### 3. Environment Configuration

Add to `.env.local`:
```env
# Admin Configuration
ADMIN_EMAILS=admin@example.com,superadmin@company.com
ADMIN_DOMAINS=company.com,admin.org
```

### 4. API Protection

#### Protected Route Example
```typescript
// app/api/protected/route.ts
import { withAuth } from '@/lib/auth/middleware'

export const GET = withAuth(
  async (req) => {
    // Access user info and RBAC
    const { user } = req
    const canAccess = user.rbac.canAccess('resource', 'action')
    
    // Your logic here
    return Response.json({ data: 'protected' })
  },
  { 
    requiredRole: 'basic',  // Minimum role required
    resource: 'bills',       // Resource being accessed
    action: 'read',          // Action being performed
    rateLimit: true          // Apply rate limiting
  }
)
```

### 5. Client-Side Usage

#### Component Example
```tsx
import { useRolePermissions } from '@/hooks/useRolePermissions'

export function MyComponent() {
  const { 
    role, 
    hasFeature, 
    getFeatureUsage,
    trackUsage,
    showUpgradePrompt 
  } = useRolePermissions()

  const handleAIRequest = async () => {
    // Check if user can use feature
    if (!hasFeature('ai_insights')) {
      showUpgradePrompt('AI Insights')
      return
    }

    // Track usage
    const allowed = await trackUsage('ai_insights')
    if (!allowed) {
      return // Limit reached
    }

    // Proceed with AI request
    // ...
  }

  // Get usage statistics
  const usage = getFeatureUsage('ai_insights')
  
  return (
    <div>
      <p>Role: {role}</p>
      <p>AI Insights: {usage.used}/{usage.limit}</p>
      {usage.isExhausted && (
        <p>Limit reached - please upgrade</p>
      )}
    </div>
  )
}
```

### 6. Admin Panel

Access at `/admin` (requires admin role)

Features:
- User management and subscription control
- System statistics and AI usage monitoring
- Cache management
- Usage reset capabilities

### 7. Middleware Protection

The main `middleware.ts` file protects routes:
- `/dashboard/*` - Requires authentication
- `/admin/*` - Requires admin role
- Redirects based on subscription status

### 8. Rate Limiting

Automatic rate limiting per tier:
- **Free Trial**: 10 requests/minute
- **Basic**: 30 requests/minute  
- **Premium**: 100 requests/minute
- **Admin**: Unlimited

### 9. Usage Tracking

All feature usage is tracked in Redis:
- Monthly reset
- Real-time monitoring
- Automatic limit enforcement
- Usage statistics API

### 10. Upgrade Flow

1. User hits limit
2. System shows upgrade prompt
3. User clicks upgrade
4. Redirected to pricing page
5. Stripe handles payment
6. Subscription tier updated
7. New permissions active immediately

## Testing

### Set Admin User
```sql
UPDATE public.users 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### Reset Usage Stats
```typescript
// Via API
await fetch('/api/admin/users/USER_ID/reset-usage', {
  method: 'POST'
})
```

### Test Different Roles
1. Create test accounts for each tier
2. Set subscription_tier in database
3. Test feature limits and access
4. Verify upgrade prompts

## Security Considerations

1. **Server-side validation**: Always validate permissions on the server
2. **Role hierarchy**: Enforced through middleware
3. **Rate limiting**: Prevents abuse
4. **Admin isolation**: Separate checks for admin access
5. **Audit logging**: Track admin actions (implement as needed)

## Monitoring

Monitor these metrics:
- Feature usage by tier
- Rate limit hits
- Upgrade conversion rate
- Admin actions
- System performance

## Future Enhancements

1. **Team roles**: Add team member permissions
2. **Custom limits**: Per-user limit overrides
3. **Usage alerts**: Email notifications at 80% usage
4. **Bulk operations**: Admin bulk user management
5. **Audit logs**: Complete admin action logging
6. **API keys**: Generate API keys for premium users
7. **Webhooks**: Usage limit webhooks
8. **Analytics**: Detailed usage analytics dashboard

## Troubleshooting

### User can't access feature
1. Check subscription_tier in database
2. Verify Redis is running
3. Check usage stats in Redis
4. Review browser console for errors

### Admin panel not accessible
1. Verify is_admin = true in database
2. Check ADMIN_EMAILS environment variable
3. Clear browser cache and cookies
4. Check middleware logs

### Usage limits not working
1. Verify Redis connection
2. Check usage tracking in API routes
3. Review Redis keys with pattern `usage:*`
4. Test with manual Redis commands

## Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Check error logs
4. Contact development team