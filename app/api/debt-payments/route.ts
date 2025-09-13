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

    // Get payment data from request body
    const body = await request.json();
    const {
      debt_id,
      payment_date,
      amount,
      principal_amount,
      interest_amount,
      remaining_balance,
      notes,
      is_extra_payment
    } = body;

    // Validate required fields
    if (!debt_id || !payment_date || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Record the payment
    const { data: payment, error: paymentError } = await supabase
      .from('debt_payments')
      .insert({
        debt_id,
        user_id: user.id,
        payment_date,
        amount,
        principal_amount: principal_amount || null,
        interest_amount: interest_amount || null,
        remaining_balance: remaining_balance || null,
        notes: notes || null,
        is_extra_payment: is_extra_payment || false
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      );
    }

    // Update the debt's current balance
    const { error: updateError } = await supabase
      .from('debts')
      .update({ 
        current_balance: remaining_balance,
        updated_at: new Date().toISOString()
      })
      .eq('id', debt_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating debt balance:', updateError);
      // Note: Payment was recorded but balance update failed
      // You might want to handle this differently
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error in debt payments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get debt_id from query params if provided
    const { searchParams } = new URL(request.url);
    const debtId = searchParams.get('debt_id');

    let query = supabase
      .from('debt_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('payment_date', { ascending: false });

    if (debtId) {
      query = query.eq('debt_id', debtId);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    return NextResponse.json(payments || []);
  } catch (error) {
    console.error('Error in debt payments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get payment ID from query params
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
        { status: 400 }
      );
    }

    // Delete the payment
    const { error } = await supabase
      .from('debt_payments')
      .delete()
      .eq('id', paymentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting payment:', error);
      return NextResponse.json(
        { error: 'Failed to delete payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in debt payments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
