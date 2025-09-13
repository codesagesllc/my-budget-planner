import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transactionId, incomeSourceId } = body;

    // Validate required fields
    if (!transactionId || !incomeSourceId) {
      return NextResponse.json(
        { error: 'Transaction ID and Income Source ID required' },
        { status: 400 }
      );
    }

    // Get the transaction and income source
    const [transactionResult, incomeResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('income_sources')
        .select('*')
        .eq('id', incomeSourceId)
        .eq('user_id', user.id)
        .single()
    ]);

    if (transactionResult.error || incomeResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }

    const transaction = transactionResult.data;
    const incomeSource = incomeResult.data;

    // Update the transaction to mark it as reconciled with the income source
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        category: 'income',
        subcategory: incomeSource.category,
        transaction_type: 'income',
        // Store the income source ID in categories array for tracking
        categories: [incomeSource.id]
      })
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to reconcile transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Transaction reconciled with income source'
    });
  } catch (error) {
    console.error('Error in income reconciliation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Auto-reconcile transactions with income sources
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unreconciled income transactions and income sources
    const [transactionsResult, incomeSourcesResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gt('amount', 0) // Positive amounts (deposits)
        .or('transaction_type.eq.income,transaction_type.is.null')
        .order('date', { ascending: false })
        .limit(100),
      supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
    ]);

    if (transactionsResult.error || incomeSourcesResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }

    const transactions = transactionsResult.data || [];
    const incomeSources = incomeSourcesResult.data || [];

    // Find potential matches
    const potentialMatches = [];
    
    for (const transaction of transactions) {
      // Skip if already marked as income with a source
      if (transaction.categories?.length > 0) continue;
      
      const transactionAmount = Math.abs(transaction.amount);
      const transactionDate = new Date(transaction.date);
      
      for (const incomeSource of incomeSources) {
        let expectedAmount = incomeSource.amount;
        
        // Calculate expected amount based on frequency
        if (incomeSource.frequency === 'biweekly') {
          // Could be a biweekly payment
          expectedAmount = incomeSource.amount;
        } else if (incomeSource.frequency === 'monthly') {
          // Monthly payment
          expectedAmount = incomeSource.amount;
        } else if (incomeSource.frequency === 'weekly') {
          // Weekly payment
          expectedAmount = incomeSource.amount;
        }
        
        // Check if amounts match (within 5% tolerance for taxes/deductions)
        const tolerance = expectedAmount * 0.05;
        const minAmount = expectedAmount - tolerance;
        const maxAmount = expectedAmount + tolerance;
        
        if (transactionAmount >= minAmount && transactionAmount <= maxAmount) {
          // Check if description contains hints
          const description = transaction.description.toLowerCase();
          const incomeName = incomeSource.name.toLowerCase();
          
          // Calculate confidence score
          let confidence = 0;
          
          // Amount match
          if (Math.abs(transactionAmount - expectedAmount) < 1) {
            confidence += 50; // Exact match
          } else {
            confidence += 30; // Close match
          }
          
          // Description match
          if (description.includes('payroll') || description.includes('salary') || 
              description.includes('direct dep') || description.includes('dd')) {
            confidence += 20;
          }
          
          // Name match
          const nameWords = incomeName.split(' ');
          for (const word of nameWords) {
            if (word.length > 3 && description.includes(word)) {
              confidence += 10;
            }
          }
          
          // Date match for recurring income
          if (incomeSource.frequency !== 'one-time') {
            // Check if transaction date aligns with expected payment schedule
            if (incomeSource.start_date) {
              const startDate = new Date(incomeSource.start_date);
              const daysDiff = Math.abs(transactionDate.getDate() - startDate.getDate());
              if (daysDiff <= 3) {
                confidence += 20;
              }
            }
          }
          
          if (confidence >= 50) {
            potentialMatches.push({
              transaction,
              incomeSource,
              confidence,
              suggestedAction: confidence >= 70 ? 'auto-match' : 'review'
            });
          }
        }
      }
    }

    return NextResponse.json({
      potentialMatches,
      unreconciled: {
        transactions: transactions.filter(t => !t.categories?.length),
        incomeSources
      }
    });
  } catch (error) {
    console.error('Error in income reconciliation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
