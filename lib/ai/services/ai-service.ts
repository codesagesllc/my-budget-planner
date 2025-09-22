import { Anthropic } from '@anthropic-ai/sdk'
import { redis } from '@/lib/redis'
import { createHash } from 'crypto'
import { AI_LIMITS } from '@/lib/constants/ai-limits'
import type { DatabaseTransaction, DatabaseBill, DatabaseIncomeSource } from '@/lib/types/database'

// Initialize AI client - Only using Claude/Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Export AI_LIMITS for compatibility
export { AI_LIMITS }

export type SubscriptionTier = keyof typeof AI_LIMITS

// Cache configuration
const CACHE_TTL = {
  insights: 86400, // 24 hours
  bill_parsing: 3600, // 1 hour
  income_detection: 86400, // 24 hours
  debt_strategy: 86400, // 24 hours
}

// Helper functions accessible to both classes
function summarizeTransactions(transactions: DatabaseTransaction[]): {
  totalSpending: number
  avgTransaction: number
  topCategories: Array<{ category: string; amount: number; count: number }>
  totalTransactions: number
} {
  const truncated = transactions.slice(0, 50) // Simple truncation
  const categories = new Map<string, number>()
  let total = 0
  let income = 0
  
  truncated.forEach(t => {
    const amount = Math.abs(t.amount)
    if (t.amount > 0 || t.transaction_type === 'income') {
      income += amount
    } else {
      total += amount
    }
    const cat = t.category || 'Other'
    categories.set(cat, (categories.get(cat) || 0) + 1)
  })
  
  const topCategories = Array.from(categories.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => ({
      category: cat,
      amount: Math.round((truncated.filter(t => (t.category || 'Other') === cat).reduce((sum, t) => sum + Math.abs(t.amount), 0))),
      count
    }))
  
  return {
    totalSpending: Math.round(total),
    avgTransaction: truncated.length > 0 ? Math.round(total / truncated.length) : 0,
    topCategories,
    totalTransactions: truncated.length,
  }
}

function calculateUniqueSpending(transactions: any[], bills: any[]): any {
  // Get transaction summary
  const txSummary = summarizeTransactions(transactions)
  
  // Create a map of bill amounts for comparison
  const billAmounts = new Set(bills.map(b => Math.round(b.amount)))
  
  // Filter out transactions that match bill amounts (likely duplicates)
  let nonBillTransactionTotal = 0
  transactions.forEach(t => {
    const amount = Math.abs(t.amount)
    const rounded = Math.round(amount)
    // Only count if it doesn't match a bill amount and is an expense
    if (!billAmounts.has(rounded) && t.amount < 0) {
      nonBillTransactionTotal += amount
    }
  })
  
  // Calculate total bills
  const billsTotal = bills.reduce((sum: number, b: any) => sum + b.amount, 0)
  
  // Detect income frequency
  let incomeFrequency = 'monthly'
  let monthlyIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  
  // Simple frequency detection based on transaction count and amounts
  const incomeTransactions = transactions.filter(t => t.amount > 0)
  if (incomeTransactions.length >= 2) {
    // Check if income comes twice a month (biweekly)
    const incomeDates = incomeTransactions.map(t => new Date(t.date).getDate()).sort((a, b) => a - b)
    if (incomeDates.length >= 2) {
      const dayDiff = incomeDates[1] - incomeDates[0]
      if (dayDiff >= 12 && dayDiff <= 16) {
        incomeFrequency = 'biweekly'
        monthlyIncome = monthlyIncome * 2.17 // Average biweekly to monthly
      }
    }
  }
  
  return {
    total: Math.round(billsTotal + nonBillTransactionTotal),
    bills: Math.round(billsTotal),
    transactions: Math.round(nonBillTransactionTotal),
    income: Math.round(monthlyIncome),
    incomeFrequency
  }
}

// Batch processing queue
interface BatchRequest {
  id: string
  type: 'insights' | 'bill_parsing' | 'income_detection'
  data: any
  userId: string
  resolve: (value: any) => void
  reject: (reason?: any) => void
}

class BatchProcessor {
  private queue: Map<string, BatchRequest[]> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private readonly batchSize = 5
  private readonly batchDelay = 2000 // 2 seconds

  add(request: BatchRequest): void {
    const key = `${request.type}-${request.userId}`
    
    if (!this.queue.has(key)) {
      this.queue.set(key, [])
    }
    
    this.queue.get(key)!.push(request)
    
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
    }
    
    // Set new timer or process immediately if batch is full
    const batch = this.queue.get(key)!
    if (batch.length >= this.batchSize) {
      this.processBatch(key)
    } else {
      const timer = setTimeout(() => this.processBatch(key), this.batchDelay)
      this.timers.set(key, timer)
    }
  }

  private async processBatch(key: string): Promise<void> {
    const batch = this.queue.get(key)
    if (!batch || batch.length === 0) return
    
    this.queue.delete(key)
    this.timers.delete(key)
    
    try {
      // Process batch based on type
      const [type] = key.split('-')
      const results = await this.executeBatch(type as any, batch)
      
      // Resolve individual promises
      batch.forEach((request, index) => {
        request.resolve(results[index])
      })
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(request => {
        request.reject(error)
      })
    }
  }

  private async executeBatch(
    type: 'insights' | 'bill_parsing' | 'income_detection',
    batch: BatchRequest[]
  ): Promise<any[]> {
    // Combine data for batch processing
    const combinedData = batch.map(r => r.data)
    
    switch (type) {
      case 'insights':
        return this.batchInsights(combinedData)
      case 'bill_parsing':
        return this.batchBillParsing(combinedData)
      case 'income_detection':
        return this.batchIncomeDetection(combinedData)
      default:
        throw new Error(`Unknown batch type: ${type}`)
    }
  }

  private async batchInsights(dataArray: any[]): Promise<any[]> {
    // Process multiple insight requests in a single API call
    const prompt = this.createBatchInsightsPrompt(dataArray)
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    })
    
    // Parse and split response for each request
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }
    
    return this.parseBatchResponse(content.text, dataArray.length)
  }

  private async batchBillParsing(dataArray: any[]): Promise<any[]> {
    // Similar batch processing for bill parsing
    const prompt = this.createBatchBillParsingPrompt(dataArray)
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })
    
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }
    
    return this.parseBatchResponse(content.text, dataArray.length)
  }

  private async batchIncomeDetection(dataArray: any[]): Promise<any[]> {
    // Batch process income detection with Claude
    const prompt = this.createBatchIncomePrompt(dataArray)
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 3000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })
    
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }
    
    return this.parseBatchResponse(content.text, dataArray.length)
  }

  private createBatchInsightsPrompt(dataArray: any[]): string {
    return `Analyze ${dataArray.length} financial profiles with enhanced insights.

${dataArray.map((data, i) => {
      const uniqueSpending = calculateUniqueSpending(data.transactions || [], data.bills || [])
      return `
Profile ${i + 1}:
- Transactions: ${data.transactions?.length || 0}
- Bills: ${data.bills?.length || 0} ($${uniqueSpending.bills}/mo)
- Total Monthly Obligations: $${uniqueSpending.total}
- Income: $${uniqueSpending.income}/mo (${uniqueSpending.incomeFrequency})
${data.goal ? `- Goal: $${data.goal.amount} by ${data.goal.deadline}` : ''}`
    }).join('\n')}

For each profile, provide comprehensive financial analysis.
Return JSON array: [{"insights": "analysis", "monthlyBudget": {"income": num, "bills": num, "spending": num, "recommended_savings": num}, "savingsPlan": {"per_paycheck": num, "monthly_total": num, "percentage": num}, "tips": ["tip1", "tip2", "tip3"]}]`
  }

  private createBatchBillParsingPrompt(dataArray: any[]): string {
    return `Extract bills from ${dataArray.length} spreadsheets using EXACT Plaid category values. Return JSON array.

${dataArray.map((data, i) => `
Spreadsheet ${i + 1} (${data.content.substring(0, 500)}...)
`).join('\n')}

Use these EXACT Plaid category values:
UTILITIES: electric, gas, water, internet, phone, cable, trash
HOUSING: rent, mortgage, hoa, property_tax, home_insurance
TRANSPORTATION: auto_loan, auto_insurance, parking, public_transport
INSURANCE: health_insurance, life_insurance, dental_insurance, vision_insurance
FINANCIAL: credit_card, personal_loan, student_loan, bank_fees
HEALTHCARE: medical, dental, vision, pharmacy
SUBSCRIPTIONS: subscription, streaming, software
EDUCATION: tuition, daycare
PERSONAL: gym, salon
OTHER: charity, tax, dmv, storage, membership, other

Examples: Netflix→streaming, Electric→electric, Rent→rent, Car Insurance→auto_insurance

Format: [{bills: [{name:"string", amount:number, billingCycle:"monthly|weekly|biweekly|quarterly|annual|one-time", category:"exact_plaid_value"}], summary: "string"}]`
  }

  private createBatchIncomePrompt(dataArray: any[]): string {
    return `Detect income patterns from ${dataArray.length} transaction sets.

${dataArray.map((data, i) => `
Set ${i + 1}: ${data.transactions?.length || 0} transactions
Sample transactions: ${JSON.stringify(data.transactions?.slice(0, 5) || [])}
`).join('\n')}

Analyze for recurring income patterns (salary, freelance, investments).
Return JSON array: [{patterns: [{name: string, amount: number, frequency: string, category: string}]}]`
  }

  private parseBatchResponse(response: string, expectedCount: number): any[] {
    try {
      const parsed = JSON.parse(response)
      if (Array.isArray(parsed) && parsed.length === expectedCount) {
        return parsed
      }
      // Fallback: split response if not properly formatted
      return Array(expectedCount).fill({ insights: response })
    } catch {
      // If JSON parsing fails, return same response for all
      return Array(expectedCount).fill({ insights: response })
    }
  }
}

// Singleton batch processor
const batchProcessor = new BatchProcessor()

// Main AI Service class
export class AIService {
  private static instance: AIService
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  // Generate cache key
  private getCacheKey(type: string, data: any): string {
    const hash = createHash('md5')
      .update(JSON.stringify({ type, data }))
      .digest('hex')
    return `ai:cache:${type}:${hash}`
  }

  // Check rate limits
  async checkRateLimit(
    userId: string,
    feature: keyof typeof AI_LIMITS['basic'],
    tier: SubscriptionTier = 'free_trial'
  ): Promise<boolean> {
    const limit = AI_LIMITS[tier][feature]
    
    // Unlimited for premium
    if (limit === -1) return true
    
    try {
      // Check monthly usage
      const key = `ai:usage:${userId}:${feature}:${new Date().toISOString().slice(0, 7)}`
      const usage = await redis.incr(key)
      
      // Set expiry on first use
      if (usage === 1) {
        await redis.expire(key, 2592000) // 30 days
      }
      
      return usage <= (limit as number)
    } catch (error) {
      console.error('Rate limit check error:', error)
      // If Redis fails, allow the request but log it
      return true
    }
  }

  // Smart truncation for transactions
  private truncateTransactions(transactions: any[], maxItems = 50): any[] {
    if (transactions.length <= maxItems) return transactions
    
    // Prioritize recent and high-value transactions
    const sorted = [...transactions].sort((a, b) => {
      // Recent first
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (Math.abs(dateA - dateB) > 86400000) { // More than 1 day difference
        return dateB - dateA
      }
      // Then by amount
      return Math.abs(b.amount) - Math.abs(a.amount)
    })
    
    // Take top transactions and simplify
    return sorted.slice(0, maxItems).map(t => ({
      amount: t.amount,
      date: t.date,
      category: t.category,
      description: t.description?.substring(0, 50), // Truncate descriptions
    }))
  }

  // Optimized prompt templates
  private getOptimizedPrompt(type: string, data: any): string {
    switch (type) {
      case 'insights':
        return this.getInsightsPrompt(data)
      case 'bill_parsing':
        return this.getBillParsingPrompt(data)
      case 'income_detection':
        return this.getIncomePrompt(data)
      case 'debt_strategy':
        return this.getDebtStrategyPrompt(data)
      default:
        throw new Error(`Unknown prompt type: ${type}`)
    }
  }

  private getInsightsPrompt(data: {
    transactions: DatabaseTransaction[]
    bills: DatabaseBill[]
    incomeSources: DatabaseIncomeSource[]
    goal?: any
  }): string {
    // Enhanced prompt with better financial analysis
    const { transactions, bills, incomeSources, goal } = data
    const txSummary = summarizeTransactions(transactions)
    const billsTotal = bills.reduce((sum: number, b: DatabaseBill) => sum + b.amount, 0)

    // Calculate monthly income from income sources
    const monthlyIncome = incomeSources.reduce((total: number, source: DatabaseIncomeSource) => {
      if (!source.is_active) return total
      const multipliers: Record<string, number> = {
        'weekly': 4.33333,
        'biweekly': 2.16667,
        'monthly': 1,
        'quarterly': 0.33333,
        'annual': 0.08333,
        'one-time': 0
      }
      return total + (source.amount * (multipliers[source.frequency] || 0))
    }, 0)

    return `You are a personal finance advisor. Analyze this financial profile and provide comprehensive, actionable insights in a conversational tone.

Financial Data:
- Recent Transactions: ${txSummary.totalTransactions} transactions, $${txSummary.totalSpending.toFixed(2)} total spending
- Monthly Bills: ${bills.length} recurring bills, $${billsTotal.toFixed(2)} monthly total
- Income Sources: ${incomeSources.length} active sources, $${monthlyIncome.toFixed(2)} monthly total
- Top Spending Categories: ${txSummary.topCategories.length > 0 ? txSummary.topCategories.map(cat => cat.category).join(', ') : 'Mixed categories'}
${goal ? `- Savings Goal: $${goal.amount} by ${goal.deadline} for ${goal.description || 'personal goal'}` : ''}

Provide a detailed JSON response with comprehensive analysis:

{
  "insights": "Write 3-4 paragraphs of conversational financial analysis. Include observations about spending patterns, budget health, areas of concern, and positive habits. Be encouraging but honest. Include specific numbers and percentages when relevant.",
  "monthlyBudget": {
    "income": ${monthlyIncome || 0},
    "bills": ${billsTotal},
    "spending": ${txSummary.totalSpending || 0},
    "recommended_savings": [calculate 20% of income or a reasonable amount]
  },
  "savingsPlan": {
    "per_paycheck": [divide monthly savings by pay frequency],
    "monthly_total": [total monthly savings recommendation],
    "percentage": [percentage of income to save]
  },
  "tips": [
    "Provide 4-5 specific, actionable tips based on their actual spending patterns",
    "Include concrete suggestions like 'reduce dining out by $X per month'",
    "Mention specific categories where they're overspending",
    "Include positive reinforcement for good habits",
    "Add goal-specific advice if they have a savings goal"
  ]
}

Focus on being helpful, specific, and encouraging. Use their actual data to provide personalized recommendations.`
  }

  private getBillParsingPrompt(data: any): string {
    // Enhanced bill parsing prompt with Plaid categories
    return `Extract bills from spreadsheet content and classify them using EXACT Plaid category values for optimal transaction matching.

Content: ${data.content.substring(0, 3000)}

IMPORTANT: Use these EXACT category values (not the group names):

UTILITIES: electric, gas, water, internet, phone, cable, trash
HOUSING: rent, mortgage, hoa, property_tax, home_insurance
TRANSPORTATION: auto_loan, auto_insurance, parking, public_transport
INSURANCE: health_insurance, life_insurance, dental_insurance, vision_insurance
FINANCIAL: credit_card, personal_loan, student_loan, bank_fees
HEALTHCARE: medical, dental, vision, pharmacy
SUBSCRIPTIONS: subscription, streaming, software
EDUCATION: tuition, daycare
PERSONAL: gym, salon
OTHER: charity, tax, dmv, storage, membership, other

Examples of proper categorization:
- "Netflix" → streaming
- "Electric Company" → electric
- "Mortgage Payment" → mortgage
- "Car Insurance" → auto_insurance
- "Planet Fitness" → gym
- "Student Loan" → student_loan

Return JSON: {bills:[{name:"string",amount:number,billingCycle:"monthly|weekly|biweekly|quarterly|annual|one-time",category:"exact_plaid_value"}],summary:"string"}`
  }

  private getIncomePrompt(data: any): string {
    return `Analyze transactions to detect income patterns.
Transaction count: ${data.transactions.length}
Sample transactions:
${JSON.stringify(data.transactions.slice(0, 10))}

Identify recurring income sources like:
- Salary/wages (regular amounts on consistent dates)
- Freelance/contract payments
- Investment returns
- Rental income
- Other regular deposits

Return JSON: {patterns: [{name: string, amount: number, frequency: "monthly"|"biweekly"|"weekly"|"quarterly"|"annual", category: "salary"|"freelance"|"investment"|"rental"|"other", confidence: number}]}`
  }

  private getDebtStrategyPrompt(data: any): string {
    const { debts, income, expenses, strategy } = data
    return `Debt strategy (${strategy}):
Debts: ${debts.length} totaling $${debts.reduce((sum: number, d: any) => sum + d.balance, 0)}
Income: $${income}/mo, Expenses: $${expenses}/mo
Calculate optimal payment order & timeline. Return JSON.`
  }

  // Main public methods with caching and batching
  async generateInsights(
    userId: string,
    transactions: DatabaseTransaction[],
    bills: DatabaseBill[],
    incomeSources: DatabaseIncomeSource[] = [],
    goal?: any,
    tier: SubscriptionTier = 'basic'
  ): Promise<string> {
    // Check rate limit
    const canProceed = await this.checkRateLimit(userId, 'monthly_insights', tier)
    if (!canProceed) {
      throw new Error('Monthly AI insights limit reached. Upgrade to Premium for unlimited access.')
    }
    
    // Prepare data with smart truncation
    const data = {
      transactions: this.truncateTransactions(transactions),
      bills,
      incomeSources,
      goal,
    }
    
    // Check cache
    const cacheKey = this.getCacheKey('insights', data)
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return cached as string
      }
    } catch (error) {
      console.error('Cache get error:', error)
      // Continue without cache if Redis fails
    }
    
    // Use batch processing for non-premium users
    if (tier !== 'premium') {
      return new Promise((resolve, reject) => {
        batchProcessor.add({
          id: crypto.randomUUID(),
          type: 'insights',
          data,
          userId,
          resolve: async (result) => {
            // Cache result
            try {
              await redis.setex(cacheKey, CACHE_TTL.insights, result.insights)
            } catch (error) {
              console.error('Cache set error:', error)
            }
            resolve(result.insights)
          },
          reject,
        })
      })
    }
    
    // Premium users get immediate processing
    const prompt = this.getOptimizedPrompt('insights', data)
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500, // Reduced from 2000
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    })
    
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }
    
    // Cache result
    try {
      await redis.setex(cacheKey, CACHE_TTL.insights, content.text)
    } catch (error) {
      console.error('Cache set error:', error)
      // Continue even if caching fails
    }
    
    return content.text
  }

  async parseBills(
    userId: string,
    fileContent: string,
    tier: SubscriptionTier = 'basic'
  ): Promise<any> {
    // Check rate limit
    const canProceed = await this.checkRateLimit(userId, 'bill_parsing', tier)
    if (!canProceed) {
      throw new Error('Monthly bill parsing limit reached. Upgrade to Premium for unlimited access.')
    }
    
    // Truncate file content for optimization
    const data = {
      content: fileContent.substring(0, 5000), // Limit to 5000 chars
    }
    
    // Check cache
    const cacheKey = this.getCacheKey('bill_parsing', data)
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached as string)
      }
    } catch (error) {
      console.error('Cache get error:', error)
      // Continue without cache if Redis fails
    }
    
    // Process with batching for non-premium
    if (tier !== 'premium') {
      return new Promise((resolve, reject) => {
        batchProcessor.add({
          id: crypto.randomUUID(),
          type: 'bill_parsing',
          data,
          userId,
          resolve: async (result) => {
            try {
              await redis.setex(cacheKey, CACHE_TTL.bill_parsing, JSON.stringify(result))
            } catch (error) {
              console.error('Cache set error:', error)
            }
            resolve(result)
          },
          reject,
        })
      })
    }
    
    // Premium processing
    const prompt = this.getOptimizedPrompt('bill_parsing', data)
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000, // Reduced from 4000
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })
    
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }
    
    const result = JSON.parse(content.text)
    try {
      await redis.setex(cacheKey, CACHE_TTL.bill_parsing, JSON.stringify(result))
    } catch (error) {
      console.error('Cache set error:', error)
      // Continue even if caching fails
    }
    
    return result
  }

  async detectIncome(
    userId: string,
    transactions: any[],
    tier: SubscriptionTier = 'basic'
  ): Promise<any> {
    // Check rate limit
    const canProceed = await this.checkRateLimit(userId, 'income_detection', tier)
    if (!canProceed) {
      throw new Error('Monthly income detection limit reached. Upgrade to Premium for unlimited access.')
    }
    
    // Smart truncation
    const data = {
      transactions: this.truncateTransactions(transactions, 100),
    }
    
    // Check cache
    const cacheKey = this.getCacheKey('income_detection', data)
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached as string)
      }
    } catch (error) {
      console.error('Cache get error:', error)
      // Continue without cache if Redis fails
    }
    
    // Batch for non-premium
    if (tier !== 'premium') {
      return new Promise((resolve, reject) => {
        batchProcessor.add({
          id: crypto.randomUUID(),
          type: 'income_detection',
          data,
          userId,
          resolve: async (result) => {
            try {
              await redis.setex(cacheKey, CACHE_TTL.income_detection, JSON.stringify(result))
            } catch (error) {
              console.error('Cache set error:', error)
            }
            resolve(result)
          },
          reject,
        })
      })
    }
    
    // Premium processing with Claude
    const prompt = this.getOptimizedPrompt('income_detection', data)
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })
    
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }
    
    const result = JSON.parse(content.text)
    try {
      await redis.setex(cacheKey, CACHE_TTL.income_detection, JSON.stringify(result))
    } catch (error) {
      console.error('Cache set error:', error)
      // Continue even if caching fails
    }
    
    return result
  }

  async generateDebtStrategy(
    userId: string,
    debts: any[],
    monthlyIncome: number,
    monthlyExpenses: number,
    strategyType: string,
    tier: SubscriptionTier = 'basic'
  ): Promise<any> {
    // Check rate limit
    const canProceed = await this.checkRateLimit(userId, 'debt_strategies', tier)
    if (!canProceed) {
      throw new Error('Monthly debt strategy limit reached. Upgrade to Premium for unlimited access.')
    }
    
    const data = {
      debts: debts.map(d => ({
        id: d.id,
        balance: d.current_balance,
        rate: d.interest_rate,
        minimum: d.minimum_payment,
        name: d.creditor_name,
      })),
      income: monthlyIncome,
      expenses: monthlyExpenses,
      strategy: strategyType,
    }
    
    // Check cache
    const cacheKey = this.getCacheKey('debt_strategy', data)
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached as string)
      }
    } catch (error) {
      console.error('Cache get error:', error)
      // Continue without cache if Redis fails
    }
    
    // Generate strategy
    const prompt = this.getOptimizedPrompt('debt_strategy', data)
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })
    
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }
    
    const result = JSON.parse(content.text)
    try {
      await redis.setex(cacheKey, CACHE_TTL.debt_strategy, JSON.stringify(result))
    } catch (error) {
      console.error('Cache set error:', error)
      // Continue even if caching fails
    }
    
    return result
  }

  // Get usage stats for a user
  async getUsageStats(userId: string): Promise<any> {
    const month = new Date().toISOString().slice(0, 7)
    const features = ['monthly_insights', 'bill_parsing', 'income_detection', 'debt_strategies']
    
    const stats: any = {}
    for (const feature of features) {
      const key = `ai:usage:${userId}:${feature}:${month}`
      try {
        const value = await redis.get(key)
        stats[feature] = value ? parseInt(value as string, 10) : 0
      } catch (error) {
        console.error('Get usage stats error:', error)
        stats[feature] = 0
      }
    }
    
    return stats
  }
}

// Export singleton instance
export const aiService = AIService.getInstance()
