'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { LogIn, Mail, Lock, Chrome, Loader2, CreditCard } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithEmail, signInWithProvider, checkSession } = useAuth()

  useEffect(() => {
    const error = searchParams.get('error')
    const message = searchParams.get('message')
    
    if (error) setError(decodeURIComponent(error))
    if (message) setMessage(decodeURIComponent(message))
    
    checkSession().then((hasSession) => {
      if (hasSession) router.push('/dashboard')
    })
  }, [searchParams, router, checkSession])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const result = await signInWithEmail(email, password)
      if (result.error) {
        setError(result.error)
      } else {
        setMessage('Login successful! Redirecting...')
        // Simple redirect after successful login
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 100)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setMessage(null)
    setGoogleLoading(true)

    try {
      const result = await signInWithProvider('google')
      if (result.error) {
        setError(result.error)
        setGoogleLoading(false)
      }
      // The redirect will happen automatically for OAuth
    } catch (err) {
      setError('Failed to initiate Google login')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <LogIn className="h-8 w-8 text-blue-600 mr-2" />
          <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
        </div>
        
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="destructive">{error}</Alert>}

        <Button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          variant="outline"
          className="w-full mb-4"
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
              <span className="text-sm text-blue-600">Continue with Google </span>
            </>
          )}
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="text-sm text-blue-600">Or continue with email</span>
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />}
            label="Email Address"
          />

          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            label="Password"
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start">
            <CreditCard className="h-5 w-5 text-gray-600 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Need an account?
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Start with a 14-day free trial or choose a paid plan to get full access.
              </p>
              <Link 
                href="/pricing" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
              >
                View pricing plans →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link 
            href="/forgot-password" 
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  )
}
