'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
  module: {
    id: string;
    title: string;
    difficulty_level?: string;
  };
  questionStats: Array<{
    question_id: string;
    attempts_count: number;
    correct_count: number;
    incorrect_count: number;
    success_rate: string;
    avg_time_seconds: string;
    perceived_difficulty?: string;
    skip_count: number;
    hint_requests_count: number;
  }>;
}

export default function ModuleAnalyticsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [params.id]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const res = await fetch(`/api/curator/modules/${params.id}/analytics`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load analytics: ${res.status}`);
      }

      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">Loading analytics...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error || 'Failed to load analytics'}
        </div>
        <button
          onClick={() => router.push('/manager/modules')}
          className="mt-4 px-4 py-2 bg-neutral-100 rounded-md hover:bg-neutral-200"
        >
          ← Back to Modules
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/manager/modules')}
            className="text-sm text-blue-600 hover:underline mb-2"
          >
            ← Back to Modules
          </button>
          <h1 className="text-3xl font-bold">{data.module.title}</h1>
          <p className="text-neutral-600 mt-1">
            Module Analytics
            {data.module.difficulty_level && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {data.module.difficulty_level}
              </span>
            )}
          </p>
        </div>
      </header>

      {/* Question-Level Statistics */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Question Performance (Epic 14 P0)</h2>
        
        {data.questionStats.length === 0 ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center text-neutral-500">
            No question performance data yet. Questions will appear here after learners start attempting them.
          </div>
        ) : (
          <div className="space-y-3">
            {data.questionStats.map((stat, idx) => (
              <div
                key={stat.question_id}
                className="bg-white border border-neutral-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">
                      Question {idx + 1}
                      <code className="ml-2 text-xs text-neutral-500 font-mono">
                        {stat.question_id.slice(0, 8)}...
                      </code>
                    </h3>
                    {stat.perceived_difficulty && (
                      <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                        stat.perceived_difficulty === 'too_easy' ? 'bg-green-100 text-green-800' :
                        stat.perceived_difficulty === 'easy' ? 'bg-blue-100 text-blue-800' :
                        stat.perceived_difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        stat.perceived_difficulty === 'hard' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {stat.perceived_difficulty.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {(parseFloat(stat.success_rate) * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-neutral-500">Success Rate</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-neutral-500">Attempts</div>
                    <div className="text-lg font-semibold">{stat.attempts_count}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500">Correct</div>
                    <div className="text-lg font-semibold text-green-600">{stat.correct_count}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500">Incorrect</div>
                    <div className="text-lg font-semibold text-red-600">{stat.incorrect_count}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500">Avg Time</div>
                    <div className="text-lg font-semibold">{parseFloat(stat.avg_time_seconds).toFixed(1)}s</div>
                  </div>
                </div>

                {(stat.skip_count > 0 || stat.hint_requests_count > 0) && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex gap-4 text-xs text-neutral-600">
                    {stat.skip_count > 0 && (
                      <span>⏭️ Skipped: {stat.skip_count}</span>
                    )}
                    {stat.hint_requests_count > 0 && (
                      <span>💡 Hints: {stat.hint_requests_count}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Summary Stats */}
      {data.questionStats.length > 0 && (
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Overall Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-neutral-600">Total Questions</div>
              <div className="text-2xl font-bold">{data.questionStats.length}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Total Attempts</div>
              <div className="text-2xl font-bold">
                {data.questionStats.reduce((sum, stat) => sum + stat.attempts_count, 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Avg Success Rate</div>
              <div className="text-2xl font-bold">
                {(
                  data.questionStats.reduce((sum, stat) => sum + parseFloat(stat.success_rate), 0) / 
                  data.questionStats.length * 100
                ).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Avg Time</div>
              <div className="text-2xl font-bold">
                {(
                  data.questionStats.reduce((sum, stat) => sum + parseFloat(stat.avg_time_seconds), 0) / 
                  data.questionStats.length
                ).toFixed(1)}s
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

