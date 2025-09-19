import { createServerComponentClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocsClient } from './docs-client'

export default async function DocsPage() {
  const supabase = await createServerComponentClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <DocsClient user={user} />
}