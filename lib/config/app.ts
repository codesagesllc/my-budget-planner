// App configuration for different environments

const getAppUrl = () => {
  // Production URLs
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  // Vercel deployment URL (automatically set by Vercel)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  
  // Development
  return 'http://localhost:3000'
}

export const appConfig = {
  // Main app URL (will use custom domain when you set NEXT_PUBLIC_APP_URL)
  url: getAppUrl(),
  
  // Your domains
  domains: {
    production: 'https://my-budget-planner-seven.vercel.app', // Your Vercel domain
    custom: process.env.NEXT_PUBLIC_CUSTOM_DOMAIN || '', // Future custom domain
    development: 'http://localhost:3000'
  },
  
  // Get the appropriate redirect URL for auth callbacks
  getAuthRedirectUrl: (path: string = '/auth/callback') => {
    const baseUrl = getAppUrl()
    return `${baseUrl}${path}`
  },
  
  // Check if we're in production
  isProduction: process.env.NODE_ENV === 'production',
  
  // Check if we're on Vercel
  isVercel: !!process.env.VERCEL,
}

// Helper to get the absolute URL for any path
export const getAbsoluteUrl = (path: string = '') => {
  const baseUrl = appConfig.url
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
