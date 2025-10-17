"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'topic' | 'generating' | 'review';

interface GeneratedTopic {
  id: string;
  title: string;
  description: string;
  subject_id?: string;
}

export default function NewModulePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('topic');
  const [topicInput, setTopicInput] = useState('');
  const [generatedTopic, setGeneratedTopic] = useState<GeneratedTopic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Module configuration
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);

  const handleGenerateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;
    
    setLoading(true);
    setError(null);
    setStep('generating');
    
    try {
      // For now, we'll use a simple approach - in production, this would use
      // the Agent Orchestrator for conversational refinement
      const res = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token'
        },
        body: JSON.stringify({ 
          userInput: topicInput,
          context: 'manager_module_creation',
          intent: 'create_module'
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to generate topic');
      }
      
      const data = await res.json();
      
      // Extract topic info from conversation response
      // In production, this would be more sophisticated
      const topic: GeneratedTopic = {
        id: data.topicId || 'temp-id',
        title: topicInput,
        description: data.response || 'Generated topic for training module',
      };
      
      setGeneratedTopic(topic);
      setModuleTitle(topic.title);
      setModuleDescription(topic.description);
      setStep('review');
    } catch (err: any) {
      setError(err.message);
      setStep('topic');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    if (!generatedTopic && !moduleTitle) {
      setError('Please provide a module title');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/curator/modules/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token'
        },
        body: JSON.stringify({
          topicId: generatedTopic?.id || null,
          title: moduleTitle,
          description: moduleDescription,
          isMandatory,
          estimatedMinutes,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to create module');
      }
      
      const data = await res.json();
      
      // Redirect to edit page
      router.push(`/curator/modules/${data.moduleId}/edit`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-ink">Create New Module</h1>
          <p className="mt-2 text-brand-subtle">
            Create a training module from a topic or subject area
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${step === 'topic' || step === 'generating' ? 'text-brand-coral-500' : 'text-brand-subtle'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'topic' || step === 'generating' ? 'border-brand-coral-500 bg-brand-coral-500 text-white' : 'border-brand-border bg-brand-surface'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Topic</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${step === 'review' ? 'bg-brand-coral-500' : 'bg-brand-border'}`} />
            <div className={`flex items-center ${step === 'review' ? 'text-brand-coral-500' : 'text-brand-subtle'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'review' ? 'border-brand-coral-500 bg-brand-coral-500 text-white' : 'border-brand-border bg-brand-surface'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Review & Create</span>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Topic Input */}
        {step === 'topic' && (
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <form onSubmit={handleGenerateTopic}>
              <label className="block mb-4">
                <span className="block text-sm font-medium text-brand-ink mb-2">
                  What topic would you like to create a module for?
                </span>
                <textarea
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  placeholder="e.g., Effective delegation for managers, Python data analysis fundamentals, Sales negotiation techniques"
                  className="w-full border border-brand-border rounded-lg p-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                  required
                />
                <span className="text-sm text-brand-subtle mt-2 block">
                  Tip: Be specific about the level and audience (e.g., "beginner", "for engineering managers")
                </span>
              </label>
              
              <button 
                type="submit"
                className="w-full btn btn-primary px-6 py-3 bg-brand-coral-500 text-white rounded-lg hover:bg-brand-coral-600 transition-colors"
                disabled={loading || !topicInput.trim()}
              >
                Generate Topic
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Generating */}
        {step === 'generating' && (
          <div className="bg-brand-surface rounded-lg border border-brand-border p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-coral-500 border-t-transparent mb-4"></div>
            <h3 className="text-lg font-medium text-brand-ink mb-2">Generating topic...</h3>
            <p className="text-brand-subtle">
              Our AI is analyzing your request and preparing content
            </p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
              <h2 className="text-xl font-semibold text-brand-ink mb-4">Review Module Details</h2>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="block text-sm font-medium text-brand-ink mb-2">Module Title *</span>
                  <input
                    type="text"
                    value={moduleTitle}
                    onChange={e => setModuleTitle(e.target.value)}
                    className="w-full border border-brand-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                    required
                  />
                </label>
                
                <label className="block">
                  <span className="block text-sm font-medium text-brand-ink mb-2">Description</span>
                  <textarea
                    value={moduleDescription}
                    onChange={e => setModuleDescription(e.target.value)}
                    className="w-full border border-brand-border rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                  />
                </label>
                
                <label className="block">
                  <span className="block text-sm font-medium text-brand-ink mb-2">Estimated Duration (minutes)</span>
                  <input
                    type="number"
                    value={estimatedMinutes}
                    onChange={e => setEstimatedMinutes(Number(e.target.value))}
                    min="5"
                    max="480"
                    className="w-full border border-brand-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                  />
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={e => setIsMandatory(e.target.checked)}
                    className="w-4 h-4 text-brand-coral-500 border-brand-border rounded focus:ring-brand-coral-500"
                  />
                  <span className="ml-2 text-sm font-medium text-brand-ink">
                    Make this module mandatory
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep('topic');
                  setError(null);
                }}
                className="flex-1 px-6 py-3 bg-brand-surface2 text-brand-ink rounded-lg hover:bg-brand-border transition-colors"
                disabled={loading}
              >
                ← Back
              </button>
              <button
                onClick={handleCreateModule}
                className="flex-1 px-6 py-3 bg-brand-coral-500 text-white rounded-lg hover:bg-brand-coral-600 transition-colors"
                disabled={loading || !moduleTitle.trim()}
              >
                {loading ? 'Creating...' : 'Create Module'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

