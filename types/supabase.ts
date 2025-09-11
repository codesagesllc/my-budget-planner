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
          subcategory: string | null
          transaction_type: 'expense' | 'income' | 'transfer'
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
          subcategory?: string | null
          transaction_type?: 'expense' | 'income' | 'transfer'
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
          subcategory?: string | null
          transaction_type?: 'expense' | 'income' | 'transfer'
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
          billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly' | 'one-time'
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
          billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly' | 'one-time'
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
          billing_cycle?: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly' | 'one-time'
          is_active?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      income_sources: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          frequency: 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time'
          category: string
          is_active: boolean
          start_date: string | null
          end_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          frequency?: 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time'
          category?: string
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          frequency?: 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time'
          category?: string
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      financial_goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          target_date: string | null
          category: string | null
          priority: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number
          target_date?: string | null
          category?: string | null
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          category?: string | null
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      budget_forecasts: {
        Row: {
          id: string
          user_id: string
          forecast_date: string
          predicted_income: number | null
          predicted_expenses: number | null
          predicted_savings: number | null
          confidence_score: number | null
          forecast_method: string | null
          insights: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          forecast_date: string
          predicted_income?: number | null
          predicted_expenses?: number | null
          predicted_savings?: number | null
          confidence_score?: number | null
          forecast_method?: string | null
          insights?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          forecast_date?: string
          predicted_income?: number | null
          predicted_expenses?: number | null
          predicted_savings?: number | null
          confidence_score?: number | null
          forecast_method?: string | null
          insights?: Json | null
          created_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          monthly_net_income: number | null
          savings_target_percentage: number | null
          emergency_fund_target: number | null
          currency: string
          fiscal_month_start_day: number
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          monthly_net_income?: number | null
          savings_target_percentage?: number | null
          emergency_fund_target?: number | null
          currency?: string
          fiscal_month_start_day?: number
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          monthly_net_income?: number | null
          savings_target_percentage?: number | null
          emergency_fund_target?: number | null
          currency?: string
          fiscal_month_start_day?: number
          notification_preferences?: Json
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
      monthly_financial_summary: {
        Row: {
          user_id: string
          month: string
          total_income: number
          total_expenses: number
          net_savings: number
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly' | 'one-time'
      transaction_type: 'expense' | 'income' | 'transfer'
      income_frequency: 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time'
    }
  }
}