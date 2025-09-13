import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { aiService } from '@/lib/ai/services/ai-service';
import type { SubscriptionTier } from '@/lib/ai/services/ai-service';

interface DetectedIncome {
  name: string;
  amount: number;
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time';
  category: string;
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
  sourceTransactions: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user subscription tier
    const { data: userProfile } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    
    const tier = (userProfile?.subscription_tier || 'free_trial') as SubscriptionTier;

    // Get transactions from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gt('amount', 0) // Only income/deposits
      .gte('date', sixMonthsAgo.toISOString())
      .order('date', { ascending: true });

    if (transError || !transactions) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Group transactions by similar amounts and descriptions
    const incomePatterns = analyzeIncomePatterns(transactions);

    try {
      // Use centralized AI service for enhancement
      const aiResult = await aiService.detectIncome(user.id, transactions, tier);
      
      // Merge AI results with pattern detection
      const enhancedPatterns = mergeAIResults(incomePatterns, aiResult.patterns || []);

      // Get existing income sources to avoid duplicates
      const { data: existingIncome } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Filter out patterns that already exist
      const newIncomePatterns = filterExistingPatterns(enhancedPatterns, existingIncome || []);

      // Get usage stats
      const usage = await aiService.getUsageStats(user.id);

      return NextResponse.json({
        detectedIncome: newIncomePatterns,
        existingIncome: existingIncome || [],
        analyzedTransactions: transactions.length,
        usage,
        tier
      });
    } catch (aiError: any) {
      if (aiError.message.includes('limit reached')) {
        // If AI limit reached, return basic pattern detection without AI enhancement
        const { data: existingIncome } = await supabase
          .from('income_sources')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const newIncomePatterns = filterExistingPatterns(incomePatterns, existingIncome || []);

        return NextResponse.json({
          detectedIncome: newIncomePatterns,
          existingIncome: existingIncome || [],
          analyzedTransactions: transactions.length,
          aiLimitReached: true,
          tier,
          message: aiError.message
        });
      }
      throw aiError;
    }
  } catch (error) {
    console.error('Error in AI income detection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function analyzeIncomePatterns(transactions: any[]): DetectedIncome[] {
  const patterns: Map<string, DetectedIncome> = new Map();
  
  // Group by similar amounts (within 5% tolerance)
  const amountGroups: Map<number, any[]> = new Map();
  
  transactions.forEach(transaction => {
    const amount = Math.abs(transaction.amount);
    let foundGroup = false;
    
    // Check existing groups
    for (const [groupAmount, groupTransactions] of amountGroups) {
      const tolerance = groupAmount * 0.05;
      if (Math.abs(amount - groupAmount) <= tolerance) {
        groupTransactions.push(transaction);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      amountGroups.set(amount, [transaction]);
    }
  });

  // Analyze each group for patterns
  for (const [baseAmount, groupTransactions] of amountGroups) {
    if (groupTransactions.length < 2) continue; // Need at least 2 occurrences
    
    // Sort by date
    groupTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < groupTransactions.length; i++) {
      const prevDate = new Date(groupTransactions[i - 1].date);
      const currDate = new Date(groupTransactions[i].date);
      const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }
    
    // Determine frequency based on intervals
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const frequency = determineFrequency(avgInterval, intervals);
    
    // Extract common description patterns
    const descriptions = groupTransactions.map(t => t.description?.toLowerCase() || '');
    const commonWords = findCommonWords(descriptions);
    const name = generateIncomeName(commonWords, descriptions[0], frequency);
    
    // Determine category
    const category = determineCategory(descriptions);
    
    // Calculate confidence score
    const confidence = calculateConfidence(intervals, groupTransactions.length);
    
    const pattern: DetectedIncome = {
      name,
      amount: Math.round(baseAmount * 100) / 100,
      frequency,
      category,
      confidence,
      firstSeen: new Date(groupTransactions[0].date),
      lastSeen: new Date(groupTransactions[groupTransactions.length - 1].date),
      occurrences: groupTransactions.length,
      sourceTransactions: groupTransactions.map(t => t.id)
    };
    
    patterns.set(`${baseAmount}-${frequency}`, pattern);
  }
  
  return Array.from(patterns.values());
}

function determineFrequency(avgInterval: number, intervals: number[]): DetectedIncome['frequency'] {
  // Check for consistency
  const stdDev = calculateStdDev(intervals);
  const isConsistent = stdDev < avgInterval * 0.3; // 30% variance threshold
  
  if (!isConsistent && intervals.length < 3) {
    return 'one-time';
  }
  
  // Determine based on average interval
  if (avgInterval >= 5 && avgInterval <= 9) {
    return 'weekly';
  } else if (avgInterval >= 12 && avgInterval <= 16) {
    return 'biweekly';
  } else if (avgInterval >= 28 && avgInterval <= 32) {
    return 'monthly';
  } else if (avgInterval >= 84 && avgInterval <= 96) {
    return 'quarterly';
  } else if (avgInterval >= 350 && avgInterval <= 380) {
    return 'annual';
  } else {
    return 'one-time';
  }
}

function calculateStdDev(numbers: number[]): number {
  const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  return Math.sqrt(avgSquareDiff);
}

function findCommonWords(descriptions: string[]): string[] {
  const wordCounts: Map<string, number> = new Map();
  
  descriptions.forEach(desc => {
    const words = desc.split(/\s+/).filter(w => w.length > 3);
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });
  
  // Return words that appear in at least 50% of descriptions
  const threshold = descriptions.length * 0.5;
  return Array.from(wordCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([word, _]) => word)
    .slice(0, 3);
}

function generateIncomeName(commonWords: string[], firstDesc: string, frequency: string): string {
  if (commonWords.length > 0) {
    // Use common words to create name
    return commonWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  } else {
    // Fallback to frequency-based name
    const freqName = frequency.charAt(0).toUpperCase() + frequency.slice(1);
    return `${freqName} Income`;
  }
}

function determineCategory(descriptions: string[]): string {
  const categories = {
    salary: ['payroll', 'salary', 'wages', 'direct dep', 'dd', 'employer'],
    freelance: ['invoice', 'payment', 'client', 'project', 'consulting'],
    investment: ['dividend', 'interest', 'investment', 'return', 'capital'],
    rental: ['rent', 'rental', 'tenant', 'lease'],
    business: ['revenue', 'sales', 'business', 'customer'],
    other: []
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (category === 'other') continue;
    
    const hasKeyword = descriptions.some(desc => 
      keywords.some(keyword => desc.includes(keyword))
    );
    
    if (hasKeyword) return category;
  }
  
  return 'other';
}

function calculateConfidence(intervals: number[], occurrences: number): number {
  let confidence = 0;
  
  // Base confidence on number of occurrences
  if (occurrences >= 6) confidence += 40;
  else if (occurrences >= 4) confidence += 30;
  else if (occurrences >= 2) confidence += 20;
  
  // Add confidence based on interval consistency
  if (intervals.length > 0) {
    const stdDev = calculateStdDev(intervals);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const consistency = 1 - (stdDev / avgInterval);
    confidence += Math.max(0, consistency * 60);
  }
  
  return Math.min(100, Math.round(confidence));
}

function mergeAIResults(localPatterns: DetectedIncome[], aiPatterns: any[]): DetectedIncome[] {
  // If AI provided patterns, enhance local patterns with AI insights
  if (!aiPatterns || aiPatterns.length === 0) {
    return localPatterns;
  }

  return localPatterns.map(pattern => {
    // Find matching AI pattern by amount and frequency
    const aiMatch = aiPatterns.find((ai: any) => 
      Math.abs(ai.amount - pattern.amount) < pattern.amount * 0.1 &&
      (ai.frequency === pattern.frequency || !ai.frequency)
    );

    if (aiMatch) {
      return {
        ...pattern,
        name: aiMatch.name || pattern.name,
        category: aiMatch.category || pattern.category,
        confidence: aiMatch.confidence || pattern.confidence,
      };
    }

    return pattern;
  });
}

function filterExistingPatterns(patterns: DetectedIncome[], existing: any[]): DetectedIncome[] {
  return patterns.filter(pattern => {
    // Check if similar income source already exists
    return !existing.some(income => {
      const amountMatch = Math.abs(income.amount - pattern.amount) < pattern.amount * 0.1;
      const frequencyMatch = income.frequency === pattern.frequency;
      return amountMatch && frequencyMatch;
    });
  });
}
