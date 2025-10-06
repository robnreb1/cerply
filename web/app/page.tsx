// web/app/page.tsx
// Chat-first interface with sticky header/footer

'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowUpTrayIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { COPY } from '@/lib/copy';
import { apiBase } from '@/lib/apiBase';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const PLACEHOLDERS = COPY.placeholders;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycle placeholders
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsProcessing(true);

    try {
      // Call real API endpoint
      const response = await fetch(`${apiBase()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      let assistantContent = '';
      
      // Handle different action types from API
      if (data.action === 'clarify') {
        assistantContent = data.data.question;
        if (data.data.chips && data.data.chips.length > 0) {
          assistantContent += '\n\n' + data.data.chips.map((c: string) => `• ${c}`).join('\n');
        }
      } else if (data.action === 'plan') {
        if (data.data.message) {
          assistantContent = data.data.message + '\n\n';
        } else {
          assistantContent = 'Here\'s your personalized learning path:\n\n';
        }
        data.data.modules.forEach((module: any, idx: number) => {
          assistantContent += `**${idx + 1}. ${module.title}**`;
          if (module.description) {
            assistantContent += `\n${module.description}`;
          }
          if (module.estMinutes) {
            assistantContent += ` (${module.estMinutes} min)`;
          }
          assistantContent += '\n\n';
        });
        assistantContent += 'Ready to start? Just say "Let\'s begin" and I\'ll guide you through.';
      } else if (data.action === 'answer') {
        assistantContent = data.data.message || 'I\'m here to help you learn effectively.';
      } else if (data.action === 'meta') {
        assistantContent = data.data.notice || 'I\'m ready to help you learn. What would you like to focus on?';
      } else {
        assistantContent = 'I received your message. Could you tell me more about what you\'d like to learn?';
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat API error:', error);
      
      // Fallback error message
      const errorMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `📎 Uploaded: ${file.name}`,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    setTimeout(() => {
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `I've received your file "${file.name}". I'll analyze it and create a personalized learning plan for you. This will take just a moment...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-neutral-900">Cerply</h1>
            <span className="text-sm text-neutral-500 hidden sm:inline">
              {COPY.topBarTagline}
            </span>
          </div>
          <button className="text-sm font-medium text-brand-coral-600 hover:text-brand-coral-700">
            Log in
          </button>
        </div>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                  What would you like to learn?
                </h2>
                <p className="text-neutral-500">
                  Ask me anything, share a document, or paste a link
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-brand-coral-600 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.role === 'user' ? 'text-white/70' : 'text-neutral-500'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-white border border-neutral-200">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Chat Input */}
      <div className="sticky bottom-0 z-50 bg-white border-t border-neutral-200 shadow-lg">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-2 rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 focus-within:border-brand-coral-500 focus-within:ring-2 focus-within:ring-brand-coral-500/20">
            {/* Upload Button (Icon) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 text-neutral-500 hover:text-brand-coral-600 transition-colors"
              aria-label="Upload file"
            >
              <ArrowUpTrayIcon className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            {/* Text Input */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDERS[placeholderIndex]}
              className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-neutral-400"
              aria-label="Type your message"
            />

            {/* Send Button (Icon) */}
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className="flex-shrink-0 rounded-lg p-2 bg-brand-coral-600 text-white hover:bg-brand-coral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-neutral-100 bg-neutral-50">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-neutral-600">
              <a href="/account" className="hover:text-brand-coral-600 transition-colors">
                Account
              </a>
              <span className="text-neutral-300">·</span>
              <a href="/popular" className="hover:text-brand-coral-600 transition-colors">
                Popular
              </a>
              <span className="text-neutral-300">·</span>
              <a href="/certified" className="hover:text-brand-coral-600 transition-colors">
                Certified
              </a>
              <span className="text-neutral-300">·</span>
              <a href="/business" className="hover:text-brand-coral-600 transition-colors">
                Business
              </a>
              <span className="text-neutral-300">·</span>
              <a href="/experts" className="hover:text-brand-coral-600 transition-colors">
                Experts
              </a>
              <span className="text-neutral-300">·</span>
              <a href="/about" className="hover:text-brand-coral-600 transition-colors">
                About
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
