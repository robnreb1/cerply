'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UnderstandPage() {
  const router = useRouter();
  const [artefact, setArtefact] = useState('');
  const [understanding, setUnderstanding] = useState('');
  const [generationId, setGenerationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cost, setCost] = useState(0);
  const [tokens, setTokens] = useState(0);

  async function handleSubmit() {
    if (!artefact.trim()) {
      setError('Please enter some content');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/content/understand', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ artefact }),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to get understanding');
      }
      
      setUnderstanding(data.understanding);
      setGenerationId(data.generationId);
      setCost(data.cost);
      setTokens(data.tokens);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    router.push(`/curator/generate/${generationId}`);
  }

  async function handleRefine() {
    router.push(`/curator/refine/${generationId}`);
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 text-brand-ink">Upload Content Artefact</h1>
      <p className="text-brand-ink-muted mb-8">
        Paste your policy document, transcript, or learning material. The LLM will analyze it and explain its understanding.
      </p>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-brand-ink mb-2">
          Content Artefact (max 50,000 characters)
        </label>
        <textarea
          className="w-full h-64 p-4 border border-brand-border rounded-12 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-surface text-brand-ink"
          placeholder="Paste your policy document, transcript, or any learning material..."
          value={artefact}
          onChange={(e) => setArtefact(e.target.value)}
          disabled={loading}
        />
        <div className="mt-1 text-sm text-brand-ink-muted">
          {artefact.length.toLocaleString()} / 50,000 characters
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-12 text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <button
        onClick={handleSubmit}
        disabled={loading || !artefact.trim()}
        className="px-6 py-2 bg-brand-primary text-white rounded-12 hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Analyzing...' : 'Get Understanding'}
      </button>

      {understanding && (
        <div className="mt-8 p-6 bg-brand-surface border border-brand-border rounded-12 shadow-md">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-semibold text-brand-ink">LLM Understanding:</h2>
            <div className="text-sm text-brand-ink-muted">
              Cost: ${cost.toFixed(4)} • {tokens.toLocaleString()} tokens
            </div>
          </div>
          
          <p className="mb-6 text-brand-ink whitespace-pre-wrap">{understanding}</p>
          
          <div className="flex gap-4">
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-green-600 text-white rounded-12 hover:bg-green-700 transition-colors"
            >
              ✓ Confirm & Generate Content
            </button>
            <button
              onClick={handleRefine}
              className="px-6 py-2 bg-yellow-600 text-white rounded-12 hover:bg-yellow-700 transition-colors"
            >
              ✎ Refine Understanding
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

