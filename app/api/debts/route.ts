import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@/lib/supabase/server';
import { DebtService } from '@/lib/services/debtService';
import { Debt } from '@/types/debt';

const debtService = new DebtService();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const debts = await debtService.getDebts(user.id);
    return NextResponse.json(debts);
  } catch (error) {
    console.error('Error fetching debts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const debtData: Omit<Debt, 'id' | 'created_at' | 'updated_at'> = {
      ...body,
      user_id: user.id,
      is_active: true,
    };

    const debt = await debtService.createDebt(debtData);
    return NextResponse.json(debt);
  } catch (error) {
    console.error('Error creating debt:', error);
    return NextResponse.json(
      { error: 'Failed to create debt' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const debtId = searchParams.get('id');

    if (!debtId) {
      return NextResponse.json({ error: 'Debt ID required' }, { status: 400 });
    }

    const body = await request.json();
    const debt = await debtService.updateDebt(debtId, body);
    return NextResponse.json(debt);
  } catch (error) {
    console.error('Error updating debt:', error);
    return NextResponse.json(
      { error: 'Failed to update debt' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const debtId = searchParams.get('id');

    if (!debtId) {
      return NextResponse.json({ error: 'Debt ID required' }, { status: 400 });
    }

    await debtService.deleteDebt(debtId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting debt:', error);
    return NextResponse.json(
      { error: 'Failed to delete debt' },
      { status: 500 }
    );
  }
}
