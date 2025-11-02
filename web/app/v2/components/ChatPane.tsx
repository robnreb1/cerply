import React, { useState } from 'react'

// Standard loading message
const LOADING_MESSAGE = "Thinking..."

interface ChatPaneProps {
  moduleId: string | null
  onModuleCreated: (id: string) => void
  onContentUpdate: () => void
  isLocked: boolean
}

export function ChatPane({ moduleId, onModuleCreated, onContentUpdate, isLocked }: ChatPaneProps) {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{ sender: string; text: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [loadingMessage, setLoadingMessage] = useState('')
  const chatEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null)

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleStopGenerating = () => {
    // This would need backend support to actually stop generation
    setIsLoading(false)
    setChatHistory((prev) => [...prev, { sender: 'ai', text: 'Generation stopped.' }])
  }

  // Auto-scroll to bottom when chat history changes
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isLoading])
  
  // Auto-focus textarea after loading completes
  React.useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isLoading])

  const handleSendMessage = async () => {
    if ((!message.trim() && uploadedFiles.length === 0) || isLocked) return

    const userMessage = message
    setMessage('')
    
    // Reset textarea height after clearing message
    setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.style.height = '40px'
        textarea.focus() // Re-focus after sending
      }
    }, 0)
    
    const filesText = uploadedFiles.length > 0 ? ` 📎 ${uploadedFiles.map(f => f.name).join(', ')}` : ''
    setChatHistory((prev) => [...prev, { sender: 'user', text: userMessage + filesText }])
    setIsLoading(true)
    setLoadingMessage(LOADING_MESSAGE)

    try {
      // Convert files to base64 for upload
      const uploads = await Promise.all(
        uploadedFiles.map(async (file) => {
          const buffer = await file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          return {
            name: file.name,
            contentBase64: base64,
            type: file.type,
          }
        })
      )

      // Use SSE for chat if moduleId exists, regular POST for start
      if (moduleId) {
        // SSE for granular progress updates
        const response = await fetch('/api/v2/build/chat-sse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId,
            message: userMessage,
            uploads: uploads.length > 0 ? uploads : undefined,
            userId: 'dev-user-123',
            organizationId: 'dev-org-123',
          }),
        })

        if (!response.ok) {
          throw new Error('SSE connection failed')
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        let buffer = ''
        let currentEvent = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          
          // Keep the last incomplete chunk in the buffer
          buffer = lines.pop() || ''

          for (const chunk of lines) {
            if (!chunk.trim()) continue
            
            const eventLines = chunk.split('\n')
            let event = ''
            let data = ''
            
            for (const line of eventLines) {
              if (line.startsWith('event:')) {
                event = line.substring(6).trim()
              } else if (line.startsWith('data:')) {
                data = line.substring(5).trim()
              }
            }
            
            if (event && data) {
              try {
                const parsed = JSON.parse(data)
                
                if (event === 'status') {
                  // Update loading message based on stage
                  console.log('SSE status:', parsed)
                  setLoadingMessage(parsed.message || LOADING_MESSAGE)
                } else if (event === 'complete') {
                  // Final response received
                  console.log('SSE complete:', parsed)
                  setChatHistory((prev) => [...prev, { sender: 'ai', text: parsed.message }])
                  if (parsed.contentGenerated) {
                    onContentUpdate()
                  }
                  setIsLoading(false)
                } else if (event === 'error') {
                  console.error('SSE error:', parsed)
                  setChatHistory((prev) => [
                    ...prev,
                    { sender: 'ai', text: `Error: ${parsed.message}` },
                  ])
                  setIsLoading(false)
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', data, e)
              }
            }
          }
        }

        // Clear uploads after successful send
        setUploadedFiles([])
      } else {
        // Regular POST for start (no SSE yet)
        const endpoint = '/api/v2/build/start'
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userMessage,
            uploads: uploads.length > 0 ? uploads : undefined,
            userId: 'dev-user-123',
            organizationId: 'dev-org-123',
          }),
        })

        const data = await response.json()

        if (response.ok) {
          setChatHistory((prev) => [...prev, { sender: 'ai', text: data.reply }])
          if (data.moduleId) {
            onModuleCreated(data.moduleId)
          }
          if (data.content) {
            onContentUpdate()
          }
          setUploadedFiles([])
        } else {
          setChatHistory((prev) => [
            ...prev,
            { sender: 'ai', text: `Error: ${data.error?.message || data.error || 'Failed to process request'}` },
          ])
        }
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Chat error:', error)
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: 'Error: Unable to connect to backend. Please ensure the API is running.' },
      ])
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Add CSS to aggressively hide autofill dropdown */}
      <style jsx>{`
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        textarea:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #2d2d2d inset !important;
          -webkit-text-fill-color: #e5e7eb !important;
          box-shadow: 0 0 0 30px #2d2d2d inset !important;
          background-color: #2d2d2d !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        /* Hide Chrome autofill dropdown */
        input::-webkit-contacts-auto-fill-button,
        input::-webkit-credentials-auto-fill-button,
        textarea::-webkit-contacts-auto-fill-button,
        textarea::-webkit-credentials-auto-fill-button {
          visibility: hidden !important;
          display: none !important;
          pointer-events: none !important;
          position: absolute;
          right: 0;
        }
      `}</style>
      
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
            <div key={index} className="group">
              <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#2d2d2d] text-gray-200 border border-[#3d3d3d]'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>
                </div>
              </div>
              {/* Action buttons - only show for AI messages */}
              {msg.sender === 'ai' && (
                <div className="flex gap-1 mt-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopyMessage(msg.text, index)}
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                    title="Copy"
                  >
                    {copiedIndex === index ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {index === chatHistory.length - 1 && isLoading && (
                    <button
                      onClick={handleStopGenerating}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      title="Stop generating"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
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
                    <span className="ml-2 text-xs text-gray-400 italic">{loadingMessage}</span>
                  </div>
                </div>
              </div>
            )}
            {/* Auto-scroll anchor */}
            <div ref={chatEndRef} />
      </div>

      {/* Chat input */}
      <div className="flex-shrink-0 p-3 border-t border-[#2d2d2d]">
        {/* File upload area */}
        {uploadedFiles.length > 0 && (
          <div className="mb-2 space-y-1">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#252525] border border-[#3d3d3d] rounded px-2 py-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-xs text-gray-300 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">({(file.size / 1024).toFixed(1)}KB)</span>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="ml-2 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLocked || isLoading}
            className="bg-[#2d2d2d] border border-[#3d3d3d] hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-blue-400 px-3 py-2 rounded text-sm transition-colors flex-shrink-0"
            title="Upload files (PDF, DOC, DOCX, TXT, MD)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={isLocked ? 'Module is locked' : 'Type your message...'}
            className="flex-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-hidden min-h-[40px] max-h-[200px]"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              // Auto-resize textarea
              e.target.style.height = '40px' // Reset to min height
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
            }}
            onInput={(e) => {
              // Auto-resize on input
              const target = e.target as HTMLTextAreaElement
              target.style.height = '40px'
              target.style.height = Math.min(target.scrollHeight, 200) + 'px'
            }}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            name="chat-message-input"
            id="chat-message-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isLocked && !isLoading) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={isLocked || isLoading}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            onClick={handleSendMessage}
            disabled={isLocked || isLoading || (!message.trim() && uploadedFiles.length === 0)}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
