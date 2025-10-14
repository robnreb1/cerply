// web/app/page.tsx
// Conversational Learning Interface - Main Entry Point
// Epic 6: Intelligent Granularity Detection + Adaptive Conversation

'use client';
import { useState, useEffect, useRef } from 'react';
import { Send, Target, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  granularity?: 'subject' | 'topic' | 'module';
  metadata?: any;
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

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call understanding endpoint to detect granularity with timeout
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Use admin token for testing/demo
      if (process.env.NODE_ENV === 'development') {
        headers['x-admin-token'] = 'test-admin-token';
      }

      // Create fetch with 10-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const understandRes = await fetch('/api/content/understand', {
        method: 'POST',
        headers,
        body: JSON.stringify({ artefact: userInput }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!understandRes.ok) {
        throw new Error('LEARNING_ENGINE_ERROR');
      }

      const understandData = await understandRes.json();
      const granularity = understandData.granularity || 'topic';
      const understanding = understandData.understanding || '';

      // Generate conversational response based on granularity
      let assistantResponse = '';

      if (granularity === 'subject') {
        // Subject: Suggest topics, DON'T generate content yet
        // User picks a topic, THEN we generate that ONE topic
        assistantResponse = `I understand you want to learn about **${userInput}** - that's a broad and important domain!\n\n${understanding}\n\n**To get started, which specific topic would you like to learn?**\n\nFor example:\n- Delegation skills\n- Conflict resolution\n- Team building\n- Motivation techniques\n\nJust tell me which topic interests you, and I'll create a complete learning path for it. 🎯`;
      } else if (granularity === 'module') {
        // Module: Generate PARENT TOPIC content, deliver specific module
        // Example: User asks "SMART Goals" → Generate "Goal Setting" topic → Deliver SMART Goals module
        assistantResponse = `Perfect! I'll teach you **${userInput}**.\n\n${understanding}\n\nThis is part of a broader topic, so I'll generate the complete learning path and start you with this specific module.\n\n**Generating your content now...** 🚀\n\n_(Creating high-quality, verified content for the complete topic - about 15-20 seconds)_`;
        
        // TODO: Identify parent topic, generate entire topic content, deliver specific module
      } else {
        // Topic: Generate ALL modules for this topic (THE ANCHOR POINT)
        assistantResponse = `Excellent choice! **${userInput}** is a focused topic that will make a real impact.\n\n${understanding}\n\n**Generating your complete learning path now...** 🚀\n\nI'm creating all modules for this topic with quizzes and practical examples. This will take about 15-20 seconds.\n\n_(You'll learn this one module at a time for better retention)_`;
        
        // TODO: Trigger topic generation (all modules)
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantResponse,
        granularity,
        metadata: {
          understanding: understandData.understanding,
          generationId: understandData.id,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSessionId(understandData.id || sessionId);
    } catch (err: any) {
      console.error('Chat error:', err);
      
      let errorContent = "We have been unable to connect to the Cerply learning engine, please try again later.";
      
      // Check if it was a timeout
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
                      {msg.granularity && (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500">
                          {msg.granularity === 'subject' && <>🌟 Broad domain detected</>}
                          {msg.granularity === 'topic' && <><Target className="w-3 h-3" /> Focused topic detected</>}
                          {msg.granularity === 'module' && <><Wrench className="w-3 h-3" /> Specific tool detected</>}
                        </div>
                      )}
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
