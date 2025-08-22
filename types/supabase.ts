export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          aggregator_refresh_token: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          aggregator_refresh_token?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          aggregator_refresh_token?: string | null
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          balance: number
          currency: string
          plaid_account_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          balance?: number
          currency?: string
          plaid_account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          balance?: number
          currency?: string
          plaid_account_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          description: string
          amount: number
          date: string
          category: string | null
          pending: boolean
          plaid_transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          description: string
          amount: number
          date: string
          category?: string | null
          pending?: boolean
          plaid_transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          description?: string
          amount?: number
          date?: string
          category?: string | null
          pending?: boolean
          plaid_transaction_id?: string | null
          created_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          due_date: string
          billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly'
          is_active: boolean
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          due_date: string
          billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly'
          is_active?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          due_date?: string
          billing_cycle?: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly'
          is_active?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      plaid_items: {
        Row: {
          id: string
          user_id: string
          access_token: string
          item_id: string
          institution_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          item_id: string
          institution_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          item_id?: string
          institution_name?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly'
    }
  }
}