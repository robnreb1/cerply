'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RefinePage() {
  const params = useParams();
  const router = useRouter();
  const generationId = params.id as string;
  
  const [understanding, setUnderstanding] = useState('');
  const [feedback, setFeedback] = useState('');
  const [iteration, setIteration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // In a real implementation, fetch the current generation to show the current understanding
    // For now, we'll just show the form
  }, [generationId]);

  async function handleRefine() {
    if (!feedback.trim()) {
      setError('Please provide feedback');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/content/refine', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generationId, feedback }),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to refine understanding');
      }
      
      setUnderstanding(data.understanding);
      setIteration(data.iteration);
      setFeedback('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    router.push(`/curator/generate/${generationId}`);
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 text-brand-ink">Refine Understanding</h1>
      <p className="text-brand-ink-muted mb-8">
        Provide feedback to adjust the LLM's understanding of your content. You can refine up to 3 times.
      </p>

      {iteration > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-12 text-blue-800">
          <strong>Iteration {iteration}/3</strong>
          {iteration >= 3 && ' - Maximum refinements reached'}
        </div>
      )}

      {understanding && (
        <div className="mb-6 p-6 bg-brand-surface border border-brand-border rounded-12">
          <h2 className="text-lg font-semibold text-brand-ink mb-2">Current Understanding:</h2>
          <p className="text-brand-ink whitespace-pre-wrap">{understanding}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-12 text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-brand-ink mb-2">
          Your Feedback
        </label>
        <textarea
          className="w-full h-32 p-4 border border-brand-border rounded-12 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-surface text-brand-ink"
          placeholder="e.g., 'Focus more on the evacuation routes and less on calling emergency services'"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={loading || iteration >= 3}
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleRefine}
          disabled={loading || !feedback.trim() || iteration >= 3}
          className="px-6 py-2 bg-brand-primary text-white rounded-12 hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Refining...' : 'Refine Understanding'}
        </button>
        
        {understanding && (
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-green-600 text-white rounded-12 hover:bg-green-700 transition-colors"
          >
            ✓ Confirm & Generate Content
          </button>
        )}
      </div>
    </div>
  );
}

