import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get confirmation from request body
    const body = await request.json()
    const { confirmation } = body

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json({
        error: 'Invalid confirmation. Please type "DELETE MY ACCOUNT" to confirm.'
      }, { status: 400 })
    }

    console.log(`🗑️ Starting account deletion for user ${user.id}`)

    // Delete user data in order (respecting foreign key constraints)
    // The database schema should have cascading deletes set up, but we'll be explicit

    // 1. Delete transactions
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)

    if (transactionsError) {
      console.error('Error deleting transactions:', transactionsError)
      throw new Error('Failed to delete transactions')
    }

    // 2. Delete accounts (will cascade to related data)
    const { error: accountsError } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', user.id)

    if (accountsError) {
      console.error('Error deleting accounts:', accountsError)
      throw new Error('Failed to delete accounts')
    }

    // 3. Delete bills
    const { error: billsError } = await supabase
      .from('bills')
      .delete()
      .eq('user_id', user.id)

    if (billsError) {
      console.error('Error deleting bills:', billsError)
      throw new Error('Failed to delete bills')
    }

    // 4. Delete income sources
    const { error: incomeError } = await supabase
      .from('income_sources')
      .delete()
      .eq('user_id', user.id)

    if (incomeError) {
      console.error('Error deleting income sources:', incomeError)
      throw new Error('Failed to delete income sources')
    }

    // 5. Delete plaid items
    const { error: plaidError } = await supabase
      .from('plaid_items')
      .delete()
      .eq('user_id', user.id)

    if (plaidError) {
      console.error('Error deleting plaid items:', plaidError)
      throw new Error('Failed to delete plaid items')
    }

    // 6. Delete debts
    const { error: debtsError } = await supabase
      .from('debts')
      .delete()
      .eq('user_id', user.id)

    if (debtsError) {
      console.error('Error deleting debts:', debtsError)
      // Don't fail if debts table doesn't exist or error
    }

    // 7. Delete savings goals
    const { error: savingsError } = await supabase
      .from('savings_goals')
      .delete()
      .eq('user_id', user.id)

    if (savingsError) {
      console.error('Error deleting savings goals:', savingsError)
      // Don't fail if table doesn't exist
    }

    // 8. Delete category budgets
    const { error: budgetsError } = await supabase
      .from('category_budgets')
      .delete()
      .eq('user_id', user.id)

    if (budgetsError) {
      console.error('Error deleting category budgets:', budgetsError)
      // Don't fail if table doesn't exist
    }

    // 9. Delete spending limits
    const { error: limitsError } = await supabase
      .from('spending_limits')
      .delete()
      .eq('user_id', user.id)

    if (limitsError) {
      console.error('Error deleting spending limits:', limitsError)
      // Don't fail if table doesn't exist
    }

    // 10. Delete user record
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (userDeleteError) {
      console.error('Error deleting user record:', userDeleteError)
      throw new Error('Failed to delete user record')
    }

    // 11. Delete auth user (this will sign them out)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      // If we can't delete the auth user, at least sign them out
      await supabase.auth.signOut()
      throw new Error('Failed to delete authentication account')
    }

    console.log(`✅ Successfully deleted account for user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted'
    })

  } catch (error: any) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete account',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
