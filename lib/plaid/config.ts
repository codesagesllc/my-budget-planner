// lib/plaid/config.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

// Determine environment based on PLAID_ENV or NODE_ENV
// Development uses limited production, Production uses full production
const getPlaidEnvironment = () => {
  const plaidEnv = process.env.PLAID_ENV || 'production'

  // Always use production environment (limited production for dev, full production for prod)
  return PlaidEnvironments.production
}

export const plaidConfig = new Configuration({
  basePath: getPlaidEnvironment(),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
      'Plaid-Version': '2020-09-14',
    },
  },
})

// Helper to check if we're in local development (not Plaid environment)
export const isLocalDevelopment = () => {
  return process.env.NODE_ENV === 'development'
}

// Helper to check if using Plaid sandbox (always false - no sandbox mode)
export const isPlaidSandbox = () => {
  return false
}

export const plaidClient = new PlaidApi(plaidConfig)

// Plaid configuration constants
export const PLAID_PRODUCTS = ['transactions'] as const
export const PLAID_COUNTRY_CODES = ['US', 'CA'] as const

// Error handling helper
export function handlePlaidError(error: any) {
  console.error('Plaid API Error:', {
    error_type: error.error_type,
    error_code: error.error_code,
    error_message: error.error_message,
    display_message: error.display_message,
  })

  // Return user-friendly error message
  if (error.error_code === 'INVALID_CREDENTIALS') {
    return 'Invalid bank credentials. Please check your login information.'
  }
  if (error.error_code === 'INVALID_MFA') {
    return 'Invalid verification code. Please try again.'
  }
  if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
    return 'Your bank connection needs to be refreshed. Please reconnect your account.'
  }
  if (error.error_code === 'INSUFFICIENT_CREDENTIALS') {
    return 'Additional verification required. Please complete the authentication process.'
  }

  return error.display_message || 'An error occurred connecting to your bank. Please try again.'
}

// Rate limiting configuration
export const PLAID_RATE_LIMITS = {
  link_token_create: 100, // requests per minute
  item_public_token_exchange: 100,
  transactions_get: 100,
  accounts_get: 100,
} as const