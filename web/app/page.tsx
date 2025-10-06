// web/app/page.tsx
// Chat-first interface with sticky header/footer

'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowUpTrayIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { COPY } from '@/lib/copy';

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

  const generateIntelligentResponse = (topic: string): string => {
    const lowerTopic = topic.toLowerCase();
    
    // Clarifying question first
    if (lowerTopic.includes('quantum')) {
      return `I'd love to help you learn about quantum mechanics! This is a fascinating field. To personalize your learning path, could you tell me:\n\n• Are you interested in the theoretical foundations (wave functions, uncertainty principle)?\n• Or specific phenomena like quantum entanglement or superposition?\n• Are you approaching this from physics, chemistry, or computer science?\n\nThis will help me structure the perfect learning journey for you.`;
    } else if (lowerTopic.includes('python') || lowerTopic.includes('programming')) {
      return `Great choice! Python is incredibly versatile. To tailor this perfectly:\n\n• Are you completely new to programming, or do you have some coding experience?\n• What's your goal? (web development, data science, automation, AI/ML)\n• Do you learn better through projects or structured exercises?\n\nLet me know and I'll create a path that matches your style.`;
    } else if (lowerTopic.includes('photosynthesis') || lowerTopic.includes('biology')) {
      return `Fascinating topic! Photosynthesis is the foundation of life on Earth. To give you the best experience:\n\n• Are you studying this for a specific course or exam?\n• Would you like to focus on the chemical reactions, the ecological impact, or both?\n• Do you prefer detailed diagrams or conceptual explanations?\n\nShare your preferences and I'll build your personalized curriculum.`;
    } else if (lowerTopic.includes('spanish') || lowerTopic.includes('language')) {
      return `¡Excelente! Learning Spanish opens up a whole new world. Let me understand your needs:\n\n• What's your current level? (complete beginner, some basics, intermediate)\n• Are you learning for travel, work, or personal enrichment?\n• Do you prefer conversational practice or grammar-focused learning?\n\nTell me more so I can design the most effective path for you.`;
    }
    
    // Generic but intelligent fallback with dynamic content
    return `I'd love to help you master ${topic}! To create the most effective learning path for you, could you share:\n\n• What's your current level with this topic?\n• What's motivating you to learn this right now?\n• How do you prefer to learn? (visual, hands-on, reading, etc.)\n\nThe more I understand about you, the better I can adapt the content to your needs.`;
  };

  const generateDetailedPlan = (topic: string): string => {
    const lowerTopic = topic.toLowerCase();
    
    if (lowerTopic.includes('quantum')) {
      return `Perfect! Here's your personalized quantum mechanics learning path:\n\n**Core Concepts** (Est. 3-4 weeks)\n• Wave-particle duality with interactive simulations\n• Schrödinger equation and probability waves\n• The uncertainty principle explained through real experiments\n• Quantum states and measurement\n\n**Practical Applications** (Est. 2-3 weeks)\n• Quantum tunneling in semiconductors\n• How quantum mechanics powers modern technology\n• Introduction to quantum computing basics\n• Lab exercises with virtual quantum systems\n\n**Advanced Topics** (Est. 3-4 weeks)\n• Quantum entanglement and Bell's theorem\n• Many-worlds interpretation vs Copenhagen\n• Current research in quantum information theory\n• Building intuition for quantum field theory\n\nReady to start with wave-particle duality? Just say "Let's begin" and I'll load your first interactive lesson.`;
    }
    
    // Generic but topic-aware fallback
    return `Excellent! Here's your personalized ${topic} learning path:\n\n**Core Concepts**\n• Foundational principles and key terminology\n• Building blocks that everything else depends on\n• Interactive examples and analogies\n• Self-check quizzes to confirm understanding\n\n**Practical Skills**\n• Hands-on projects applying what you've learned\n• Real-world scenarios and case studies\n• Common pitfalls and how to avoid them\n• Practice exercises with instant feedback\n\n**Advanced Topics**\n• Deeper exploration of complex areas\n• Current research and cutting-edge developments\n• Expert-level techniques and strategies\n• Capstone project to demonstrate mastery\n\nReady to dive in? Just say "Let's start" and I'll begin with the fundamentals.`;
  };

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

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Determine if this is initial question or follow-up
    const isFollowUp = messages.length > 0 && 
                       messages[messages.length - 1].role === 'assistant' &&
                       messages[messages.length - 1].content.includes('could you');

    // Simulate processing (replace with real API call)
    setTimeout(() => {
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: isFollowUp ? generateDetailedPlan(text) : generateIntelligentResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsProcessing(false);
    }, 1500);
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

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-neutral-900 mb-3">Cerply</h1>
                <p className="text-lg text-neutral-600 mb-2">
                  {COPY.topBarTagline}
                </p>
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
