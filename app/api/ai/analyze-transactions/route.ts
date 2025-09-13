import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Transaction } from '@/types/financial'

interface TransactionPattern {
  merchantName: string
  amounts: number[]
  dates: Date[]
  avgAmount: number
  frequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual'
  confidence: number
  isRecurring: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { userId, transactions } = await request.json()
    
    if (!userId || !transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    // Analyze transactions to detect patterns
    const patterns = analyzeTransactionPatterns(transactions)
    
    // Convert patterns to detected bills
    const detectedBills = patterns.map(pattern => ({
      name: pattern.merchantName,
      amount: pattern.avgAmount,
      frequency: pattern.frequency || 'monthly',
      confidence: pattern.confidence,
      categories: categorizeTransaction(pattern.merchantName, pattern.avgAmount),
      lastDate: pattern.dates[pattern.dates.length - 1].toISOString(),
      occurrences: pattern.dates.length,
      transactions: transactions.filter((t: Transaction) => 
        t.description.toLowerCase().includes(pattern.merchantName.toLowerCase())
      ),
      suggestedDueDate: pattern.frequency === 'monthly' ? pattern.dates[0].getDate() : undefined,
      isRecurring: pattern.isRecurring
    }))

    // Sort by confidence and recurrence
    detectedBills.sort((a, b) => {
      if (a.isRecurring !== b.isRecurring) {
        return a.isRecurring ? -1 : 1
      }
      return b.confidence - a.confidence
    })

    return NextResponse.json({ 
      detectedBills,
      summary: {
        totalAnalyzed: transactions.length,
        recurringFound: detectedBills.filter(b => b.isRecurring).length,
        oneTimeFound: detectedBills.filter(b => !b.isRecurring).length
      }
    })
  } catch (error) {
    console.error('Error analyzing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to analyze transactions' },
      { status: 500 }
    )
  }
}

function analyzeTransactionPatterns(transactions: Transaction[]): TransactionPattern[] {
  const patterns = new Map<string, TransactionPattern>()
  
  // Group transactions by merchant/description
  transactions.forEach(transaction => {
    const merchantKey = cleanMerchantName(transaction.description)
    
    if (!patterns.has(merchantKey)) {
      patterns.set(merchantKey, {
        merchantName: merchantKey,
        amounts: [],
        dates: [],
        avgAmount: 0,
        confidence: 0,
        isRecurring: false
      })
    }
    
    const pattern = patterns.get(merchantKey)!
    pattern.amounts.push(Math.abs(transaction.amount))
    pattern.dates.push(new Date(transaction.date))
  })
  
  // Analyze each pattern for recurrence
  const analyzedPatterns: TransactionPattern[] = []
  
  patterns.forEach(pattern => {
    if (pattern.dates.length < 2) {
      // Single transaction - might be one-time payment
      pattern.isRecurring = false
      pattern.confidence = 30
      pattern.avgAmount = pattern.amounts[0]
    } else {
      // Sort dates chronologically
      pattern.dates.sort((a, b) => a.getTime() - b.getTime())
      
      // Calculate average amount
      pattern.avgAmount = pattern.amounts.reduce((a, b) => a + b, 0) / pattern.amounts.length
      
      // Calculate amount variance
      const amountVariance = calculateVariance(pattern.amounts)
      const amountConsistency = amountVariance < (pattern.avgAmount * 0.1) // 10% variance threshold
      
      // Detect frequency
      const { frequency, confidence } = detectFrequency(pattern.dates)
      pattern.frequency = frequency
      
      // Calculate overall confidence
      let overallConfidence = confidence
      
      // Boost confidence for consistent amounts
      if (amountConsistency) {
        overallConfidence = Math.min(100, overallConfidence + 20)
      }
      
      // Boost confidence for more occurrences
      if (pattern.dates.length >= 3) {
        overallConfidence = Math.min(100, overallConfidence + 10)
      }
      if (pattern.dates.length >= 6) {
        overallConfidence = Math.min(100, overallConfidence + 10)
      }
      
      pattern.confidence = Math.round(overallConfidence)
      pattern.isRecurring = frequency !== undefined && confidence > 60
    }
    
    // Filter out low-confidence non-recurring patterns
    if (pattern.confidence > 40 || pattern.isRecurring) {
      analyzedPatterns.push(pattern)
    }
  })
  
  return analyzedPatterns
}

function cleanMerchantName(name: string): string {
  // Remove common suffixes and clean up merchant names
  return name
    .replace(/\s+\d{4,}$/g, '') // Remove trailing numbers
    .replace(/\s+[A-Z]{2}$/g, '') // Remove state codes
    .replace(/\*+/g, '') // Remove asterisks
    .replace(/^(TST|SQ|SP|PP|PAYPAL)\s*\*/i, '') // Remove payment processor prefixes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

function detectFrequency(dates: Date[]): { frequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual', confidence: number } {
  if (dates.length < 2) {
    return { confidence: 0 }
  }
  
  // Calculate intervals between consecutive dates
  const intervals: number[] = []
  for (let i = 1; i < dates.length; i++) {
    const daysDiff = Math.round((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24))
    intervals.push(daysDiff)
  }
  
  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const intervalVariance = calculateVariance(intervals)
  
  // Detect frequency based on average interval
  let frequency: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual' | undefined
  let confidence = 0
  
  if (avgInterval >= 6 && avgInterval <= 8) {
    frequency = 'weekly'
    confidence = intervalVariance < 2 ? 90 : 70
  } else if (avgInterval >= 13 && avgInterval <= 15) {
    frequency = 'biweekly'
    confidence = intervalVariance < 2 ? 90 : 70
  } else if (avgInterval >= 28 && avgInterval <= 32) {
    frequency = 'monthly'
    confidence = intervalVariance < 3 ? 95 : 75
  } else if (avgInterval >= 84 && avgInterval <= 96) {
    frequency = 'quarterly'
    confidence = intervalVariance < 5 ? 85 : 65
  } else if (avgInterval >= 350 && avgInterval <= 380) {
    frequency = 'annual'
    confidence = intervalVariance < 10 ? 80 : 60
  }
  
  // Adjust confidence based on number of occurrences
  if (dates.length >= 3 && confidence > 0) {
    confidence = Math.min(100, confidence + 5)
  }
  if (dates.length >= 6 && confidence > 0) {
    confidence = Math.min(100, confidence + 5)
  }
  
  return { frequency, confidence }
}

function calculateVariance(numbers: number[]): number {
  if (numbers.length < 2) return 0
  
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length)
}

function categorizeTransaction(merchantName: string, amount: number): string[] {
  const categories: string[] = []
  const nameLower = merchantName.toLowerCase()
  
  // Utilities
  if (nameLower.includes('electric') || nameLower.includes('power') || nameLower.includes('utility')) {
    categories.push('Utilities')
  }
  if (nameLower.includes('gas') || nameLower.includes('energy')) {
    categories.push('Utilities')
  }
  if (nameLower.includes('water') || nameLower.includes('sewer')) {
    categories.push('Utilities')
  }
  if (nameLower.includes('internet') || nameLower.includes('comcast') || nameLower.includes('verizon') || nameLower.includes('att')) {
    categories.push('Utilities', 'Technology')
  }
  
  // Streaming & Entertainment
  if (nameLower.includes('netflix') || nameLower.includes('hulu') || nameLower.includes('disney') || 
      nameLower.includes('hbo') || nameLower.includes('paramount') || nameLower.includes('peacock')) {
    categories.push('Streaming', 'Entertainment', 'Subscription')
  }
  if (nameLower.includes('spotify') || nameLower.includes('apple music') || nameLower.includes('pandora')) {
    categories.push('Entertainment', 'Subscription')
  }
  if (nameLower.includes('youtube') || nameLower.includes('twitch')) {
    categories.push('Streaming', 'Entertainment', 'Subscription')
  }
  
  // Technology & Software
  if (nameLower.includes('adobe') || nameLower.includes('microsoft') || nameLower.includes('office')) {
    categories.push('Software', 'Technology', 'Subscription')
  }
  if (nameLower.includes('github') || nameLower.includes('gitlab') || nameLower.includes('atlassian')) {
    categories.push('Software', 'Technology', 'Business')
  }
  if (nameLower.includes('aws') || nameLower.includes('azure') || nameLower.includes('google cloud')) {
    categories.push('Cloud Services', 'Technology', 'Business')
  }
  
  // AI Services
  if (nameLower.includes('openai') || nameLower.includes('chatgpt') || nameLower.includes('gpt')) {
    categories.push('AI Services', 'Technology', 'Subscription')
  }
  if (nameLower.includes('anthropic') || nameLower.includes('claude')) {
    categories.push('AI Services', 'Technology', 'Subscription')
  }
  if (nameLower.includes('midjourney') || nameLower.includes('dall-e')) {
    categories.push('AI Services', 'Technology', 'Subscription')
  }
  
  // Insurance
  if (nameLower.includes('insurance') || nameLower.includes('geico') || nameLower.includes('progressive') || 
      nameLower.includes('allstate') || nameLower.includes('state farm')) {
    categories.push('Insurance')
  }
  
  // Health & Fitness
  if (nameLower.includes('gym') || nameLower.includes('fitness') || nameLower.includes('planet') || 
      nameLower.includes('anytime') || nameLower.includes('equinox')) {
    categories.push('Fitness', 'Health', 'Subscription')
  }
  if (nameLower.includes('pharmacy') || nameLower.includes('cvs') || nameLower.includes('walgreens')) {
    categories.push('Health', 'Medical')
  }
  
  // Transportation
  if (nameLower.includes('uber') || nameLower.includes('lyft') || nameLower.includes('taxi')) {
    categories.push('Transportation')
  }
  if (nameLower.includes('parking') || nameLower.includes('toll')) {
    categories.push('Transportation')
  }
  
  // Housing
  if (nameLower.includes('rent') || nameLower.includes('lease') || nameLower.includes('apartment')) {
    categories.push('Rent', 'Housing')
  }
  if (nameLower.includes('mortgage') || nameLower.includes('home loan')) {
    categories.push('Mortgage', 'Housing')
  }
  
  // Food & Dining
  if (nameLower.includes('grocery') || nameLower.includes('walmart') || nameLower.includes('target') || 
      nameLower.includes('kroger') || nameLower.includes('safeway')) {
    categories.push('Groceries', 'Food & Dining')
  }
  if (nameLower.includes('restaurant') || nameLower.includes('cafe') || nameLower.includes('coffee')) {
    categories.push('Food & Dining')
  }
  
  // Financial
  if (nameLower.includes('bank') || nameLower.includes('credit') || nameLower.includes('chase') || 
      nameLower.includes('capital one') || nameLower.includes('american express')) {
    categories.push('Banking', 'Credit Card')
  }
  if (nameLower.includes('loan') || nameLower.includes('lending')) {
    categories.push('Loan')
  }
  
  // Education
  if (nameLower.includes('university') || nameLower.includes('college') || nameLower.includes('tuition')) {
    categories.push('Education')
  }
  if (nameLower.includes('coursera') || nameLower.includes('udemy') || nameLower.includes('masterclass')) {
    categories.push('Education', 'Subscription')
  }
  
  // If no categories identified, add a generic one based on amount
  if (categories.length === 0) {
    if (amount < 20) {
      categories.push('Subscription')
    } else if (amount < 100) {
      categories.push('Services')
    } else {
      categories.push('Other')
    }
  }
  
  // Remove duplicates
  return [...new Set(categories)]
}
