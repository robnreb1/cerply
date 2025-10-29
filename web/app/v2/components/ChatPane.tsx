import React, { useState } from 'react'

interface ChatPaneProps {
  moduleId: string | null
  onModuleCreated: (id: string) => void
  isLocked: boolean
}

export function ChatPane({ moduleId, onModuleCreated, isLocked }: ChatPaneProps) {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{ sender: string; text: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!message.trim() || isLocked) return

    const userMessage = message
    setMessage('')
    setChatHistory((prev) => [...prev, { sender: 'user', text: userMessage }])
    setIsLoading(true)

    try {
      // Call backend API
      const response = await fetch('/api/v2/build/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          message: userMessage,
          action: moduleId ? 'refine' : 'create',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setChatHistory((prev) => [...prev, { sender: 'ai', text: data.reply }])
        if (data.moduleId && !moduleId) {
          onModuleCreated(data.moduleId)
        }
      } else {
        setChatHistory((prev) => [
          ...prev,
          { sender: 'ai', text: `Error: ${data.error || 'Failed to process request'}` },
        ])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: 'Error: Unable to connect to backend. Please ensure the API is running.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#2d2d2d]">
        <h2 className="text-sm font-medium text-gray-300">Chat</h2>
        <p className="text-xs text-gray-500 mt-0.5">Describe your module to get started</p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm text-gray-500">Start a conversation to build your module</p>
          </div>
        ) : (
          chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2d2d2d] text-gray-200 border border-[#3d3d3d]'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="flex-shrink-0 p-3 border-t border-[#2d2d2d]">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={isLocked ? 'Module is locked' : 'Type your message...'}
            className="flex-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isLocked && !isLoading) {
                handleSendMessage()
              }
            }}
            disabled={isLocked || isLoading}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            onClick={handleSendMessage}
            disabled={isLocked || isLoading || !message.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
