import { createServerComponentClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { appConfig } from '@/lib/config/app'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  // Get the redirect origin - validate it's an allowed domain
  const getValidatedOrigin = () => {
    const originParam = requestUrl.searchParams.get('origin')
    const currentOrigin = requestUrl.origin

    if (originParam && appConfig.isAllowedDomain(originParam)) {
      return originParam
    }

    if (appConfig.isAllowedDomain(currentOrigin)) {
      return currentOrigin
    }

    // Fallback to configured app URL or localhost
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  const validatedOrigin = getValidatedOrigin()

  if (error) {
    console.error('OAuth error:', error, error_description)
    return NextResponse.redirect(
      `${validatedOrigin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (code) {
    const supabase = await createServerComponentClient()

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(
          `${validatedOrigin}/login?error=${encodeURIComponent('Failed to authenticate')}`
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
          return NextResponse.redirect(
            `${validatedOrigin}/login?message=${encodeURIComponent('Account created successfully! Please sign in to continue.')}`
          )
        }
      }

    } catch (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(
        `${validatedOrigin}/login?error=${encodeURIComponent('Failed to authenticate')}`
      )
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${validatedOrigin}/dashboard`)
}
