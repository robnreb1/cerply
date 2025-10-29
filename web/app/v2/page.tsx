import { redirect } from 'next/navigation'

/**
 * Cerply V2.0 Landing - Redirects to Build
 * Build is the default/primary page, all others accessible via menu
 */
export default function V2Home() {
  // Server-side redirect (instant, no client-side delay)
  redirect('/v2/build')
}
