import { NextResponse } from 'next/server'
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerActionClient()
    const serviceSupabase = await createServiceRoleClient()
    
    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Test database connection with service role
    const { data: tables, error: tablesError } = await serviceSupabase
      .rpc('get_tables', {})
      .single()
    
    // Try to count users
    const { count: userCount, error: userCountError } = await serviceSupabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    // Try to count bills
    const { count: billCount, error: billCountError } = await serviceSupabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
    
    // Check Plaid config
    const plaidConfig = {
      hasClientId: !!process.env.PLAID_CLIENT_ID,
      hasSecret: !!process.env.PLAID_SECRET,
      env: process.env.PLAID_ENV,
      products: process.env.PLAID_PRODUCTS,
    }
    
    // Check Anthropic config
    const anthropicConfig = {
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...',
    }
    
    return NextResponse.json({
      status: 'connected',
      auth: {
        user: user?.email || null,
        userId: user?.id || null,
        authenticated: !!user,
      },
      database: {
        connected: !userCountError,
        userCount: userCount || 0,
        billCount: billCount || 0,
        errors: {
          users: userCountError?.message || null,
          bills: billCountError?.message || null,
        }
      },
      config: {
        supabase: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        plaid: plaidConfig,
        anthropic: anthropicConfig,
      },
      recommendations: {
        database: !userCountError ? '✅ Database connected' : '❌ Run migration in Supabase',
        auth: user ? '✅ User authenticated' : '❌ Sign in required',
        plaid: plaidConfig.hasClientId && plaidConfig.hasSecret ? '✅ Plaid configured' : '❌ Check Plaid credentials',
        anthropic: anthropicConfig.hasApiKey ? '✅ AI configured' : '❌ Add Anthropic API key',
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: {
        fix: 'Check your .env.local file and Supabase configuration'
      }
    }, { status: 500 })
  }
}
