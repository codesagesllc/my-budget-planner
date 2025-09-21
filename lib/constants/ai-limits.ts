// AI subscription tier limits - shared between client and server
export const AI_LIMITS = {
  free_trial: {
    monthly_insights: 3,
    bill_parsing: 5,
    income_detection: 3,
    debt_strategies: 1,
    description: 'Limited AI features',
  },
  basic: {
    monthly_insights: 20,
    bill_parsing: 20,
    income_detection: 10,
    debt_strategies: 5,
    description: 'Standard AI features',
  },
  premium: {
    monthly_insights: -1, // Unlimited
    bill_parsing: -1,     // Unlimited
    income_detection: -1, // Unlimited
    debt_strategies: -1,  // Unlimited
    description: 'Unlimited AI features',
  },
  admin: {
    monthly_insights: -1, // Unlimited
    bill_parsing: -1,     // Unlimited
    income_detection: -1, // Unlimited
    debt_strategies: -1,  // Unlimited
    description: 'Unlimited AI features with admin access',
  },
} as const

export type AILimitsTier = keyof typeof AI_LIMITS