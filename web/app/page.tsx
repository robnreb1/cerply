// web/app/page.tsx
// Conversational Learning Interface - Main Entry Point
// Epic 6: Intelligent Granularity Detection + Adaptive Conversation

'use client';
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  granularity?: 'subject' | 'topic' | 'module';
  metadata?: any;
  awaitingConfirmation?: boolean; // Track if we're waiting for user confirmation
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message on first load
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: "Hi, I'm Cerply. Shall we continue with your live topics, or would you like to learn something new?",
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
    };

    // CRITICAL: Use functional update to get CURRENT messages, not stale closure
    let currentMessages: Message[] = [];
    setMessages(prev => {
      currentMessages = [...prev, userMessage];
      return currentMessages;
    });
    setInput('');
    setIsLoading(true);

    try {
      // Get conversation context from CURRENT messages (not stale closure)
      const lastAssistantMessage = currentMessages.filter(m => m.role === 'assistant').pop();
      const messageHistory = currentMessages.map(m => ({ role: m.role, content: m.content }));
      
      // Prepare conversation request
      const conversationRequest = {
        userInput,
        messageHistory,
        currentState: lastAssistantMessage?.awaitingConfirmation ? 'confirming' as const : 'initial' as const,
        granularity: lastAssistantMessage?.granularity,
        understanding: lastAssistantMessage?.metadata?.understanding,
        // IMPORTANT: Keep original request from first message, don't override with "yes"
        originalRequest: lastAssistantMessage?.metadata?.originalRequest || userInput,
      };

      // Call LLM-driven conversation endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const conversationRes = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'test-admin-token',
        },
        body: JSON.stringify(conversationRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!conversationRes.ok) {
        throw new Error('CONVERSATION_ERROR');
      }

      const conversationData = await conversationRes.json();
      
      // Create assistant message with LLM-generated response (no templates!)
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: conversationData.message,
        granularity: conversationData.granularity,
        awaitingConfirmation: conversationData.nextState === 'confirming',
        metadata: {
          understanding: conversationData.understanding,
          generationId: conversationData.generationId,
          originalRequest: conversationRequest.originalRequest,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSessionId(conversationData.generationId || sessionId);

      // If action is START_GENERATION, trigger content generation
      if (conversationData.action === 'START_GENERATION') {
        // TODO: Trigger actual content generation API call
        console.log('[Cerply] Starting content generation for:', conversationRequest.originalRequest);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      
      let errorContent = "We have been unable to connect to the Cerply learning engine, please try again later.";
      
      if (err.name === 'AbortError') {
        errorContent = "We have been unable to connect to the Cerply learning engine, please try again later.";
      }
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorContent,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Cerply</h1>
            <p className="text-xs text-gray-500">Learn anything. Remember everything.</p>
          </div>
          <div className="text-sm text-gray-500">
            {process.env.NODE_ENV === 'development' && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                🧪 Development Mode
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-[calc(100vh-200px)] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-gray-50 text-gray-900 rounded-2xl rounded-tl-sm border border-gray-200'
                  } p-4 shadow-sm`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          // Style markdown elements
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                          li: ({ children }) => <li className="text-gray-700">{children}</li>,
                          p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-700">{children}</p>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-sm border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-gray-500">Understanding your request...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder=""
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                disabled={isLoading}
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-br from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            
            {/* Shortcuts */}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">Shortcuts:</span>
              <button
                onClick={() => {/* TODO: Open file upload */}}
                className="hover:text-blue-600 hover:underline transition-colors"
              >
                Upload
              </button>
              <button
                onClick={() => {/* TODO: Open challenge form */}}
                className="hover:text-blue-600 hover:underline transition-colors"
              >
                Challenge
              </button>
              <button
                onClick={() => {/* TODO: Navigate to catalog */}}
                className="hover:text-blue-600 hover:underline transition-colors"
              >
                Catalog
              </button>
              <button
                onClick={() => {/* TODO: Navigate to curate - manager content creation */}}
                className="hover:text-blue-600 hover:underline transition-colors"
              >
                Curate
              </button>
              <button
                onClick={() => {/* TODO: Navigate to account */}}
                className="hover:text-blue-600 hover:underline transition-colors"
              >
                Account
              </button>
              <button
                onClick={() => {/* TODO: Navigate to progress */}}
                className="hover:text-blue-600 hover:underline transition-colors"
              >
                Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
