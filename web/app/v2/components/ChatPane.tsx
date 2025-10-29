'use client'

/**
 * Chat Pane - Left panel for Build workspace
 * Handles prompt input and chat interactions
 */

import { useState, useEffect, useRef } from 'react'

interface ChatPaneProps {
  moduleId: string | null
  onModuleCreated: (id: string) => void
  isLocked: boolean
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatPane({ moduleId, onModuleCreated, isLocked }: ChatPaneProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      if (!moduleId) {
        // Start new module
        const response = await fetch('/api/v2/build/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: input }),
        })

        if (response.ok) {
          const data = await response.json()
          onModuleCreated(data.moduleId)

          const assistantMessage: Message = {
            role: 'assistant',
            content: data.message || 'Module created! Let me generate the content...',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      } else {
        // Continue chat
        const response = await fetch('/api/v2/build/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId, message: input }),
        })

        if (response.ok) {
          const data = await response.json()
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.response || 'Updated!',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Chat with Cerply AI</h2>
        <p className="text-xs text-gray-500 mt-1">
          {moduleId ? 'Refine your module' : 'Describe what you want to build'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">Ready to build</p>
            <p className="text-xs text-gray-400 mt-1 px-4">
              Start by describing your learning goal or tell me what you want to teach
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-gray-500'}`}>
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="animate-bounce">●</div>
                <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</div>
                <div className="animate-bounce" style={{ animationDelay: '0.4s' }}>●</div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        {isLocked ? (
          <div className="text-center py-4 text-sm text-gray-500">
            Module is locked. Unlock to make changes.
          </div>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={moduleId ? 'Type your refinement...' : 'Describe what you want to build...'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none text-sm"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition-colors text-sm font-medium"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
