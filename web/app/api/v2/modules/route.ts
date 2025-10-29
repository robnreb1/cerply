/**
 * Modules API Proxy Routes
 * Proxies module CRUD requests from Next.js frontend to Express backend
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest, { params }: { params: { id?: string } }) {
  try {
    const moduleId = params.id
    const url = moduleId
      ? `${API_BASE}/api/v2/modules/${moduleId}`
      : `${API_BASE}/api/v2/modules`

    const response = await fetch(url, {
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Modules API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const response = await fetch(`${API_BASE}/api/v2/modules/${params.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Modules API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${API_BASE}/api/v2/modules/${params.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Modules API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

