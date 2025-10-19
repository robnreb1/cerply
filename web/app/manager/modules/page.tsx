'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Module {
  id: string;
  title: string;
  description?: string;
  status: string;
  difficulty_level?: string;
  paused_at?: string;
  created_at: string;
  estimated_minutes?: number;
}

export default function ManagerModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // Form state for new module
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    difficulty_level: 'intermediate',
    estimated_minutes: 30,
  });

  useEffect(() => {
    loadModules();
  }, []);

  async function loadModules() {
    try {
      setLoading(true);
      const res = await fetch('/api/curator/modules', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to load modules: ${res.status}`);
      }
      
      const data = await res.json();
      setModules(data.modules || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createModule() {
    if (!newModule.title.trim()) {
      alert('Please enter a module title');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/curator/modules/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newModule.title,
          description: newModule.description || null,
          difficultyLevel: newModule.difficulty_level,
          estimatedMinutes: newModule.estimated_minutes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to create module');
      }

      const data = await res.json();
      alert(`Module created! ID: ${data.moduleId}`);
      
      // Reset form
      setNewModule({
        title: '',
        description: '',
        difficulty_level: 'intermediate',
        estimated_minutes: 30,
      });
      
      // Reload modules list
      await loadModules();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function togglePause(module: Module) {
    const isPaused = !!module.paused_at;
    const endpoint = isPaused ? 'unpause' : 'pause';
    
    try {
      const res = await fetch(`/api/curator/modules/${module.id}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || `Failed to ${endpoint} module`);
      }

      alert(`Module ${isPaused ? 'unpaused' : 'paused'} successfully!`);
      await loadModules();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function viewAnalytics(moduleId: string) {
    router.push(`/manager/modules/${moduleId}/analytics`);
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">Loading modules...</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold mb-2">Manager Modules</h1>
        <p className="text-neutral-600">Create and manage learning modules for your team</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      )}

      {/* Create New Module Form */}
      <section className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Create New Module</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newModule.title}
              onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              placeholder="e.g., TypeScript Basics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Difficulty Level</label>
            <select
              value={newModule.difficulty_level}
              onChange={(e) => setNewModule({ ...newModule, difficulty_level: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estimated Minutes</label>
            <input
              type="number"
              value={newModule.estimated_minutes}
              onChange={(e) => setNewModule({ ...newModule, estimated_minutes: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              placeholder="Brief description"
            />
          </div>
        </div>

        <button
          onClick={createModule}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Create Module'}
        </button>
      </section>

      {/* Modules List */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Existing Modules ({modules.length})</h2>
        
        {modules.length === 0 ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center text-neutral-500">
            No modules yet. Create your first module above!
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module) => (
              <div
                key={module.id}
                className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{module.title}</h3>
                    {module.description && (
                      <p className="text-neutral-600 text-sm mt-1">{module.description}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      module.paused_at 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : module.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-neutral-100 text-neutral-800'
                    }`}>
                      {module.paused_at ? 'Paused' : module.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-neutral-600">
                  {module.difficulty_level && (
                    <span>
                      📊 <strong>Difficulty:</strong> {module.difficulty_level}
                    </span>
                  )}
                  {module.estimated_minutes && (
                    <span>
                      ⏱️ <strong>Duration:</strong> {module.estimated_minutes} min
                    </span>
                  )}
                  <span>
                    🆔 <strong>ID:</strong> <code className="text-xs">{module.id.slice(0, 8)}...</code>
                  </span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => togglePause(module)}
                    className="px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 rounded-md"
                  >
                    {module.paused_at ? '▶️ Unpause' : '⏸️ Pause'}
                  </button>
                  <button
                    onClick={() => viewAnalytics(module.id)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md"
                  >
                    📊 Analytics
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

