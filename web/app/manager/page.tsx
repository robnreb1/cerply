'use client';

import { useRouter } from 'next/navigation';

export default function ManagerPage() {
  const router = useRouter();

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-4xl font-bold mb-2">Manager Dashboard</h1>
        <p className="text-lg text-neutral-600">Epic 14: Manager Module Workflows</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => router.push('/manager/modules')}
          className="bg-white border-2 border-blue-200 rounded-lg p-8 text-left hover:border-blue-400 hover:shadow-lg transition-all"
        >
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold mb-2">Learning Modules</h2>
          <p className="text-neutral-600">
            Create, manage, and track learning modules for your team.
            Set difficulty levels, pause/unpause, and view analytics.
          </p>
          <div className="mt-4 text-blue-600 font-medium">
            Manage Modules →
          </div>
        </button>

        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-lg p-8 text-left opacity-50">
          <div className="text-4xl mb-4">👥</div>
          <h2 className="text-2xl font-semibold mb-2">Team Overview</h2>
          <p className="text-neutral-600">
            View team progress, performance metrics, and learning paths.
          </p>
          <div className="mt-4 text-neutral-400 font-medium">
            Coming Soon
          </div>
        </div>
      </section>

      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-3">🎯 Epic 14 P0 Features (Deployed)</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Difficulty Levels:</strong> Set beginner, intermediate, advanced, or expert difficulty for each module</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Pause/Unpause:</strong> Control module availability with pause and unpause functionality</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Question Analytics:</strong> Track performance, success rates, and perceived difficulty for individual questions</span>
          </li>
        </ul>
      </section>
    </main>
  );
}

