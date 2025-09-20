// Database types based on Supabase schema

export type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly' | 'one-time'
export type IncomeFrequency = 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time'
// TransactionType removed - using specific types in DatabaseTransaction interface
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'other'
export type AccountStatus = 'active' | 'inactive' | 'closed'
export type PlaidItemStatus = 'connected' | 'login_required' | 'error' | 'disconnected'

// Base interfaces for database tables
export interface DatabaseUser {
  id: string
  created_at: string
  email: string
  aggregator_refresh_token?: string
  subscription_tier?: string
  free_trial_started_at?: string
  free_trial_ends_at?: string
  ai_requests_count?: number
  ai_requests_reset_date?: string
  last_request_date?: string
  role?: string
}

export interface DatabaseAccount {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  plaid_account_id?: string
  plaid_item_id?: string
  official_name?: string
  subtype?: string
  mask?: string
  available_balance?: number
  status: AccountStatus
  created_at: string
  updated_at: string
}

export interface DatabaseTransaction {
  id: string
  user_id: string
  account_id: string
  description: string
  amount: number // NUMERIC(10, 2) from database
  date: string // TIMESTAMP WITH TIME ZONE
  category?: string // TEXT
  pending: boolean // BOOLEAN DEFAULT false
  plaid_transaction_id?: string // TEXT UNIQUE
  created_at: string // TIMESTAMP WITH TIME ZONE DEFAULT now()
  // Additional Plaid fields from migration
  merchant_name?: string // TEXT
  type?: 'credit' | 'debit' // TEXT with constraint
  authorized_date?: string // DATE
  subcategory?: string // TEXT
  plaid_category?: string // TEXT
  account_owner?: string // TEXT
  iso_currency_code?: string // TEXT DEFAULT 'USD'
  location?: Record<string, any> // JSONB
  payment_meta?: Record<string, any> // JSONB
  // Additional field from setup-database.sql
  transaction_type?: 'expense' | 'income' | 'transfer' // TEXT DEFAULT 'expense'
}

export interface DatabaseBill {
  id: string
  user_id: string
  name: string
  amount: number // NUMERIC(10, 2) from database
  due_date: string // TIMESTAMP WITH TIME ZONE
  billing_cycle: BillingCycle // billing_cycle enum DEFAULT 'monthly'
  is_active: boolean // BOOLEAN DEFAULT true
  category?: string // TEXT
  created_at: string // TIMESTAMP WITH TIME ZONE DEFAULT now()
  updated_at: string // TIMESTAMP WITH TIME ZONE DEFAULT now()
  // Additional fields from bill payment tracking migration
  is_paid: boolean // BOOLEAN DEFAULT false
  payment_date?: string // TIMESTAMP WITH TIME ZONE
  current_period_start?: string // TIMESTAMP WITH TIME ZONE
  current_period_end?: string // TIMESTAMP WITH TIME ZONE
  is_overdue: boolean // BOOLEAN DEFAULT false
  recurrence_type: 'recurring' | 'one-time' // TEXT DEFAULT 'recurring'
}

export interface DatabaseIncomeSource {
  id: string
  user_id: string
  name: string
  amount: number // NUMERIC from database
  frequency: IncomeFrequency // TEXT DEFAULT 'monthly' with CHECK constraint
  category: string // TEXT DEFAULT 'salary'
  start_date?: string // DATE
  end_date?: string // DATE
  notes?: string // TEXT
  is_active: boolean // BOOLEAN DEFAULT true
  created_at: string // TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
  updated_at: string // TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
}

export interface DatabasePlaidItem {
  id: string
  user_id: string
  item_id: string
  access_token: string
  institution_id?: string
  institution_name?: string
  status: PlaidItemStatus
  sync_cursor?: string
  last_sync?: string
  error_code?: string
  error_message?: string
  consent_expiration_time?: string
  created_at: string
  updated_at: string
}

export interface DatabaseWebhookLog {
  id: string
  webhook_type: string
  webhook_code: string
  item_id?: string
  environment?: string
  data?: Record<string, any>
  processed_at: string
  created_at: string
}

// Utility types for common operations
export type CreateUserData = Omit<DatabaseUser, 'id' | 'created_at'>
export type UpdateUserData = Partial<Omit<DatabaseUser, 'id' | 'created_at'>>

export type CreateAccountData = Omit<DatabaseAccount, 'id' | 'created_at' | 'updated_at'>
export type UpdateAccountData = Partial<Omit<DatabaseAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type CreateTransactionData = Omit<DatabaseTransaction, 'id' | 'created_at'>
export type UpdateTransactionData = Partial<Omit<DatabaseTransaction, 'id' | 'user_id' | 'created_at'>>

export type CreateBillData = Omit<DatabaseBill, 'id' | 'created_at' | 'updated_at' | 'is_paid' | 'payment_date' | 'current_period_start' | 'current_period_end' | 'is_overdue'>
export type UpdateBillData = Partial<Omit<DatabaseBill, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type CreateIncomeSourceData = Omit<DatabaseIncomeSource, 'id' | 'created_at' | 'updated_at'>
export type UpdateIncomeSourceData = Partial<Omit<DatabaseIncomeSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type CreatePlaidItemData = Omit<DatabasePlaidItem, 'id' | 'created_at' | 'updated_at'>
export type UpdatePlaidItemData = Partial<Omit<DatabasePlaidItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// API Response types for common patterns
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  hasMore: boolean
}

// Financial calculation types
export interface MonthlyFinancialSummary {
  totalIncome: number
  totalExpenses: number
  netAmount: number
  remainingBalance: number
  totalBills: number
  paidBills: number
  overdueBills: number
}

export interface SpendingCategory {
  category: string
  amount: number
  transactionCount: number
  percentage: number
}

export interface MonthlyTrend {
  month: string
  income: number
  expenses: number
  netAmount: number
  isEstimated?: boolean
}