'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Cerply V2.0 Landing - Redirects to Build
 * Build is the default/primary page, all others accessible via menu
 */
export default function V2Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Build page (default landing)
    router.replace('/v2/build')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1e1e1e]">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500 mx-auto"></div>
        <p className="text-gray-400 text-sm">Loading Cerply...</p>
      </div>
    </div>
  )
}
