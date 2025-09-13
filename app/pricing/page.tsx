// app/pricing/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { Check, X, Crown, Zap, Shield } from 'lucide-react'
import { toast } from 'sonner'

const plans = [
  {
    name: 'Free Trial',
    price: 0,
    period: '14 days premium, then free',
    description: '14 days of premium features, then limited free access',
    features: [
      '✨ First 14 days: All Premium features',
      '📊 After trial: 3 AI insights/month',
      '📄 After trial: 5 bill uploads/month',
      '💰 After trial: 3 income detections/month',
      '📈 After trial: 1 debt strategy/month',
      '💳 After trial: 500 transaction limit',
      '🏦 After trial: 2 account connections',
      '📧 Basic email support',
    ],
    limitations: [
      'No data export after trial',
      'No API access after trial',
      'Limited analytics after trial',
      'No team features',
    ],
    buttonText: 'Start Free Trial',
    buttonDisabled: false,
    tier: 'free_trial',
  },
  {
    name: 'Basic',
    price: 9.99,
    period: 'per month',
    description: 'Great for personal finance management',
    features: [
      '20 AI insights per month',
      '20 bill parsing uploads',
      '10 income detections',
      '5 debt strategies',
      '5,000 transaction limit',
      '10 account connections',
      'CSV & Excel export',
      'Email support',
      'Advanced analytics',
      'Custom categories',
      'Recurring detection',
      'Budget forecasting',
    ],
    limitations: [
      'No API access',
      'No team features',
      'No priority support',
    ],
    buttonText: 'Upgrade to Basic',
    buttonDisabled: false,
    tier: 'basic',
    popular: true,
  },
  {
    name: 'Premium',
    price: 29.99,
    period: 'per month',
    description: 'For power users and small businesses',
    features: [
      'Unlimited AI insights',
      'Unlimited bill parsing',
      'Unlimited income detection',
      'Unlimited debt strategies',
      'Unlimited transactions',
      'Unlimited accounts',
      'All export formats',
      'Priority support',
      'API access',
      'Advanced analytics',
      'Team collaboration',
      'Custom categories',
      'Dashboard customization',
      'White-label reports',
    ],
    limitations: [],
    buttonText: 'Upgrade to Premium',
    buttonDisabled: false,
    tier: 'premium',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { role } = useRolePermissions()
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (tier: string) => {
    setLoading(tier)
    
    try {
      // Here you would integrate with Stripe or your payment processor
      // For now, we'll simulate the upgrade process
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      if (response.ok) {
        toast.success(`Successfully upgraded to ${tier}!`)
        router.push('/dashboard')
      } else {
        toast.error('Failed to upgrade. Please try again.')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('An error occurred during upgrade.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock powerful AI features and take control of your finances with our flexible pricing plans
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-105 ${
                plan.popular ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-bl-lg">
                  <span className="text-sm font-semibold flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="p-8 pb-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  {plan.tier === 'premium' && <Crown className="w-8 h-8 text-purple-500" />}
                  {plan.tier === 'basic' && <Zap className="w-8 h-8 text-blue-500" />}
                  {plan.tier === 'free_trial' && <Shield className="w-8 h-8 text-gray-500" />}
                </div>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>
                
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                {/* Current Plan Indicator */}
                {role === plan.tier && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium inline-block mb-4">
                    Current Plan
                  </div>
                )}
              </div>

              {/* Features List */}
              <div className="p-8 pt-4">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <ul className="space-y-2 mb-6 opacity-60">
                    {plan.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-start">
                        <X className="w-4 h-4 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-500 text-sm line-through">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Action Button */}
                <button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={plan.buttonDisabled || role === plan.tier || loading !== null}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.buttonDisabled || role === plan.tier
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gray-800 text-white hover:bg-gray-900'
                  }`}
                >
                  {loading === plan.tier ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Processing...
                    </span>
                  ) : role === plan.tier ? (
                    'Current Plan'
                  ) : (
                    plan.buttonText
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mt-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Feature Comparison
          </h2>
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Free Trial</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Basic</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">AI Insights</td>
                  <td className="px-6 py-4 text-center text-sm">3/month</td>
                  <td className="px-6 py-4 text-center text-sm">20/month</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">Bill Parsing</td>
                  <td className="px-6 py-4 text-center text-sm">5/month</td>
                  <td className="px-6 py-4 text-center text-sm">20/month</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">Transactions</td>
                  <td className="px-6 py-4 text-center text-sm">500</td>
                  <td className="px-6 py-4 text-center text-sm">5,000</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">Account Connections</td>
                  <td className="px-6 py-4 text-center text-sm">2</td>
                  <td className="px-6 py-4 text-center text-sm">10</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">Data Export</td>
                  <td className="px-6 py-4 text-center text-sm"><X className="w-4 h-4 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">Priority Support</td>
                  <td className="px-6 py-4 text-center text-sm"><X className="w-4 h-4 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm"><X className="w-4 h-4 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">API Access</td>
                  <td className="px-6 py-4 text-center text-sm"><X className="w-4 h-4 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm"><X className="w-4 h-4 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">Price</td>
                  <td className="px-6 py-4 text-center text-sm font-bold">$0</td>
                  <td className="px-6 py-4 text-center text-sm font-bold">$9.99/mo</td>
                  <td className="px-6 py-4 text-center text-sm font-bold">$29.99/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-gray-600 mt-4">
            🌟 <strong>Note:</strong> Free Trial users get 14 days of full Premium access before transitioning to limited free tier
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any payments.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, debit cards, and PayPal through our secure payment processor, Stripe.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                How does the free trial work?
              </h3>
              <p className="text-gray-600">
                New users get 14 days of full Premium access - unlimited AI insights, bill parsing, and all premium features! After 14 days, you'll continue with limited free access (3 AI insights/month, 5 bill uploads, etc.) unless you upgrade to a paid plan.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens when I reach my limits?
              </h3>
              <p className="text-gray-600">
                When you reach your plan limits, you'll be prompted to upgrade. Your data is always safe, and you can continue using basic features.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-12">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}