/**
 * Shared type definitions for financial data structures
 * These types are compatible with the Supabase database schema
 * but provide more flexibility for component interfaces
 */

import { Database } from './supabase'

// Re-export database types for convenience
export type DBTransaction = Database['public']['Tables']['transactions']['Row']
export type DBBill = Database['public']['Tables']['bills']['Row']
export type DBAccount = Database['public']['Tables']['accounts']['Row']
export type DBIncomeSource = Database['public']['Tables']['income_sources']['Row']

/**
 * Transaction type for components
 * More flexible than the strict database type
 */
export interface Transaction {
  id: string
  user_id?: string
  account_id?: string
  description: string
  amount: number
  date: string
  category?: string | null
  categories?: string[] | null
  subcategory?: string | null
  transaction_type?: 'expense' | 'income' | 'transfer'
  pending?: boolean
  plaid_transaction_id?: string | null
  bill_id?: string | null
  is_recurring?: boolean
  recurring_pattern?: any | null
  is_bill_payment?: boolean
  exclude_from_spending?: boolean
  created_at?: string
}

/**
 * Bill type for components
 * Handles the Json type from database for categories
 */
export interface Bill {
  id: string
  user_id?: string
  name: string
  amount: number
  due_date?: string
  billing_cycle: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual' | 'one-time'
  categories?: any | null  // Json type from database, usually string[]
  category?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Account type for components
 */
export interface Account {
  id: string
  user_id: string
  name: string
  type: string
  balance: number
  currency?: string
  plaid_account_id?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Income source type for components
 */
export interface IncomeSource {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time'
  category?: string
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Helper function to safely parse categories from Json type
 */
export function parseCategories(categories: any): string[] {
  if (!categories) return []
  if (Array.isArray(categories)) {
    return categories.map(c => String(c))
  }
  if (typeof categories === 'string') {
    try {
      const parsed = JSON.parse(categories)
      return Array.isArray(parsed) ? parsed.map(c => String(c)) : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Helper function to convert database bill to component bill
 */
export function dbBillToBill(dbBill: DBBill): Bill {
  return {
    ...dbBill,
    categories: dbBill.categories || null,
    due_date: dbBill.due_date || undefined,
    billing_cycle: dbBill.billing_cycle as Bill['billing_cycle']
  }
}

/**
 * Helper function to convert database transaction to component transaction
 */
export function dbTransactionToTransaction(dbTx: DBTransaction): Transaction {
  return {
    ...dbTx,
    user_id: dbTx.user_id || undefined,
    account_id: dbTx.account_id || undefined,
    transaction_type: dbTx.transaction_type as Transaction['transaction_type'],
    pending: dbTx.pending || false
  }
}
