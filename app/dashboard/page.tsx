import { createServerComponentClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createServerComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch initial data
  const [accountsResult, transactionsResult, billsResult] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50),
    supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('due_date', { ascending: true })
  ])

  return (
    <DashboardClient 
      user={user}
      initialAccounts={accountsResult.data || []}
      initialTransactions={transactionsResult.data || []}
      initialBills={billsResult.data || []}
    />
  )
}