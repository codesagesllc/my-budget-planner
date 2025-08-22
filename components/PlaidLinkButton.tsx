'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Link } from 'lucide-react'

interface PlaidLinkButtonProps {
  userId: string
  onSuccess?: () => void
}

export default function PlaidLinkButton({ userId, onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const createLinkToken = async () => {
      try {
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        })
        const data = await response.json()
        setLinkToken(data.link_token)
      } catch (error) {
        console.error('Error creating link token:', error)
      }
    }
    createLinkToken()
  }, [userId])

  const onPlaidSuccess = useCallback(async (public_token: string, metadata: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token,
          userId,
          institution: metadata.institution,
        }),
      })

      if (response.ok) {
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error exchanging token:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, onSuccess])

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
  }

  const { open, ready } = usePlaidLink(config as any)

  return (
    <button
      onClick={() => open()}
      disabled={!ready || loading}
      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Link className="h-5 w-5 mr-2" />
      {loading ? 'Connecting...' : 'Connect Bank Account'}
    </button>
  )
}