'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, Star, Brain, Zap, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AI_LIMITS } from '@/lib/constants/ai-limits'

interface PricingPlan {
  id: string
  name: string
  description: string
  price: number
  priceId: string
  productId: string
  features: string[]
  aiFeatures?: {
    insights: string
    billParsing: string
    incomeDetection: string
    debtStrategies: string
  }
  notIncluded?: string[]
  recommended?: boolean
  buttonText: string
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    description: '14 days to explore all features with limited AI usage',
    price: 0,
    priceId: 'price_1S5vLs4GH1CShai7ilGkxOFu',
    productId: 'prod_T1zKL0XrgbEP99',
    buttonText: 'Start Free Trial',
    features: [
      'Connect up to 2 bank accounts',
      'Basic budget tracking',
      'Bill import and management',
      'Transaction categorization',
      'Monthly spending reports',
      'Email support',
      `${AI_LIMITS.free_trial.monthly_insights} AI insights per month`,
      `${AI_LIMITS.free_trial.bill_parsing} bill upload analyses per month`,
      `${AI_LIMITS.free_trial.income_detection} income detection scans per month`,
      `${AI_LIMITS.free_trial.debt_strategies} debt strategy calculation per month`
    ],
    aiFeatures: {
      insights: `${AI_LIMITS.free_trial.monthly_insights} AI insights/month`,
      billParsing: `${AI_LIMITS.free_trial.bill_parsing} bill uploads/month`,
      incomeDetection: `${AI_LIMITS.free_trial.income_detection} income scans/month`,
      debtStrategies: `${AI_LIMITS.free_trial.debt_strategies} debt strategy/month`,
    },
    notIncluded: [
      'Unlimited AI features',
      'Advanced forecasting',
      'Unlimited bank accounts',
      'Priority support'
    ]
  },
  {
    id: 'basic',
    name: 'PocketWiseAI Membership',
    description: 'Perfect for personal finance management with standard AI limits',
    price: 15,
    priceId: 'price_1S5vMd4GH1CShai7PaB4XeoJ',
    productId: 'prod_T1zLI2Fe0hQMsD',
    buttonText: 'Get Started',
    recommended: true,
    features: [
      'Everything in Free Trial',
      'Connect up to 5 bank accounts',
      'Custom budget categories',
      'Savings goal tracking',
      'Quarterly financial reports',
      'Advanced bill reminders',
      'Priority email support',
      `${AI_LIMITS.basic.monthly_insights} AI-powered insights per month`,
      `${AI_LIMITS.basic.bill_parsing} bill parsing uploads per month`,
      `${AI_LIMITS.basic.income_detection} income detection analyses per month`,
      `${AI_LIMITS.basic.debt_strategies} debt optimization strategies per month`,
      'AI responses cached for 24 hours',
      'Standard batch processing (2-3 second response time)'
    ],
    aiFeatures: {
      insights: `${AI_LIMITS.basic.monthly_insights} AI insights/month`,
      billParsing: `${AI_LIMITS.basic.bill_parsing} bill uploads/month`,
      incomeDetection: `${AI_LIMITS.basic.income_detection} income scans/month`,
      debtStrategies: `${AI_LIMITS.basic.debt_strategies} debt strategies/month`,
    },
    notIncluded: [
      'Unlimited AI calls',
      'Investment tracking',
      'Tax optimization suggestions',
      'Phone support'
    ]
  },
  {
    id: 'premium',
    name: 'Premium Membership',
    description: 'Complete financial management suite with unlimited AI features & priority processing',
    price: 30,
    priceId: 'price_1S5vNP4GH1CShai7nzkQsFQD',
    productId: 'prod_T1zMympLOq0Dk6',
    buttonText: 'Go Premium',
    features: [
      'Everything in Basic',
      'Unlimited bank accounts',
      'Investment portfolio tracking',
      'Tax optimization suggestions',
      'Custom financial reports',
      'API access',
      'White-glove onboarding',
      'Priority phone & email support',
      'Early access to new features',
      '✨ UNLIMITED AI-powered insights',
      '✨ UNLIMITED bill parsing & analysis',
      '✨ UNLIMITED income detection',
      '✨ UNLIMITED debt strategies',
      '⚡ Priority AI processing (instant responses)',
      '⚡ No batch processing delays',
      '💾 Extended 24-hour AI response caching',
      '🚀 First in queue for all AI features'
    ],
    aiFeatures: {
      insights: 'Unlimited AI insights with priority processing',
      billParsing: 'Unlimited bill parsing with instant analysis',
      incomeDetection: 'Unlimited income detection & analysis',
      debtStrategies: 'Unlimited debt optimization strategies',
    }
  }
]

export default function PricingComponent() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [emailError, setEmailError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...')
      // Check if user is logged in
      const { data: { user: authUser } } = await supabase.auth.getUser()
      console.log('Auth user:', authUser ? 'Found' : 'Not found')

      if (authUser) {
        setUser(authUser)
        console.log('User set:', authUser.email)

        // Check if user has used free trial
        const { data, error } = await supabase
          .from('users')
          .select('free_trial_used, subscription_status, subscription_tier, stripe_customer_id')
          .eq('id', authUser.id)
          .single()

        console.log('User data from DB:', data)

        if (data?.free_trial_used) {
          setHasUsedFreeTrial(true)
          console.log('User has used free trial')
        }

        // If user already has an active subscription, show current plan
        if (data?.subscription_status === 'active' || data?.subscription_status === 'trialing') {
          // User already has a subscription, they might want to upgrade/downgrade
          console.log('User has active subscription:', data.subscription_tier)
        }
      } else {
        console.log('No authenticated user found')
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
    } finally {
      setCheckingAuth(false)
      console.log('Auth check completed')
    }
  }

  const handlePlanSelection = async (plan: PricingPlan) => {
    setSelectedPlan(plan.id)
    setLoading(true)
    setEmailError('')

    try {
      // Check if user is trying to select free trial but has already used it
      if (plan.id === 'free_trial' && hasUsedFreeTrial) {
        alert('You have already used your free trial. Please select a paid plan.')
        return
      }

      if (user) {
        // User is logged in
        console.log('User is logged in, processing plan:', plan.id)
        if (plan.id === 'free_trial') {
          // Activate free trial immediately
          console.log('Activating free trial for user:', user.id)
          await activateFreeTrial(user.id)
        } else {
          // Create Stripe checkout session for logged-in user
          console.log('Creating checkout session for logged-in user:', plan.id)
          await createCheckoutSession(plan, user.email!)
        }
      } else {
        // User not logged in
        console.log('User not logged in, processing plan:', plan.id)
        if (plan.id === 'free_trial') {
          // For free trial, redirect to signup
          console.log('Redirecting to signup for free trial')
          localStorage.setItem('selectedPlan', JSON.stringify({
            planId: plan.id,
            priceId: plan.priceId,
            productId: plan.productId,
            name: plan.name,
            price: plan.price
          }))
          router.push('/signup?plan=' + plan.id)
        } else {
          // For paid plans, show email prompt to create checkout session
          console.log('Showing email prompt for paid plan')
          setShowEmailPrompt(true)
        }
      }
    } catch (error) {
      console.error('Error selecting plan:', error)
      alert('An error occurred. Please try again.')
    } finally {
      // Always reset loading state
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setEmailError('')

    const plan = pricingPlans.find(p => p.id === selectedPlan)
    if (!plan) return

    try {
      // Check if email has already used free trial (for paid plans)
      const { data: existingUser } = await supabase
        .from('users')
        .select('free_trial_used')
        .eq('email', email)
        .single()

      // Create checkout session for non-logged-in user
      await createCheckoutSession(plan, email, !user)
    } catch (error) {
      console.error('Error processing email:', error)
      setEmailError('An error occurred. Please try again.')
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

      // Redirect to dashboard
      router.push('/dashboard?welcome=true')
    } catch (error) {
      console.error('Error activating free trial:', error)
      throw error
    }
  }

  const createCheckoutSession = async (plan: PricingPlan, userEmail: string, requireSignup: boolean = false) => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          email: userEmail,
          planName: plan.name,
          requireSignup: requireSignup
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        console.error('Checkout session error:', data.error)
        throw new Error(data.error)
      }
      
      if (data.url) {
        // Store plan info for after successful payment
        if (requireSignup) {
          localStorage.setItem('pending_subscription', JSON.stringify({
            planId: plan.id,
            priceId: plan.priceId,
            productId: plan.productId,
            name: plan.name,
            price: plan.price,
            email: userEmail
          }))
        }
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      // Show a more user-friendly error message
      if (error instanceof Error) {
        alert(`Unable to create checkout session: ${error.message}\n\nPlease check the browser console for more details.`)
      } else {
        alert('An unexpected error occurred. Please try again.')
      }
      throw error
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start with a 14-day free trial or choose the plan that fits your needs
          </p>
          {hasUsedFreeTrial && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-yellow-100 border border-yellow-400 rounded-lg">
              <p className="text-sm text-yellow-800">
                You've already used your free trial. Please select a paid plan to continue.
              </p>
            </div>
          )}
          {user && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Logged in as: <span className="font-semibold">{user.email}</span>
              </p>
            </div>
          )}
        </div>

        {/* AI Features Comparison Banner */}
        <div className="mb-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-8 w-8 mr-3" />
            <h3 className="text-2xl font-bold">AI-Powered Financial Intelligence</h3>
          </div>
          <p className="text-center text-purple-100 mb-6">
            Our AI features use Claude and GPT-3.5 to provide personalized insights and automation
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Zap className="h-6 w-6 mx-auto mb-2" />
              <p className="font-semibold">Smart Caching</p>
              <p className="text-sm text-purple-100">24-hour response caching reduces costs by 50%</p>
            </div>
            <div className="text-center">
              <Shield className="h-6 w-6 mx-auto mb-2" />
              <p className="font-semibold">Batch Processing</p>
              <p className="text-sm text-purple-100">Optimized API calls save 25% on tokens</p>
            </div>
            <div className="text-center">
              <Brain className="h-6 w-6 mx-auto mb-2" />
              <p className="font-semibold">Priority Queue</p>
              <p className="text-sm text-purple-100">Premium users get instant AI processing</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => {
            const isDisabled = plan.id === 'free_trial' && hasUsedFreeTrial
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transition-transform duration-200 ${
                  plan.recommended ? 'ring-2 ring-blue-600 transform scale-105' : ''
                } ${isDisabled ? 'opacity-60' : 'hover:transform hover:scale-105'}`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-bl-lg">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-1 fill-current" />
                      <span className="text-sm font-semibold">RECOMMENDED</span>
                    </div>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  <div className="mb-8">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600">/month</span>
                    {plan.id === 'free_trial' && (
                      <p className="text-sm text-green-600 mt-2">No credit card required</p>
                    )}
                    {plan.id !== 'free_trial' && (
                      <p className="text-sm text-gray-500 mt-2">14-day free trial included</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('Button clicked for plan:', plan.id, 'Loading:', loading, 'Disabled:', isDisabled)
                      if (!loading && !isDisabled) {
                        handlePlanSelection(plan)
                      } else {
                        console.log('Button click blocked - Loading:', loading, 'Disabled:', isDisabled)
                      }
                    }}
                    disabled={loading || isDisabled}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 relative z-10 ${
                      plan.recommended
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                        : isDisabled
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } ${loading && selectedPlan === plan.id ? 'opacity-50 cursor-wait' : ''} ${
                      !loading && !isDisabled ? 'cursor-pointer hover:scale-105' : ''
                    }`}
                  >
                    {loading && selectedPlan === plan.id ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : isDisabled ? (
                      'Trial Already Used'
                    ) : (
                      plan.buttonText
                    )}
                  </button>

                  {/* AI Features Section */}
                  {plan.aiFeatures && (
                    <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
                        <Brain className="h-4 w-4 mr-2" />
                        AI Features:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-start">
                          <Check className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-purple-700">{plan.aiFeatures.insights}</span>
                        </div>
                        <div className="flex items-start">
                          <Check className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-purple-700">{plan.aiFeatures.billParsing}</span>
                        </div>
                        <div className="flex items-start">
                          <Check className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-purple-700">{plan.aiFeatures.incomeDetection}</span>
                        </div>
                        <div className="flex items-start">
                          <Check className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-purple-700">{plan.aiFeatures.debtStrategies}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 space-y-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">What's included:</p>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.notIncluded && plan.notIncluded.length > 0 && (
                      <>
                        <div className="border-t pt-4 mt-4">
                          <p className="text-sm font-semibold text-gray-500 mb-3">Not included:</p>
                        </div>
                        {plan.notIncluded.map((feature, index) => (
                          <div key={index} className="flex items-start opacity-50">
                            <X className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-500 text-sm line-through">{feature}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            All plans include 256-bit SSL encryption, 99.9% uptime guarantee, and GDPR compliance
          </p>
          <p className="text-sm text-gray-500">
            Questions? Contact us at help-desk@codesages.net
          </p>
        </div>
      </div>

      {/* Email Prompt Modal */}
      {showEmailPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Enter Your Email</h3>
            <p className="text-gray-600 mb-4">
              We'll use this email to create your account after payment.
            </p>
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
              />
              {emailError && (
                <p className="text-red-500 text-sm mb-2">{emailError}</p>
              )}
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : (
                    'Continue to Payment'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailPrompt(false)
                    setSelectedPlan(null)
                    setEmail('')
                    setEmailError('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500 mt-4">
              You'll be redirected to Stripe's secure checkout. After payment, you'll create your account.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
