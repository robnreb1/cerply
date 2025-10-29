/**
 * Push API Proxy Routes
 * Proxies assignment management requests
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE}/api/v2/push/assignments`, {
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Push API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${API_BASE}/api/v2/push/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Push API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

