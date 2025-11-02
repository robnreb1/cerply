/**
 * Build Chat API Proxy
 * Handles chat messages for module creation and refinement
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { moduleId, message, action } = body

    // Determine endpoint based on whether moduleId exists
    const endpoint = !moduleId ? 'start' : 'chat'
    
    // Build request body
    const requestBody: any = {
      userId: 'dev-user-123', // From auth middleware
      organizationId: 'dev-org-123', // From auth middleware
    }

    if (endpoint === 'start') {
      requestBody.prompt = message
    } else {
      requestBody.moduleId = moduleId
      requestBody.message = message
    }

    const response = await fetch(`${API_BASE}/api/v2/build/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || 'Bearer dev-token',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.error || 'Backend error' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      reply: data.reply || 'Module updated successfully',
      moduleId: data.moduleId || moduleId,
      module: data.module,
      content: data.content, // Pass through generated content
      sections: data.sections, // Pass through sections
      aiGenerated: data.aiGenerated, // Pass through flag
    })
  } catch (error) {
    console.error('Build chat API error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'API_ERROR',
          message: 'Failed to process chat message. Ensure API is running on port 8080.',
        },
      },
      { status: 500 }
    )
  }
}

