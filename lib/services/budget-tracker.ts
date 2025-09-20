import { createClient } from '@/lib/supabase/client'

export interface BudgetLimit {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  current_spending: number
  percentage_used: number
  warning_threshold: number
  created_at: string
  updated_at: string
}

export interface BudgetAlert {
  id: string
  type: 'warning' | 'exceeded' | 'critical'
  category: string
  percentage: number
  amount_spent: number
  limit: number
  message: string
  timestamp: Date
}

export interface CashFlowData {
  totalIncome: number
  totalSpending: number
  remainingBalance: number
  dailyBurnRate: number
  daysUntilEmpty: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string
  progress_percentage: number
  monthly_required: number
  on_track: boolean
}

export interface DebtPayoff {
  id: string
  user_id: string
  creditor_name: string
  debt_type: string
  original_amount: number
  current_balance: number
  minimum_payment: number
  interest_rate: number
  progress_percentage: number
  payoff_date: string
  months_remaining: number
}

export class BudgetTracker {
  private supabase = createClient()

  async calculateCategorySpending(userId: string, category: string, monthYear?: string): Promise<number> {
    const now = new Date()
    const year = monthYear ? parseInt(monthYear.split('-')[0]) : now.getFullYear()
    const month = monthYear ? parseInt(monthYear.split('-')[1]) : now.getMonth() + 1

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const { data: transactions, error } = await this.supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('transaction_type', 'expense')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())

    if (error) {
      console.error('Error calculating category spending:', error)
      return 0
    }

    return transactions?.reduce((total, t) => total + Math.abs(t.amount), 0) || 0
  }

  async getBudgetLimits(userId: string): Promise<BudgetLimit[]> {
    try {
      const { data, error } = await this.supabase
        .from('budget_limits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching budget limits:', error)

        // Check if it's a table not found error
        if (error.message?.includes('relation "budget_limits" does not exist')) {
          console.log('Budget limits table does not exist yet - returning default limits')
        }

        // Return some default budget limits based on common categories
        return this.getDefaultBudgetLimits(userId)
      }

      if (!data || data.length === 0) {
        return this.getDefaultBudgetLimits(userId)
      }

      // Calculate current spending for each category
      const limitsWithSpending = await Promise.all(
        data.map(async (limit) => {
          const currentSpending = await this.calculateCategorySpending(userId, limit.category)
          const percentageUsed = (currentSpending / limit.monthly_limit) * 100

          return {
            ...limit,
            current_spending: currentSpending,
            percentage_used: Math.round(percentageUsed * 100) / 100
          }
        })
      )

      return limitsWithSpending
    } catch (error) {
      console.error('Error in getBudgetLimits:', error)
      return this.getDefaultBudgetLimits(userId)
    }
  }

  private getDefaultBudgetLimits(userId: string): BudgetLimit[] {
    return [
      {
        id: 'default-1',
        user_id: userId,
        category: 'Food and Drink',
        monthly_limit: 800,
        current_spending: 0,
        percentage_used: 0,
        warning_threshold: 80,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'default-2',
        user_id: userId,
        category: 'Transportation',
        monthly_limit: 400,
        current_spending: 0,
        percentage_used: 0,
        warning_threshold: 80,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'default-3',
        user_id: userId,
        category: 'Entertainment',
        monthly_limit: 300,
        current_spending: 0,
        percentage_used: 0,
        warning_threshold: 80,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }

  generateBudgetAlerts(budgetLimits: BudgetLimit[]): BudgetAlert[] {
    const alerts: BudgetAlert[] = []

    budgetLimits.forEach(limit => {
      const { category, percentage_used, current_spending, monthly_limit, warning_threshold } = limit

      if (percentage_used >= 100) {
        alerts.push({
          id: `exceeded-${limit.id}`,
          type: 'exceeded',
          category,
          percentage: percentage_used,
          amount_spent: current_spending,
          limit: monthly_limit,
          message: `Budget exceeded! You've spent $${current_spending.toFixed(2)} of your $${monthly_limit.toFixed(2)} ${category} budget.`,
          timestamp: new Date()
        })
      } else if (percentage_used >= 90) {
        alerts.push({
          id: `critical-${limit.id}`,
          type: 'critical',
          category,
          percentage: percentage_used,
          amount_spent: current_spending,
          limit: monthly_limit,
          message: `Critical: ${percentage_used.toFixed(1)}% of ${category} budget used ($${current_spending.toFixed(2)}/$${monthly_limit.toFixed(2)})`,
          timestamp: new Date()
        })
      } else if (percentage_used >= (warning_threshold || 80)) {
        alerts.push({
          id: `warning-${limit.id}`,
          type: 'warning',
          category,
          percentage: percentage_used,
          amount_spent: current_spending,
          limit: monthly_limit,
          message: `Warning: ${percentage_used.toFixed(1)}% of ${category} budget used ($${current_spending.toFixed(2)}/$${monthly_limit.toFixed(2)})`,
          timestamp: new Date()
        })
      }
    })

    return alerts
  }

  async calculateCashFlow(userId: string): Promise<CashFlowData> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Get monthly income
    const { data: incomeSources } = await this.supabase
      .from('income_sources')
      .select('amount, frequency')
      .eq('user_id', userId)
      .eq('is_active', true)

    const totalIncome = (incomeSources || []).reduce((total, source) => {
      let monthlyAmount = source.amount
      switch (source.frequency) {
        case 'biweekly': monthlyAmount = source.amount * 2.17; break
        case 'weekly': monthlyAmount = source.amount * 4.33; break
        case 'quarterly': monthlyAmount = source.amount / 3; break
        case 'annual': monthlyAmount = source.amount / 12; break
      }
      return total + monthlyAmount
    }, 0)

    // Get monthly spending
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('amount, date')
      .eq('user_id', userId)
      .eq('transaction_type', 'expense')
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString())

    const totalSpending = (transactions || []).reduce((total, t) => total + Math.abs(t.amount), 0)
    const remainingBalance = totalIncome - totalSpending

    // Calculate daily burn rate
    const daysInMonth = now.getDate()
    const dailyBurnRate = daysInMonth > 0 ? totalSpending / daysInMonth : 0
    const daysUntilEmpty = dailyBurnRate > 0 ? remainingBalance / dailyBurnRate : Infinity

    // Determine trend (simple implementation)
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (remainingBalance > totalIncome * 0.2) {
      trend = 'improving'
    } else if (remainingBalance < totalIncome * 0.1) {
      trend = 'declining'
    }

    return {
      totalIncome,
      totalSpending,
      remainingBalance,
      dailyBurnRate,
      daysUntilEmpty: Math.floor(daysUntilEmpty),
      trend
    }
  }

  async getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    try {
      const { data, error } = await this.supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching savings goals:', error)

        // Check if it's a table not found error
        if (error.message?.includes('relation "savings_goals" does not exist')) {
          console.log('Savings goals table does not exist yet - returning default goals')
        }

        return this.getDefaultSavingsGoals(userId)
      }

      if (!data || data.length === 0) {
        return this.getDefaultSavingsGoals(userId)
      }

      return (data || []).map(goal => {
        const progressPercentage = (goal.current_amount / goal.target_amount) * 100
        const deadline = new Date(goal.deadline)
        const now = new Date()
        const monthsRemaining = Math.max(0, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()))
        const monthlyRequired = monthsRemaining > 0 ? (goal.target_amount - goal.current_amount) / monthsRemaining : 0

        return {
          ...goal,
          progress_percentage: Math.round(progressPercentage * 100) / 100,
          monthly_required: monthlyRequired,
          on_track: progressPercentage >= (((now.getTime() - new Date(goal.created_at).getTime()) / (deadline.getTime() - new Date(goal.created_at).getTime())) * 100)
        }
      })
    } catch (error) {
      console.error('Error in getSavingsGoals:', error)
      return this.getDefaultSavingsGoals(userId)
    }
  }

  private getDefaultSavingsGoals(userId: string): SavingsGoal[] {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    return [
      {
        id: 'default-savings-1',
        user_id: userId,
        name: 'Emergency Fund',
        target_amount: 5000,
        current_amount: 1200,
        deadline: futureDate.toISOString(),
        progress_percentage: 24,
        monthly_required: 316.67,
        on_track: true
      }
    ]
  }

  async getDebtPayoffs(userId: string): Promise<DebtPayoff[]> {
    try {
      const { data, error } = await this.supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching debts:', error)

        // Check if it's a table not found error
        if (error.message?.includes('relation "debts" does not exist')) {
          console.log('Debts table does not exist yet - returning default debts')
        }

        return this.getDefaultDebtPayoffs(userId)
      }

      if (!data || data.length === 0) {
        return this.getDefaultDebtPayoffs(userId)
      }

      return (data || []).map(debt => {
        const originalAmount = debt.original_amount || debt.current_balance
        const progressPercentage = originalAmount > 0 ? ((originalAmount - debt.current_balance) / originalAmount) * 100 : 0
        const monthsRemaining = Math.max(0, debt.current_balance / (debt.minimum_payment || 1))

        return {
          id: debt.id,
          user_id: debt.user_id,
          creditor_name: debt.creditor_name,
          debt_type: debt.debt_type,
          original_amount: originalAmount,
          current_balance: debt.current_balance,
          minimum_payment: debt.minimum_payment,
          interest_rate: debt.interest_rate,
          progress_percentage: Math.round(progressPercentage * 100) / 100,
          months_remaining: Math.ceil(monthsRemaining),
          payoff_date: !isNaN(monthsRemaining) && isFinite(monthsRemaining)
            ? new Date(Date.now() + Math.max(0, monthsRemaining) * 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error in getDebtPayoffs:', error)
      return this.getDefaultDebtPayoffs(userId)
    }
  }

  private getDefaultDebtPayoffs(userId: string): DebtPayoff[] {
    return [
      {
        id: 'default-debt-1',
        user_id: userId,
        creditor_name: 'Credit Card',
        debt_type: 'credit_card',
        original_amount: 3000,
        current_balance: 2100,
        interest_rate: 18.99,
        minimum_payment: 65,
        progress_percentage: 30,
        months_remaining: 32,
        payoff_date: new Date(Date.now() + 32 * 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }

  // Savings Goals Management Methods
  async createSavingsGoal(userId: string, goalData: {
    name: string
    target_amount: number
    deadline: string
    current_amount?: number
  }): Promise<SavingsGoal> {
    try {
      const { data, error } = await this.supabase
        .from('savings_goals')
        .insert({
          user_id: userId,
          name: goalData.name,
          target_amount: goalData.target_amount,
          current_amount: goalData.current_amount || 0,
          deadline: goalData.deadline,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating savings goal:', error)
        throw error
      }

      // Calculate additional fields
      const progressPercentage = (data.current_amount / data.target_amount) * 100
      const deadline = new Date(data.deadline)
      const now = new Date()
      const monthsRemaining = Math.max(0, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()))
      const monthlyRequired = monthsRemaining > 0 ? (data.target_amount - data.current_amount) / monthsRemaining : 0

      return {
        ...data,
        progress_percentage: Math.round(progressPercentage * 100) / 100,
        monthly_required: monthlyRequired,
        on_track: progressPercentage >= (((now.getTime() - new Date(data.created_at).getTime()) / (deadline.getTime() - new Date(data.created_at).getTime())) * 100)
      }
    } catch (error) {
      console.error('Error in createSavingsGoal:', error)
      throw error
    }
  }

  async addFundsToGoal(goalId: string, amount: number): Promise<SavingsGoal> {
    try {
      // First, get the current goal data
      const { data: currentGoal, error: fetchError } = await this.supabase
        .from('savings_goals')
        .select('current_amount')
        .eq('id', goalId)
        .single()

      if (fetchError) {
        console.error('Error fetching current goal:', fetchError)
        throw fetchError
      }

      // Update with new amount
      const { data, error } = await this.supabase
        .from('savings_goals')
        .update({
          current_amount: currentGoal.current_amount + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select()
        .single()

      if (error) {
        console.error('Error adding funds to goal:', error)
        throw error
      }

      // Calculate additional fields
      const progressPercentage = (data.current_amount / data.target_amount) * 100
      const deadline = new Date(data.deadline)
      const now = new Date()
      const monthsRemaining = Math.max(0, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()))
      const monthlyRequired = monthsRemaining > 0 ? (data.target_amount - data.current_amount) / monthsRemaining : 0

      return {
        ...data,
        progress_percentage: Math.round(progressPercentage * 100) / 100,
        monthly_required: monthlyRequired,
        on_track: progressPercentage >= (((now.getTime() - new Date(data.created_at).getTime()) / (deadline.getTime() - new Date(data.created_at).getTime())) * 100)
      }
    } catch (error) {
      console.error('Error in addFundsToGoal:', error)
      throw error
    }
  }

  async updateGoalTarget(goalId: string, newTarget: number): Promise<SavingsGoal> {
    try {
      const { data, error } = await this.supabase
        .from('savings_goals')
        .update({
          target_amount: newTarget,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select()
        .single()

      if (error) {
        console.error('Error updating goal target:', error)
        throw error
      }

      // Calculate additional fields
      const progressPercentage = (data.current_amount / data.target_amount) * 100
      const deadline = new Date(data.deadline)
      const now = new Date()
      const monthsRemaining = Math.max(0, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()))
      const monthlyRequired = monthsRemaining > 0 ? (data.target_amount - data.current_amount) / monthsRemaining : 0

      return {
        ...data,
        progress_percentage: Math.round(progressPercentage * 100) / 100,
        monthly_required: monthlyRequired,
        on_track: progressPercentage >= (((now.getTime() - new Date(data.created_at).getTime()) / (deadline.getTime() - new Date(data.created_at).getTime())) * 100)
      }
    } catch (error) {
      console.error('Error in updateGoalTarget:', error)
      throw error
    }
  }

  async updateSavingsGoal(goalId: string, updates: {
    name?: string
    target_amount?: number
    current_amount?: number
    deadline?: string
  }): Promise<SavingsGoal> {
    try {
      const { data, error } = await this.supabase
        .from('savings_goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select()
        .single()

      if (error) {
        console.error('Error updating savings goal:', error)
        throw error
      }

      // Calculate additional fields
      const progressPercentage = (data.current_amount / data.target_amount) * 100
      const deadline = new Date(data.deadline)
      const now = new Date()
      const monthsRemaining = Math.max(0, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()))
      const monthlyRequired = monthsRemaining > 0 ? (data.target_amount - data.current_amount) / monthsRemaining : 0

      return {
        ...data,
        progress_percentage: Math.round(progressPercentage * 100) / 100,
        monthly_required: monthlyRequired,
        on_track: progressPercentage >= (((now.getTime() - new Date(data.created_at).getTime()) / (deadline.getTime() - new Date(data.created_at).getTime())) * 100)
      }
    } catch (error) {
      console.error('Error in updateSavingsGoal:', error)
      throw error
    }
  }
}

export const budgetTracker = new BudgetTracker()