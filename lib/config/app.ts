// App configuration
export const appConfig = {
  // Allowed domains for OAuth redirects
  allowedDomains: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'https://my-budget-planner-seven.vercel.app',
    'https://www.pocketwiseai.com',
    'https://pocketwiseai.com'
  ],

  // Get the correct redirect URL based on environment
  getAuthRedirectUrl: (path: string = '/auth/callback') => {
    if (typeof window !== 'undefined') {
      // Client-side - use current origin only if in production
      if (process.env.NODE_ENV === 'production') {
        return `${window.location.origin}${path}`
      }
      // In development, always use localhost even on client-side
      return `http://localhost:3000${path}`
    }

    // Server-side: Always use localhost in development
    if (process.env.NODE_ENV === 'development') {
      return `http://localhost:3000${path}`
    }

    // Check if running on Vercel
    if (process.env.VERCEL_URL) {
      // Running on Vercel
      return `https://${process.env.VERCEL_URL}${path}`
    }

    // Production with custom domain
    return `https://www.pocketwiseai.com${path}`
  },

  // Validate if a domain is allowed for OAuth redirects
  isAllowedDomain: (domain: string): boolean => {
    return appConfig.allowedDomains.includes(domain) ||
           domain.startsWith('http://localhost:') ||
           domain.includes('vercel.app')
  },
  
  // Stripe configuration
  stripe: {
    publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },
  
  // Plaid configuration
  plaid: {
    publicKey: process.env.NEXT_PUBLIC_PLAID_PUBLIC_KEY || '',
    environment: process.env.NEXT_PUBLIC_PLAID_ENV || 'sandbox',
  },
  
  // App metadata
  app: {
    name: 'PocketWiseAI',
    description: 'AI-Powered Personal Finance Management',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://pocketwise-ai.vercel.app',
  }
}
