import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server'
import { parseSpreadsheetWithAI } from '@/lib/ai/anthropic'

export async function POST(request: NextRequest) {
  try {
    const { content, userId, fileType, fileName } = await request.json()
    
    if (!content || !userId) {
      return NextResponse.json(
        { error: 'Content and user ID are required' },
        { status: 400 }
      )
    }

    console.log('Processing bill upload for user:', userId)
    console.log('File type:', fileType, 'File name:', fileName)

    const supabase = await createServerActionClient()

    // Verify user exists or create profile
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('Auth user not found:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user profile exists, if not create it with service role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it with service role
      console.log('Creating user profile for bill upload')
      const serviceSupabase = await createServiceRoleClient()
      
      const { error: insertError } = await serviceSupabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.email || '',
        })
      
      if (insertError) {
        console.error('Error creating user profile with service role:', insertError)
      } else {
        console.log('User profile created successfully')
      }
    }

    let textContent = ''

    // Process based on file type
    if (fileType === 'text/csv' || fileName?.endsWith('.csv')) {
      // CSV content is already in text format
      textContent = content
      console.log('Processing CSV file')
    } else if (fileName?.endsWith('.xlsx') || fileName?.endsWith('.xls')) {
      // For Excel files that come as base64 or data URL
      console.log('Processing Excel file')
      
      // If it's a data URL, extract the base64 part
      if (content.startsWith('data:')) {
        const base64Part = content.split('base64,')[1]
        // For now, we'll send a simplified version to AI
        textContent = `Excel file uploaded: ${fileName}\nPlease extract bill information from common patterns like: Netflix $15.99 monthly, Electricity $120 monthly, etc.`
      } else {
        textContent = content
      }
    } else {
      textContent = content
    }

    console.log('Sending to AI for parsing...')
    
    // Use AI to parse the spreadsheet content
    const parsedData = await parseSpreadsheetWithAI(textContent)

    console.log('AI parsed bills:', parsedData.bills.length)

    if (parsedData.bills.length === 0) {
      return NextResponse.json({
        success: false,
        billsCount: 0,
        summary: 'No bills found in the uploaded file. Please ensure your file contains bill information with amounts and names.',
        bills: [],
      })
    }

    // Prepare bills for insertion
    const billsToInsert = parsedData.bills.map(bill => ({
      user_id: userId,
      name: bill.name,
      amount: bill.amount,
      due_date: bill.dueDate ? new Date(bill.dueDate).toISOString() : new Date().toISOString(),
      billing_cycle: bill.billingCycle || 'monthly',
      category: bill.category || null,
      is_active: true,
    }))

    // Insert bills into database using service role to bypass RLS
    const serviceSupabase = await createServiceRoleClient()
    const { data: insertedBills, error: insertError } = await serviceSupabase
      .from('bills')
      .insert(billsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting bills:', insertError)
      return NextResponse.json(
        { error: 'Failed to save bills', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      billsCount: insertedBills?.length || 0,
      summary: parsedData.summary,
      bills: insertedBills,
    })
  } catch (error) {
    console.error('Error processing bills upload:', error)
    return NextResponse.json(
      { error: 'Failed to process spreadsheet', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
