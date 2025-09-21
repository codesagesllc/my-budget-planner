import { createServerComponentClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('OAuth error:', error, error_description)
    const originalOrigin = requestUrl.searchParams.get('origin') || requestUrl.origin
    return NextResponse.redirect(
      `${originalOrigin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (code) {
    const supabase = await createServerComponentClient()

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        const originalOrigin = requestUrl.searchParams.get('origin') || requestUrl.origin
        return NextResponse.redirect(
          `${originalOrigin}/login?error=${encodeURIComponent('Failed to authenticate')}`
        )
      }

      console.log('OAuth code exchanged successfully')

      // Check if user is new (just created) or existing
      const user = data?.user
      if (user) {
        // Check if this is a new user (created in the last minute)
        const userCreatedAt = new Date(user.created_at)
        const now = new Date()
        const timeDiff = now.getTime() - userCreatedAt.getTime()
        const isNewUser = timeDiff < 60000 // Less than 1 minute ago

        if (isNewUser) {
          // This is a new user from OAuth signup - redirect to login to require explicit sign-in
          const originalOrigin = requestUrl.searchParams.get('origin') || requestUrl.origin
          return NextResponse.redirect(
            `${originalOrigin}/login?message=${encodeURIComponent('Account created successfully! Please sign in to continue.')}`
          )
        }
      }

    } catch (error) {
      console.error('Error exchanging code for session:', error)
      const originalOrigin = requestUrl.searchParams.get('origin') || requestUrl.origin
      return NextResponse.redirect(
        `${originalOrigin}/login?error=${encodeURIComponent('Failed to authenticate')}`
      )
    }
  }

  // Get the original domain from query params or use current origin
  const originalOrigin = requestUrl.searchParams.get('origin') || requestUrl.origin

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${originalOrigin}/dashboard`)
}
