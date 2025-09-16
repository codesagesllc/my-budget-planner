import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { appConfig } from '@/lib/config/app'

// Check if Stripe secret key is configured
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not configured in environment variables')
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any,
    })
  : null

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.')
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { priceId, email, planName, requireSignup } = body
    
    console.log('Checkout session request:', { priceId, email, planName, requireSignup })
    
    if (!priceId || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters: priceId and email are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Create or retrieve Stripe customer
    let customer
    
    try {
      // Check if customer already exists
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      })

      if (customers.data.length > 0) {
        customer = customers.data[0]
        console.log('Found existing customer:', customer.id)
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: email,
          metadata: {
            supabase_user_id: user?.id || 'pending',
            plan_name: planName,
            requires_signup: requireSignup ? 'true' : 'false'
          }
        })
        console.log('Created new customer:', customer.id)
      }
    } catch (stripeError: any) {
      console.error('Stripe customer error:', stripeError)
      return NextResponse.json(
        { error: `Failed to create customer: ${stripeError.message}` },
        { status: 500 }
      )
    }

    // Determine success and cancel URLs based on whether signup is required
    const successUrl = requireSignup 
      ? `${appConfig.app.url}/signup?payment_success=true&session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`
      : `${appConfig.app.url}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`
    
    const cancelUrl = `${appConfig.app.url}/pricing?canceled=true`

    try {
      // Create checkout session
      // Only use customer_email if we don't have a customer ID
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        // Don't include customer_email when customer is specified
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: 14, // 14-day trial for all paid plans
          metadata: {
            supabase_user_id: user?.id || 'pending',
            requires_signup: requireSignup ? 'true' : 'false',
          }
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          supabase_user_id: user?.id || 'pending',
          plan_name: planName,
          requires_signup: requireSignup ? 'true' : 'false',
          email: email
        },
        // Allow promotion codes
        allow_promotion_codes: true,
        // Collect billing address
        billing_address_collection: 'required',
      }

      const session = await stripe.checkout.sessions.create(sessionConfig)

      console.log('Checkout session created:', session.id)

      // Update user record with Stripe customer ID if user exists
      if (user?.id && customer.id) {
        await supabase
          .from('users')
          .update({ 
            stripe_customer_id: customer.id as string
          })
          .eq('id', user.id)
      }

      return NextResponse.json({ url: session.url })
    } catch (stripeError: any) {
      console.error('Stripe session error:', stripeError)
      return NextResponse.json(
        { error: `Failed to create checkout session: ${stripeError.message}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Unexpected error in checkout session:', error)
    return NextResponse.json(
      { error: `Server error: ${error.message || 'Unknown error occurred'}` },
      { status: 500 }
    )
  }
}
