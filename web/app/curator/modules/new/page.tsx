"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ConversationTurn {
  role: 'manager' | 'agent';
  content: string;
  suggestions?: string[];
  modulePreview?: ModulePreview;
  timestamp: Date;
}

interface ModulePreview {
  title: string;
  description: string;
  targetMasteryLevel: string;
  startingLevel?: string;
  contentBlocks: ContentBlock[];
  targetProficiencyPct: number;
  suggestedDeadline?: string;
}

interface ContentBlock {
  title: string;
  type: string;
  source: 'proprietary' | 'ai_generated' | 'public_web';
  content: string;
  isRingFenced: boolean;
  orderIndex: number;
  sourceLabel?: string;
  citations?: Array<{
    id: number;
    type: 'journal' | 'book' | 'specification' | 'report' | 'website';
    title: string;
    authors: string[];
    year?: number;
    publisher?: string;
    doi?: string;
    url?: string;
    isPeerReviewed?: boolean;
  }>;
}

// 20 variations of initial greeting (Hugh Grant style - polite, friendly, measured)
const INITIAL_GREETINGS = [
  "Hello, how can I help? Would you like to curate a new learning module for your team, or would you like to manage your current portfolio of topics?",
  "Good to see you. Are you here to create a new training module, or would you prefer to review what you've already built?",
  "Hello there. Shall we work on a fresh module together, or would you like to take a look at your existing content?",
  "Welcome. Would you like to design something new for your team, or perhaps revisit your current modules?",
  "Hello. What brings you here today - creating a new learning experience, or managing what you already have?",
  "Hi. Are we building something new, or would you like to see what's in your library?",
  "Good day. Shall we craft a new module, or would you prefer to work with your existing portfolio?",
  "Hello. New module or existing content - what would be most helpful right now?",
  "Welcome back. Fresh content or portfolio management - which would you like to focus on?",
  "Hello there. Shall we start something new, or would you like to refine what you've already created?",
  "Hi. Would you like to build a new training module from scratch, or manage your current collection?",
  "Good to see you. New creation or portfolio review - what's your preference today?",
  "Hello. Are we designing new content, or would you like to work with your existing modules?",
  "Welcome. Shall we build something fresh, or would you like to see what you've already got?",
  "Hello there. New module development or portfolio management - which shall it be?",
  "Hi. Would you like to create something new for your team, or review your current learning content?",
  "Good day. Fresh module or existing portfolio - what would be most useful?",
  "Hello. Shall we work on new content together, or would you prefer to manage what's already there?",
  "Welcome. Creating a new module or reviewing your library - which appeals to you?",
  "Hello there. New training content or portfolio management - how can I help you today?"
];

// Get a consistent greeting based on date (rotates daily)
function getDailyGreeting(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  // Simple hash of the date to get consistent index for the day
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash) + today.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % INITIAL_GREETINGS.length;
  return INITIAL_GREETINGS[index];
}

export default function ConversationalModuleCreationPage() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([
    {
      role: 'agent',
      content: getDailyGreeting(),
      timestamp: new Date(),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // 🔥 NEW: Background content enrichment tracking
  const [enrichmentJobId, setEnrichmentJobId] = useState<string | null>(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [enrichmentStatus, setEnrichmentStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');

  // 🔥 PERSISTENCE: Load conversation from localStorage on mount
  useEffect(() => {
    const savedConversationId = localStorage.getItem('cerply_module_conversation_id');
    const savedTurns = localStorage.getItem('cerply_module_conversation_turns');
    
    if (savedConversationId) {
      console.log('[Frontend] Restoring conversation:', savedConversationId);
      setConversationId(savedConversationId);
    }
    
    if (savedTurns) {
      try {
        const parsed = JSON.parse(savedTurns);
        // Only restore if we have more than just the initial agent greeting
        if (parsed.length > 1) {
          setTurns(parsed.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp),
          })));
        }
      } catch (e) {
        console.error('[Frontend] Failed to parse saved turns:', e);
      }
    }
  }, []);

  // 🔥 PERSISTENCE: Save conversation ID to localStorage
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('cerply_module_conversation_id', conversationId);
    }
  }, [conversationId]);

  // 🔥 PERSISTENCE: Save turns to localStorage
  useEffect(() => {
    if (turns.length > 1) { // Only save if we have actual conversation
      localStorage.setItem('cerply_module_conversation_turns', JSON.stringify(turns));
    }
  }, [turns]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);
  
  // 🔥 NEW: Poll for enrichment progress
  useEffect(() => {
    if (!enrichmentJobId || enrichmentStatus !== 'running') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/curator/modules/enrichment/${enrichmentJobId}`, {
          credentials: 'include',
        });
        
        if (!res.ok) {
          console.error('[Enrichment Poll] Failed:', res.status);
          return;
        }
        
        const data = await res.json();
        console.log('[Enrichment Poll] Progress:', data.progress, '% Status:', data.status);
        
        setEnrichmentProgress(data.progress);
        setEnrichmentStatus(data.status);
        
        if (data.status === 'completed' && data.modulePreview) {
          // Update the last turn with enriched content
          setTurns(prev => {
            const updated = [...prev];
            const lastTurn = updated[updated.length - 1];
            if (lastTurn && lastTurn.role === 'agent' && lastTurn.modulePreview) {
              lastTurn.modulePreview = data.modulePreview;
            }
            return updated;
          });
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          console.error('[Enrichment Poll] Job failed:', data.error);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('[Enrichment Poll] Error:', error);
      }
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(pollInterval);
  }, [enrichmentJobId, enrichmentStatus]);

  // 🔥 NEW: Auto-focus text input after agent response
  const inputRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (turns.length > 0 && turns[turns.length - 1].role === 'agent' && !loading) {
      // Small delay to ensure UI has rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [turns, loading]);

  const handleSend = async (message?: string) => {
    const messageToSend = message || userInput;
    if (!messageToSend.trim() && uploadedFiles.length === 0) return;

    // Add user message to UI immediately
    const newTurn: ConversationTurn = {
      role: 'manager',
      content: messageToSend,
      timestamp: new Date(),
    };
    setTurns(prev => [...prev, newTurn]);
    setUserInput('');
    setLoading(true);
    setError(null);

    try {
      // Send to API
      const body = {
        conversationId,
        userMessage: messageToSend,
        uploadedFiles: uploadedFiles.map(f => ({ name: f.name, type: f.type })),
      };

      const res = await fetch('/api/curator/modules/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to send message');
      }

      const data = await res.json();

      // Update conversation ID
      if (!conversationId) setConversationId(data.conversationId);
      
      // 🔥 NEW: Start polling if we got an enrichment job ID
      if (data.enrichmentJobId) {
        console.log('[Frontend] Starting enrichment job:', data.enrichmentJobId);
        setEnrichmentJobId(data.enrichmentJobId);
        setEnrichmentStatus('running');
        setEnrichmentProgress(0);
      }

      // Add agent response
      const agentTurn: ConversationTurn = {
        role: 'agent',
        content: data.agentMessage,
        suggestions: data.suggestions,
        modulePreview: data.modulePreview,
        timestamp: new Date(),
      };
      setTurns(prev => [...prev, agentTurn]);

      // Clear uploaded files
      setUploadedFiles([]);

      // If module created, redirect to edit page
      if (data.draftModuleId) {
        setTimeout(() => {
          router.push(`/curator/modules/${data.draftModuleId}/edit`);
        }, 2000);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleStartNew = () => {
    // Clear everything and start fresh
    localStorage.removeItem('cerply_module_conversation_id');
    localStorage.removeItem('cerply_module_conversation_turns');
    setConversationId(null);
    setTurns([
      {
        role: 'agent',
        content: getDailyGreeting(),
        timestamp: new Date(),
      },
    ]);
    setUserInput('');
    setError(null);
  };

  return (
    <div className="flex h-screen flex-col bg-brand-bg">
      {/* Header */}
      <div className="border-b border-brand-border bg-brand-surface px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-ink">Cerply</h1>
            <p className="text-sm text-brand-subtle mt-1">
              Teach anything. Remember everything.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {conversationId && (
              <button
                onClick={handleStartNew}
                className="text-sm text-brand-accent hover:text-brand-accent-hover font-medium"
              >
                Start New
              </button>
            )}
              <button
                onClick={() => router.push('/curator/modules')}
                className="text-sm text-brand-subtle hover:text-brand-ink"
              >
                Portfolio
              </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {turns.map((turn, i) => (
            <div key={i} className={`flex ${turn.role === 'manager' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-5 py-4 ${
                  turn.role === 'manager'
                    ? 'bg-brand-coral-500 text-white shadow-md'
                    : 'bg-brand-surface border border-brand-border shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>

                {/* Module Preview (if present) */}
                {turn.modulePreview && (
                  <div className="mt-4 border-t pt-4">
                    <ModulePreviewCard 
                      preview={turn.modulePreview} 
                      enrichmentStatus={enrichmentStatus}
                      enrichmentProgress={enrichmentProgress}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg border border-brand-border bg-brand-surface px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-brand-subtle"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-brand-subtle" style={{ animationDelay: '0.15s' }}></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-brand-subtle" style={{ animationDelay: '0.3s' }}></div>
                  <span className="ml-2 text-sm text-brand-subtle">Agent is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 max-w-lg">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-brand-border bg-brand-surface px-6 py-4 shadow-lg">
        <div className="mx-auto max-w-4xl">
          {/* File Upload Preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface2 px-3 py-2 text-sm">
                  <span className="text-brand-ink">📎 {file.name}</span>
                  <button
                    onClick={() => setUploadedFiles(uploadedFiles.filter((_, j) => j !== i))}
                    className="text-brand-subtle hover:text-brand-ink font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {/* File Upload Button */}
            <label className="cursor-pointer rounded-lg border border-brand-border bg-brand-surface2 px-4 py-3 hover:bg-brand-border transition-colors flex items-center">
              <span className="text-lg">📎</span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
                  }
                }}
              />
            </label>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Press Enter to send • Upload company documents for proprietary training content"
              className="flex-1 rounded-lg border border-brand-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-coral-500 text-brand-ink placeholder:text-gray-400 placeholder:opacity-60"
              disabled={loading}
            />

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={loading || (!userInput.trim() && uploadedFiles.length === 0)}
              className="rounded-lg bg-brand-coral-500 px-8 py-3 font-medium text-white hover:bg-brand-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Send
            </button>
          </div>
          
          {/* Shortcuts */}
          <div className="mt-3 flex items-center gap-4 text-xs text-brand-subtle">
            <span className="font-medium">Shortcuts:</span>
            <button 
              onClick={() => setUserInput('Upload documents')}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
            >
              Upload
            </button>
            <button 
              onClick={() => router.push('/curator/modules')}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
            >
              Portfolio
            </button>
            <button 
              onClick={() => setUserInput('Assign to team')}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
            >
              Assign
            </button>
            <button 
              onClick={() => router.push('/')}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
            >
              Learn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// InfoTooltip component for explaining fields
function InfoTooltip({ content }: { content: string }) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center justify-center w-4 h-4 text-xs text-brand-subtle hover:text-brand-ink transition-colors"
      >
        <svg 
          className="w-3.5 h-3.5" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
      {isVisible && (
        <div className="absolute z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg -top-2 left-6 transform -translate-y-full">
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -bottom-1 left-2"></div>
          {content}
        </div>
      )}
    </div>
  );
}

function ModulePreviewCard({ 
  preview, 
  enrichmentStatus = 'idle', 
  enrichmentProgress = 0 
}: { 
  preview: ModulePreview;
  enrichmentStatus?: 'idle' | 'running' | 'completed' | 'failed';
  enrichmentProgress?: number;
}) {
  const [expandedBlocks, setExpandedBlocks] = React.useState<Set<number>>(new Set());
  
  const proprietaryCount = preview.contentBlocks.filter(b => b.source === 'proprietary').length;
  const aiCount = preview.contentBlocks.filter(b => b.source === 'ai_generated').length;
  const publicCount = preview.contentBlocks.filter(b => b.source === 'public_web').length;

  const toggleBlock = (index: number) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedBlocks(newExpanded);
  };

  const getBlockTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📄';
      case 'video': return '🎥';
      case 'document': return '📎';
      case 'simulation': return '🎮';
      case 'quiz': return '❓';
      default: return '📝';
    }
  };

  const getBlockTypeDescription = (type: string) => {
    switch (type) {
      case 'simulation': return 'Interactive scenario that adapts to learner responses';
      case 'quiz': return 'Adaptive assessment that adjusts difficulty based on performance';
      default: return null;
    }
  };

  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface2 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-brand-ink">{preview.title}</h3>
          <p className="text-sm text-brand-subtle mt-1">{preview.description}</p>
        </div>
      </div>
      
      {/* 🔥 NEW: Content Enrichment Progress Indicator */}
      {enrichmentStatus === 'running' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm font-medium text-blue-900">Generating comprehensive content...</span>
            </div>
            <span className="text-sm font-semibold text-blue-900">{enrichmentProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${enrichmentProgress}%` }}
            />
          </div>
                      <p className="text-xs text-blue-700 mt-2">
                        Building comprehensive content with proper citations. 
                        You can continue working - content will appear when ready (~2-3 minutes).
                      </p>
        </div>
      )}
      
      {enrichmentStatus === 'completed' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm font-medium text-green-900">Content generation complete!</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5 p-4 bg-brand-surface rounded-lg border border-brand-border">
        <div>
          <p className="text-xs text-brand-subtle uppercase tracking-wide mb-1 flex items-center">
            Target Level
            <InfoTooltip content="The skill level learners will achieve by completing this module. Cerply adapts content delivery to help each learner reach this target level." />
          </p>
          <p className="text-sm font-semibold text-brand-ink capitalize">{preview.targetMasteryLevel}</p>
        </div>
        <div>
          <p className="text-xs text-brand-subtle uppercase tracking-wide mb-1 flex items-center">
            Target Proficiency
            <InfoTooltip content="The percentage of questions users must answer correctly at the Target Level to be considered proficient." />
          </p>
          <p className="text-sm font-semibold text-brand-ink">
            {preview.targetProficiencyPct}%
          </p>
        </div>
        {preview.suggestedDeadline && (
          <div>
            <p className="text-xs text-brand-subtle uppercase tracking-wide mb-1 flex items-center">
              Deadline
              <InfoTooltip content="The date by which learners should achieve proficiency. Cerply will send reminders to both you and at-risk learners if they're falling behind (once per day)." />
            </p>
            <p className="text-sm font-semibold text-brand-ink">
              {new Date(preview.suggestedDeadline).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-brand-ink mb-3">
          Content Structure ({preview.contentBlocks.length} sections):
        </p>
        <p className="text-xs text-brand-subtle mb-3">
          Click on any section to view details and assess the content
        </p>
        {preview.contentBlocks.map((block, i) => {
          const isExpanded = expandedBlocks.has(i);
          const adaptiveDescription = getBlockTypeDescription(block.type);
          
          return (
            <div key={i} className="border border-brand-border rounded-lg overflow-hidden transition-all">
              <button
                onClick={() => toggleBlock(i)}
                className="w-full flex items-start gap-3 text-sm p-3 bg-brand-surface hover:bg-brand-surface2 transition-colors text-left"
              >
                <span className="font-medium text-brand-subtle min-w-[24px]">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getBlockTypeIcon(block.type)}</span>
                    <span className="font-medium text-brand-ink">{block.title}</span>
                    <span className="text-xs text-brand-subtle capitalize">({block.type})</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {block.isRingFenced && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                        🔒 Proprietary
                      </span>
                    )}
                    {block.source === 'ai_generated' && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        🤖 AI-Generated
                      </span>
                    )}
                    {block.source === 'public_web' && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                        🌐 Public Research
                      </span>
                    )}
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-brand-subtle transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isExpanded && (
                <div className="p-4 bg-brand-surface border-t border-brand-border">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-brand-subtle uppercase tracking-wide mb-1">
                        Content
                      </p>
                      <p className="text-sm text-brand-ink whitespace-pre-wrap">{block.content}</p>
                    </div>
                    
                    {block.citations && block.citations.length > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-2">
                          📚 Citations ({block.citations.length})
                        </p>
                        <div className="space-y-2">
                          {block.citations.map((citation, idx) => (
                            <div key={idx} className="text-xs text-green-800">
                              <p className="font-medium">
                                {citation.authors.join(', ')} {citation.year && `(${citation.year})`}
                              </p>
                              <p className="italic">{citation.title}</p>
                              {citation.publisher && <p>Publisher: {citation.publisher}</p>}
                              {citation.doi && <p className="text-green-600">DOI: {citation.doi}</p>}
                              {citation.url && (
                                <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  View source
                                </a>
                              )}
                              {citation.isPeerReviewed && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-green-200 text-green-900 rounded text-xs">
                                  ✓ Peer-reviewed
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {adaptiveDescription && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                          Adaptive Learning
                        </p>
                        <p className="text-sm text-blue-800">{adaptiveDescription}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-brand-subtle mb-1">Type</p>
                        <p className="text-brand-ink font-medium capitalize">{block.type}</p>
                      </div>
                      <div>
                        <p className="text-brand-subtle mb-1">Source</p>
                        <p className="text-brand-ink font-medium">{block.sourceLabel || block.source.replace('_', ' ')}</p>
                      </div>
                    </div>
                    
                    {block.isRingFenced && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-semibold text-yellow-900 uppercase tracking-wide mb-1">
                          🔒 Proprietary Content
                        </p>
                        <p className="text-xs text-yellow-800">
                          This section contains company-specific information and will only be visible to authorized team members
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-brand-border">
        <p className="text-xs text-brand-subtle mb-2">Content Sources:</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {proprietaryCount > 0 && (
            <span className="text-brand-ink">
              <strong>{proprietaryCount}</strong> proprietary section{proprietaryCount !== 1 ? 's' : ''} 🔒
            </span>
          )}
          {aiCount > 0 && (
            <span className="text-brand-ink">
              <strong>{aiCount}</strong> AI-generated section{aiCount !== 1 ? 's' : ''} 🤖
            </span>
          )}
          {publicCount > 0 && (
            <span className="text-brand-ink">
              <strong>{publicCount}</strong> research section{publicCount !== 1 ? 's' : ''} 🌐
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
