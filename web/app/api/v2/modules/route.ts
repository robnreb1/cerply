import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const visibility = searchParams.get('visibility')
    
    let url = `${API_BASE}/api/v2/modules?organizationId=${organizationId}`
    if (visibility) {
      url += `&visibility=${visibility}`
    }
    
    const response = await fetch(url, {
      headers: {
        Authorization: request.headers.get('Authorization') || 'Bearer dev-token',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Modules list API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy modules list request' } },
      { status: 500 }
    )
  }
}
