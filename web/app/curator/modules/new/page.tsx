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
  estimatedMinutes: number;
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
}

export default function ConversationalModuleCreationPage() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([
    {
      role: 'agent',
      content: "Hello! I'm here to help you create a training module for your team.\n\nWhat would you like to teach them? It could be anything - from sales techniques to software skills, safety procedures to leadership principles.\n\nJust tell me what's on your mind, and we'll build it together.",
      timestamp: new Date(),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

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
          <button
            onClick={() => router.push('/curator/modules')}
            className="text-sm text-brand-subtle hover:text-brand-ink"
          >
            ← Back
          </button>
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
                    <ModulePreviewCard preview={turn.modulePreview} />
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
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message... (or upload files)"
              className="flex-1 rounded-lg border border-brand-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-coral-500 text-brand-ink placeholder:text-brand-subtle"
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
          
          <p className="mt-2 text-xs text-brand-subtle text-center">
            Press Enter to send • Upload company documents for proprietary training content
          </p>
        </div>
      </div>
    </div>
  );
}

function ModulePreviewCard({ preview }: { preview: ModulePreview }) {
  const proprietaryCount = preview.contentBlocks.filter(b => b.source === 'proprietary').length;
  const aiCount = preview.contentBlocks.filter(b => b.source === 'ai_generated').length;
  const publicCount = preview.contentBlocks.filter(b => b.source === 'public_web').length;

  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface2 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-brand-ink">{preview.title}</h3>
          <p className="text-sm text-brand-subtle mt-1">{preview.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 p-4 bg-brand-surface rounded-lg border border-brand-border">
        <div>
          <p className="text-xs text-brand-subtle uppercase tracking-wide mb-1">Target Level</p>
          <p className="text-sm font-semibold text-brand-ink capitalize">{preview.targetMasteryLevel}</p>
        </div>
        <div>
          <p className="text-xs text-brand-subtle uppercase tracking-wide mb-1">Est. Time</p>
          <p className="text-sm font-semibold text-brand-ink">{preview.estimatedMinutes} min</p>
        </div>
        <div>
          <p className="text-xs text-brand-subtle uppercase tracking-wide mb-1">Target Proficiency</p>
          <p className="text-sm font-semibold text-brand-ink">{preview.targetProficiencyPct}%</p>
        </div>
        {preview.suggestedDeadline && (
          <div>
            <p className="text-xs text-brand-subtle uppercase tracking-wide mb-1">Deadline</p>
            <p className="text-sm font-semibold text-brand-ink">
              {new Date(preview.suggestedDeadline).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-brand-ink">Content Structure ({preview.contentBlocks.length} sections):</p>
        {preview.contentBlocks.map((block, i) => (
          <div key={i} className="flex items-start gap-3 text-sm p-3 bg-brand-surface rounded-lg border border-brand-border hover:shadow-sm transition-shadow">
            <span className="font-medium text-brand-subtle min-w-[24px]">{i + 1}.</span>
            <div className="flex-1">
              <span className="font-medium text-brand-ink">{block.title}</span>
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
          </div>
        ))}
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
