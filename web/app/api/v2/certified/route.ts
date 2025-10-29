/**
 * Certified API Proxy Routes
 * Proxies certified catalogue requests
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = `${API_BASE}/api/v2/certified/catalogue${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Certified API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

