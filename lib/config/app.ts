// App configuration
export const appConfig = {
  // Get the correct redirect URL based on environment
  getAuthRedirectUrl: (path: string = '/auth/callback') => {
    if (typeof window !== 'undefined') {
      // Client-side
      return `${window.location.origin}${path}`
    }
    
    // Server-side
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000'
    
    return `${baseUrl}${path}`
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
    name: 'My Budget Planner',
    description: 'AI-Powered Personal Finance Management',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://my-budget-planner.vercel.app',
  }
}
