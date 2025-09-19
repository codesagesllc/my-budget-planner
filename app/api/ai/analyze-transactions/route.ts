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

  // Group transactions by merchant/description with enhanced similarity matching
  transactions.forEach(transaction => {
    const cleanedName = cleanMerchantName(transaction.description)

    // Skip very short or generic names that won't be useful
    if (cleanedName.length < 3 || /^(payment|transfer|deposit|fee)$/i.test(cleanedName)) {
      return
    }

    // Find existing pattern with similar name (fuzzy matching)
    let matchedKey = cleanedName
    for (const existingKey of patterns.keys()) {
      if (isSimilarMerchant(cleanedName, existingKey)) {
        matchedKey = existingKey
        break
      }
    }

    if (!patterns.has(matchedKey)) {
      patterns.set(matchedKey, {
        merchantName: matchedKey,
        amounts: [],
        dates: [],
        avgAmount: 0,
        confidence: 0,
        isRecurring: false
      })
    }

    const pattern = patterns.get(matchedKey)!
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
  // Remove common suffixes and clean up merchant names for better pattern matching
  return name
    .replace(/\s+\d{4,}$/g, '') // Remove trailing numbers (reference numbers)
    .replace(/\s+[A-Z]{2}$/g, '') // Remove state codes
    .replace(/\*+/g, '') // Remove asterisks
    .replace(/^(TST|SQ|SP|PP|PAYPAL)\s*\*/i, '') // Remove payment processor prefixes
    .replace(/^(DDA|ACH|DEBIT|CREDIT)\s+/i, '') // Remove transaction type prefixes
    .replace(/\s+(POS|ATM|ONLINE|WEB|MOBILE)\s*/i, ' ') // Remove transaction method indicators
    .replace(/\s+#\d+$/g, '') // Remove trailing reference numbers with #
    .replace(/\s+-\s+\d+$/g, '') // Remove trailing dash-number combinations
    .replace(/\s+(PURCHASE|PAYMENT|TRANSFER|DEPOSIT|WITHDRAWAL)\s*/i, ' ') // Remove action words
    .replace(/\s+\d{1,2}\/\d{1,2}\/?\d{0,4}$/g, '') // Remove trailing dates
    .replace(/\s+\d{1,2}\/\d{1,2}$/g, '') // Remove trailing month/day
    .replace(/\s+(AM|PM)$/i, '') // Remove time indicators
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

  // Utilities & Essential Services
  if (nameLower.includes('electric') || nameLower.includes('power') || nameLower.includes('pge') ||
      nameLower.includes('duke energy') || nameLower.includes('edison')) {
    categories.push('electric')
  }
  if (nameLower.includes('gas') && (nameLower.includes('company') || nameLower.includes('corp'))) {
    categories.push('gas')
  }
  if (nameLower.includes('water') || nameLower.includes('sewer') || nameLower.includes('aqua')) {
    categories.push('water')
  }
  if (nameLower.includes('internet') || nameLower.includes('comcast') || nameLower.includes('verizon') ||
      nameLower.includes('att') || nameLower.includes('spectrum') || nameLower.includes('xfinity') ||
      nameLower.includes('cox') || nameLower.includes('optimum') || nameLower.includes('centurylink')) {
    categories.push('internet')
  }
  if (nameLower.includes('phone') || nameLower.includes('mobile') || nameLower.includes('wireless') ||
      nameLower.includes('t-mobile') || nameLower.includes('sprint') || nameLower.includes('cricket')) {
    categories.push('phone')
  }
  if (nameLower.includes('trash') || nameLower.includes('waste') || nameLower.includes('garbage') ||
      nameLower.includes('recycling')) {
    categories.push('utilities')
  }

  // Streaming & Entertainment Services
  if (nameLower.includes('netflix') || nameLower.includes('hulu') || nameLower.includes('disney') ||
      nameLower.includes('hbo') || nameLower.includes('paramount') || nameLower.includes('peacock') ||
      nameLower.includes('amazon prime') || nameLower.includes('apple tv') || nameLower.includes('crunchyroll')) {
    categories.push('streaming')
  }
  if (nameLower.includes('spotify') || nameLower.includes('apple music') || nameLower.includes('pandora') ||
      nameLower.includes('youtube music') || nameLower.includes('tidal')) {
    categories.push('music')
  }
  if (nameLower.includes('youtube') && nameLower.includes('premium')) {
    categories.push('streaming')
  }
  if (nameLower.includes('gaming') || nameLower.includes('xbox') || nameLower.includes('playstation') ||
      nameLower.includes('nintendo') || nameLower.includes('steam') || nameLower.includes('epic games')) {
    categories.push('gaming')
  }

  // Technology & Software Subscriptions
  if (nameLower.includes('adobe') || nameLower.includes('creative cloud')) {
    categories.push('software')
  }
  if (nameLower.includes('microsoft') && (nameLower.includes('365') || nameLower.includes('office'))) {
    categories.push('software')
  }
  if (nameLower.includes('github') || nameLower.includes('gitlab') || nameLower.includes('atlassian') ||
      nameLower.includes('jira') || nameLower.includes('confluence')) {
    categories.push('software')
  }
  if (nameLower.includes('aws') || nameLower.includes('azure') || nameLower.includes('google cloud') ||
      nameLower.includes('digitalocean') || nameLower.includes('linode') || nameLower.includes('heroku')) {
    categories.push('cloud_services')
  }
  if (nameLower.includes('dropbox') || nameLower.includes('google drive') || nameLower.includes('onedrive') ||
      nameLower.includes('icloud')) {
    categories.push('storage')
  }

  // AI & Modern Services
  if (nameLower.includes('openai') || nameLower.includes('chatgpt') || nameLower.includes('gpt')) {
    categories.push('ai_services')
  }
  if (nameLower.includes('anthropic') || nameLower.includes('claude')) {
    categories.push('ai_services')
  }
  if (nameLower.includes('midjourney') || nameLower.includes('dall-e') || nameLower.includes('stability')) {
    categories.push('ai_services')
  }
  if (nameLower.includes('notion') || nameLower.includes('slack') || nameLower.includes('discord') ||
      nameLower.includes('zoom') || nameLower.includes('teams')) {
    categories.push('productivity')
  }

  // Insurance & Financial Services
  if (nameLower.includes('insurance')) {
    if (nameLower.includes('auto') || nameLower.includes('car') || nameLower.includes('geico') ||
        nameLower.includes('progressive') || nameLower.includes('allstate')) {
      categories.push('auto_insurance')
    } else if (nameLower.includes('health') || nameLower.includes('medical')) {
      categories.push('health_insurance')
    } else if (nameLower.includes('home') || nameLower.includes('property')) {
      categories.push('home_insurance')
    } else if (nameLower.includes('life')) {
      categories.push('life_insurance')
    } else {
      categories.push('insurance')
    }
  }

  // Health & Fitness
  if (nameLower.includes('gym') || nameLower.includes('fitness') || nameLower.includes('planet') ||
      nameLower.includes('anytime') || nameLower.includes('equinox') || nameLower.includes('orange') ||
      nameLower.includes('crossfit') || nameLower.includes('ymca')) {
    categories.push('gym')
  }
  if (nameLower.includes('pharmacy') || nameLower.includes('cvs') || nameLower.includes('walgreens') ||
      nameLower.includes('rite aid') || nameLower.includes('medication')) {
    categories.push('medical')
  }
  if (nameLower.includes('doctor') || nameLower.includes('dentist') || nameLower.includes('clinic') ||
      nameLower.includes('hospital') || nameLower.includes('medical')) {
    categories.push('medical')
  }

  // Transportation & Auto
  if (nameLower.includes('uber') || nameLower.includes('lyft') || nameLower.includes('taxi') ||
      nameLower.includes('rideshare')) {
    categories.push('transportation')
  }
  if (nameLower.includes('parking') || nameLower.includes('toll') || nameLower.includes('metro') ||
      nameLower.includes('transit') || nameLower.includes('bus')) {
    categories.push('transportation')
  }
  if (nameLower.includes('auto loan') || nameLower.includes('car loan') || nameLower.includes('vehicle')) {
    categories.push('auto_loan')
  }
  if (nameLower.includes('gas station') || nameLower.includes('shell') || nameLower.includes('exxon') ||
      nameLower.includes('chevron') || nameLower.includes('bp ') || nameLower.includes('mobil')) {
    categories.push('fuel')
  }

  // Housing & Real Estate
  if (nameLower.includes('rent') || nameLower.includes('lease') || nameLower.includes('apartment') ||
      nameLower.includes('property management')) {
    categories.push('rent')
  }
  if (nameLower.includes('mortgage') || nameLower.includes('home loan') || nameLower.includes('wells fargo mortgage')) {
    categories.push('mortgage')
  }
  if (nameLower.includes('hoa') || nameLower.includes('homeowners') || nameLower.includes('condo')) {
    categories.push('hoa')
  }

  // Food & Grocery
  if (nameLower.includes('grocery') || nameLower.includes('market') || nameLower.includes('walmart') ||
      nameLower.includes('target') || nameLower.includes('kroger') || nameLower.includes('safeway') ||
      nameLower.includes('costco') || nameLower.includes('trader joe') || nameLower.includes('whole foods')) {
    categories.push('groceries')
  }
  if (nameLower.includes('restaurant') || nameLower.includes('cafe') || nameLower.includes('coffee') ||
      nameLower.includes('starbucks') || nameLower.includes('dunkin') || nameLower.includes('mcdonald') ||
      nameLower.includes('burger') || nameLower.includes('pizza') || nameLower.includes('food')) {
    categories.push('dining')
  }

  // Financial Services
  if (nameLower.includes('credit card') || nameLower.includes('visa') || nameLower.includes('mastercard') ||
      nameLower.includes('amex') || nameLower.includes('discover')) {
    categories.push('credit_card')
  }
  if (nameLower.includes('loan') && !nameLower.includes('auto') && !nameLower.includes('home')) {
    categories.push('loan')
  }
  if (nameLower.includes('bank fee') || nameLower.includes('overdraft') || nameLower.includes('maintenance')) {
    categories.push('banking')
  }

  // Education & Learning
  if (nameLower.includes('university') || nameLower.includes('college') || nameLower.includes('tuition') ||
      nameLower.includes('school')) {
    categories.push('education')
  }
  if (nameLower.includes('coursera') || nameLower.includes('udemy') || nameLower.includes('masterclass') ||
      nameLower.includes('skillshare') || nameLower.includes('pluralsight')) {
    categories.push('online_learning')
  }

  // Shopping & Retail
  if (nameLower.includes('amazon') && !nameLower.includes('prime') && !nameLower.includes('aws')) {
    categories.push('shopping')
  }
  if (nameLower.includes('clothing') || nameLower.includes('fashion') || nameLower.includes('apparel')) {
    categories.push('clothing')
  }

  // Enhanced categorization based on amount patterns
  if (categories.length === 0) {
    // Use more sophisticated categorization for uncategorized items
    if (amount < 15) {
      categories.push('subscription') // Likely a small recurring service
    } else if (amount >= 15 && amount < 50) {
      if (nameLower.includes('*') || nameLower.includes('recurring')) {
        categories.push('subscription')
      } else {
        categories.push('services')
      }
    } else if (amount >= 50 && amount < 200) {
      if (nameLower.includes('monthly') || nameLower.includes('bill')) {
        categories.push('utilities')
      } else {
        categories.push('services')
      }
    } else if (amount >= 200 && amount < 1000) {
      categories.push('major_expense')
    } else {
      categories.push('large_payment')
    }
  }

  // Always add 'subscription' tag for recurring small amounts
  if (amount < 30 && categories.length > 0 && !categories.includes('subscription')) {
    categories.push('subscription')
  }

  // Remove duplicates and return
  return [...new Set(categories)]
}

// Helper function to detect similar merchant names
function isSimilarMerchant(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase()
  const n2 = name2.toLowerCase()

  // Exact match
  if (n1 === n2) return true

  // One contains the other (length threshold to avoid very short matches)
  if (Math.min(n1.length, n2.length) >= 5) {
    if (n1.includes(n2) || n2.includes(n1)) return true
  }

  // Similar start (useful for merchants like "Netflix Inc" vs "Netflix")
  if (Math.min(n1.length, n2.length) >= 4) {
    const shorter = n1.length < n2.length ? n1 : n2
    const longer = n1.length < n2.length ? n2 : n1
    if (longer.startsWith(shorter)) return true
  }

  // Calculate simple similarity score for close matches
  const similarity = calculateSimilarity(n1, n2)
  return similarity > 0.8 && Math.min(n1.length, n2.length) >= 6
}

// Simple string similarity calculation (Jaro-Winkler-like)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(str1, str2)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}
