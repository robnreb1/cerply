'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface Module {
  id: string;
  title: string;
  content: string;
  questions: Question[];
  examples?: string[];
  provenance?: {
    content_source?: string;
    questions_source?: string[];
    confidence?: number;
  };
}

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const generationId = params.id as string;
  
  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  const [modules, setModules] = useState<Module[]>([]);
  const [provenance, setProvenance] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [generationTimeMs, setGenerationTimeMs] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    // Start generation
    startGeneration();

    // Poll for results
    const interval = setInterval(pollGeneration, 3000);

    return () => clearInterval(interval);
  }, [generationId]);

  async function startGeneration() {
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generationId, contentType: 'generic' }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to start generation');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('failed');
    }
  }

  async function pollGeneration() {
    try {
      const res = await fetch(`/api/content/generations/${generationId}`, {
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch generation');
      }
      
      setStatus(data.status);
      setProgress(data.progress);
      
      if (data.status === 'completed') {
        setModules(data.modules || []);
        setProvenance(data.provenance || []);
        setTotalCost(data.totalCost || 0);
        setTotalTokens(data.totalTokens || 0);
        setGenerationTimeMs(data.generationTimeMs || 0);
      }
      
      if (data.status === 'failed') {
        setError('Generation failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleApprove() {
    try {
      const res = await fetch(`/api/content/generations/${generationId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approved: true }),
        credentials: 'include',
      });
      
      if (res.ok) {
        alert('Content approved and published!');
        router.push('/curator');
      }
    } catch (err: any) {
      alert('Failed to approve content: ' + err.message);
    }
  }

  if (status === 'failed' || error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-12 text-red-800">
          <strong>Generation Failed:</strong> {error}
        </div>
        <button
          onClick={() => router.push('/curator/understand')}
          className="mt-4 px-6 py-2 bg-brand-primary text-white rounded-12 hover:bg-brand-primary-hover transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (status !== 'completed') {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8 text-brand-ink">Generating Content...</h1>
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-brand-ink-muted">Progress</span>
              <span className="text-sm text-brand-ink-muted">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <p className="text-brand-ink-muted mt-4">
            🤖 Running 3-LLM Ensemble Pipeline...<br/>
            Generator A (GPT-4o) and Generator B (Claude Sonnet) are creating content independently,<br/>
            then Fact-Checker (GPT-4) will verify accuracy and select the best elements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-ink mb-2">Generated Content</h1>
        <div className="flex gap-4 text-sm text-brand-ink-muted">
          <span>Cost: ${totalCost.toFixed(4)}</span>
          <span>•</span>
          <span>{totalTokens.toLocaleString()} tokens</span>
          <span>•</span>
          <span>{(generationTimeMs / 1000).toFixed(1)}s</span>
        </div>
      </div>
      
      {modules.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-12 text-yellow-800">
          No modules generated. This may indicate an issue with the LLM response.
        </div>
      )}

      {modules.map((module, idx) => (
        <div key={idx} className="mb-8 p-6 border border-brand-border rounded-12 bg-brand-surface shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-brand-ink">{module.title}</h2>
          <p className="mb-4 text-brand-ink whitespace-pre-wrap">{module.content}</p>
          
          {module.provenance && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-12 text-sm text-blue-900">
              <strong>🔍 Provenance:</strong> Content from {module.provenance.content_source || 'unknown'}
              {module.provenance.questions_source && (
                <>, Questions from {module.provenance.questions_source.join(', ')}</>
              )}
              {module.provenance.confidence && (
                <> (Confidence: {(module.provenance.confidence * 100).toFixed(0)}%)</>
              )}
            </div>
          )}
          
          <h3 className="text-lg font-semibold mt-6 mb-2 text-brand-ink">Questions:</h3>
          {module.questions && module.questions.map((q: Question, qIdx: number) => (
            <div key={qIdx} className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-12">
              <p className="font-medium text-brand-ink mb-2">{q.text}</p>
              <ul className="space-y-1 mb-2">
                {q.options && q.options.map((opt: string, oIdx: number) => (
                  <li 
                    key={oIdx} 
                    className={opt === q.correctAnswer ? 'text-green-600 font-semibold' : 'text-brand-ink'}
                  >
                    {opt} {opt === q.correctAnswer && '✓'}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-brand-ink-muted">
                <strong>Explanation:</strong> {q.explanation}
              </p>
            </div>
          ))}
          
          {module.examples && module.examples.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-brand-ink mb-2">Examples:</h4>
              <ul className="list-disc list-inside space-y-1 text-brand-ink-muted">
                {module.examples.map((ex, exIdx) => (
                  <li key={exIdx}>{ex}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
      
      {modules.length > 0 && (
        <div className="flex gap-4">
          <button 
            onClick={handleApprove}
            className="px-6 py-3 bg-green-600 text-white rounded-12 text-lg hover:bg-green-700 transition-colors"
          >
            ✓ Approve & Publish
          </button>
          <button 
            onClick={() => router.push('/curator/understand')}
            className="px-6 py-3 bg-gray-600 text-white rounded-12 text-lg hover:bg-gray-700 transition-colors"
          >
            Create New
          </button>
        </div>
      )}
    </div>
  );
}

