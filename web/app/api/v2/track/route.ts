/**
 * Track API Proxy Routes
 * Proxies analytics requests from Next.js frontend to Express backend
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest, { params }: { params: { view: string; id?: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const view = params.view // 'team', 'person', or 'module'
    const id = params.id

    let url = `${API_BASE}/api/v2/track/${view}`
    if (id) url += `/${id}`

    // Forward query params for filters
    const queryString = searchParams.toString()
    if (queryString) url += `?${queryString}`

    const response = await fetch(url, {
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Track API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

