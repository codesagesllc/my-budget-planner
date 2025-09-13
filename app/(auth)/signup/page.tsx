'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserPlus, Mail, Lock, Loader2, CreditCard, CheckCircle } from 'lucide-react'
import { appConfig } from '@/lib/config/app'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase =  createClient()

  useEffect(() => {
    // Check for payment success
    const paymentSuccessParam = searchParams.get('payment_success')
    const sessionIdParam = searchParams.get('session_id')
    const emailParam = searchParams.get('email')
    const planParam = searchParams.get('plan')
    
    if (paymentSuccessParam === 'true' && sessionIdParam) {
      setPaymentSuccess(true)
      setSessionId(sessionIdParam)
      
      // Pre-fill email if provided
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam))
      }
      
      // Get subscription details from localStorage
      const pendingSubscription = localStorage.getItem('pending_subscription')
      if (pendingSubscription) {
        const subscription = JSON.parse(pendingSubscription)
        setSelectedPlan(subscription)
      }
    } else {
      // Get selected plan from localStorage (for non-payment flow)
      const storedPlan = localStorage.getItem('selectedPlan')
      if (storedPlan) {
        const plan = JSON.parse(storedPlan)
        setSelectedPlan(plan)
      }
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      console.log('Attempting signup for:', email)
      
      // If coming from payment, don't check free trial
      if (!paymentSuccess && selectedPlan?.planId === 'free_trial') {
        const { data: existingUser } = await supabase
          .from('users')
          .select('free_trial_used')
          .eq('email', email)
          .single()
        
        if (existingUser?.free_trial_used) {
          setError('This email has already used the free trial. Please select a paid plan.')
          setLoading(false)
          return
        }
      }
      
      // Use the configured redirect URL
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: appConfig.getAuthRedirectUrl('/auth/callback'),
          data: {
            selected_plan: selectedPlan?.planId,
            price_id: selectedPlan?.priceId,
            product_id: selectedPlan?.productId,
            stripe_session_id: sessionId,
            payment_completed: paymentSuccess
          }
        },
      })

      if (error) {
        console.error('Signup error:', error)
        setError(error.message)
      } else if (data?.user?.identities?.length === 0) {
        setError('This email is already registered. Please sign in instead.')
      } else {
        console.log('Signup successful:', data)
        
        // Check if email confirmation is required
        if (data?.user?.email && !data?.user?.confirmed_at) {
          setMessage('Please check your email to confirm your account. Your subscription will be activated after confirmation.')
          
          // Store subscription info for after email confirmation
          if (data.user.id) {
            if (paymentSuccess && sessionId) {
              localStorage.setItem(`pending_activation_${data.user.id}`, JSON.stringify({
                sessionId,
                planId: selectedPlan?.planId,
                priceId: selectedPlan?.priceId
              }))
            } else if (selectedPlan) {
              localStorage.setItem(`pending_plan_${data.user.id}`, JSON.stringify(selectedPlan))
            }
          }
        } else {
          setMessage('Account created! Redirecting...')
          
          // If no email confirmation needed and user exists
          if (paymentSuccess && data.user) {
            // Payment already completed, just activate subscription
            await activateSubscription(data.user.id, sessionId!)
          } else if (selectedPlan?.planId === 'free_trial' && data.user) {
            // Activate free trial
            await activateFreeTrial(data.user.id)
          } else if (data.user) {
            // Redirect to dashboard
            window.location.href = '/dashboard'
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const activateFreeTrial = async (userId: string) => {
    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 14) // 14 days trial

      const { error } = await supabase
        .from('users')
        .update({
          subscription_status: 'trialing',
          subscription_tier: 'free_trial',
          free_trial_used: true,
          free_trial_start_date: startDate.toISOString(),
          free_trial_end_date: endDate.toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Clear localStorage
      localStorage.removeItem('selectedPlan')
      localStorage.removeItem(`pending_plan_${userId}`)

      // Redirect to dashboard
      window.location.href = '/dashboard?welcome=true'
    } catch (error) {
      console.error('Error activating free trial:', error)
    }
  }

  const activateSubscription = async (userId: string, stripeSessionId: string) => {
    try {
      // Call API to sync subscription status from Stripe
      const response = await fetch('/api/sync-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sessionId: stripeSessionId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to sync subscription')
      }

      // Clear localStorage
      localStorage.removeItem('pending_subscription')
      localStorage.removeItem(`pending_activation_${userId}`)

      // Redirect to dashboard
      window.location.href = '/dashboard?welcome=true&subscription_activated=true'
    } catch (error) {
      console.error('Error activating subscription:', error)
    }
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setMessage(null)
    setGoogleLoading(true)

    try {
      // Store plan selection for OAuth flow
      if (selectedPlan) {
        localStorage.setItem('oauth_selected_plan', JSON.stringify(selectedPlan))
      }
      
      // Store payment success info if coming from payment
      if (paymentSuccess && sessionId) {
        localStorage.setItem('oauth_payment_success', JSON.stringify({
          sessionId,
          planId: selectedPlan?.planId,
          priceId: selectedPlan?.priceId
        }))
      }
      
      // Use the configured redirect URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: appConfig.getAuthRedirectUrl('/auth/callback'),
        },
      })

      if (error) {
        console.error('Google signup error:', error)
        setError(error.message)
        setGoogleLoading(false)
      } else {
        console.log('Google OAuth initiated:', data)
        // The redirect will happen automatically
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Failed to initiate Google signup')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <UserPlus className="h-8 w-8 text-blue-600 mr-2" />
          <h2 className="text-3xl font-bold text-gray-800">
            {paymentSuccess ? 'Complete Your Account' : 'Create Account'}
          </h2>
        </div>
        
        {paymentSuccess && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-green-900 font-semibold">Payment Successful!</p>
                <p className="text-sm text-green-700 mt-1">
                  Now create your account to access your subscription.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {selectedPlan && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-900 font-semibold">
                  {paymentSuccess ? 'Subscription:' : 'Selected Plan:'}
                </p>
                <p className="text-lg text-blue-700">{selectedPlan.name}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">
                  ${selectedPlan.price}
                  <span className="text-sm font-normal">/mo</span>
                </p>
                {selectedPlan.planId === 'free_trial' && (
                  <p className="text-xs text-blue-600">14-day trial</p>
                )}
              </div>
            </div>
            {!paymentSuccess && (
              <Link 
                href="/pricing" 
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Change plan
              </Link>
            )}
          </div>
        )}
        
        {message && (
          <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-md text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Google Sign Up Button */}
        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full mb-4 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {googleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Image
                src="/google.svg"
                alt="Google Logo"
                width={20}
                height={20}
                className="mr-2"
              />
              Continue with Google
            </>
          )}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
          </div>
        </div>
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                disabled={paymentSuccess && !!searchParams.get('email')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : paymentSuccess ? (
              'Complete Registration'
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign in
            </Link>
          </p>
        </div>
        
        {!selectedPlan && !paymentSuccess && (
          <div className="mt-4 text-center">
            <Link 
              href="/pricing" 
              className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              View pricing plans
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
