'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { DollarSign, Brain, Shield, TrendingUp, Upload, Link as LinkIcon } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is authenticated and redirect to dashboard
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      }
    }
    
    checkAuth()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">PocketWiseAI</span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/pricing"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/pricing"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Your AI-Powered
            <span className="text-blue-600"> Financial Assistant</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Take control of your finances with intelligent budgeting, automated bill tracking, 
            and personalized insights powered by advanced AI technology.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/pricing"
              className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-medium transition duration-200"
            >
              Start 14-Day Free Trial
            </Link>
            <Link
              href="/login"
              className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-3 rounded-lg text-lg font-medium border border-blue-600 transition duration-200"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required for free trial
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Master Your Money
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our comprehensive suite of tools helps you track, analyze, and optimize your finances
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <LinkIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Bank Integration</h3>
              <p className="text-gray-600">
                Securely connect all your bank accounts and credit cards with Plaid for automatic transaction syncing
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Bill Import</h3>
              <p className="text-gray-600">
                Upload any spreadsheet and our AI will automatically extract and organize your recurring bills
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Insights</h3>
              <p className="text-gray-600">
                Get personalized financial advice and savings strategies powered by Anthropic's Claude AI
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center p-6">
              <div className="bg-yellow-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Budget Tracking</h3>
              <p className="text-gray-600">
                Monitor spending patterns, set budgets, and track progress toward your financial goals
              </p>
            </div>

            {/* Feature 5 */}
            <div className="text-center p-6">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
              <p className="text-gray-600">
                Your data is protected with enterprise-grade encryption and row-level security in Supabase
              </p>
            </div>

            {/* Feature 6 */}
            <div className="text-center p-6">
              <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Savings Goals</h3>
              <p className="text-gray-600">
                Set financial goals and receive AI-powered strategies to achieve them faster
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-semibold text-lg mb-2">Free Trial</h3>
              <p className="text-3xl font-bold mb-2">$0<span className="text-sm font-normal tex-blue-500">/14 days</span></p>
              <p className="text-gray-600 text-sm">Perfect to explore all features</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-600">
              <h3 className="font-semibold text-lg mb-2">Basic</h3>
              <p className="text-3xl font-bold mb-2">$15<span className="text-sm font-normal text-blue-500">/month</span></p>
              <p className="text-gray-600 text-sm">For personal finance management</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-semibold text-lg mb-2">Premium</h3>
              <p className="text-3xl font-bold mb-2">$30<span className="text-sm font-normal text-blue-500">/month</span></p>
              <p className="text-gray-600 text-sm">Complete financial suite</p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-semibold transition duration-200 inline-block"
          >
            View All Features & Pricing
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who are already saving smarter with AI-powered insights
          </p>
          <Link
            href="/pricing"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition duration-200 inline-block"
          >
            Start Your Free Trial
          </Link>
          <p className="mt-4 text-sm text-blue-100">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 PocketWiseAI. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <Link href="/login" className="text-gray-400 hover:text-white text-sm">
              Sign In
            </Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white text-sm">
              Pricing
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}