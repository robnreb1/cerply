"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Module {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  is_mandatory: boolean;
  estimated_minutes: number;
  created_at: string;
  topic_title: string;
  assignment_count: number;
  completion_count: number;
  in_progress_count: number;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'active' | 'archived'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, [filter]);

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/curator/modules${statusParam}`, {
        headers: { 
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token' 
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to fetch modules');
      }
      
      const data = await res.json();
      setModules(data.modules || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompletionRate = (module: Module) => {
    if (module.assignment_count === 0) return 0;
    return Math.round((module.completion_count / module.assignment_count) * 100);
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">My Training Modules</h1>
            <p className="mt-2 text-brand-subtle">Create, assign, and track training modules for your team</p>
          </div>
          <Link 
            href="/curator/modules/new"
            className="btn btn-primary px-6 py-3 bg-brand-coral-500 text-white rounded-lg hover:bg-brand-coral-600 transition-colors no-underline"
          >
            + Create Module
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 border-b border-brand-border">
          {(['all', 'draft', 'active', 'archived'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                filter === status
                  ? 'border-brand-coral-500 text-brand-coral-500'
                  : 'border-transparent text-brand-subtle hover:text-brand-ink'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-coral-500 border-t-transparent"></div>
            <p className="mt-4 text-brand-subtle">Loading modules...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button 
              onClick={fetchModules}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && modules.length === 0 && (
          <div className="text-center py-12 bg-brand-surface rounded-lg border border-brand-border">
            <svg className="mx-auto h-12 w-12 text-brand-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-brand-ink">No modules yet</h3>
            <p className="mt-2 text-brand-subtle">Get started by creating your first training module</p>
            <Link 
              href="/curator/modules/new"
              className="mt-4 inline-block btn btn-primary px-6 py-2 bg-brand-coral-500 text-white rounded-lg hover:bg-brand-coral-600 no-underline"
            >
              Create Module
            </Link>
          </div>
        )}

        {/* Module grid */}
        {!loading && !error && modules.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map(module => (
              <ModuleCard key={module.id} module={module} getStatusBadgeColor={getStatusBadgeColor} getCompletionRate={getCompletionRate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ModuleCardProps {
  module: Module;
  getStatusBadgeColor: (status: string) => string;
  getCompletionRate: (module: Module) => number;
}

function ModuleCard({ module, getStatusBadgeColor, getCompletionRate }: ModuleCardProps) {
  const completionRate = getCompletionRate(module);

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-border hover:shadow-md transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-brand-ink line-clamp-2">{module.title}</h3>
        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(module.status)}`}>
          {module.status}
        </span>
      </div>

      {/* Topic */}
      {module.topic_title && (
        <p className="text-sm text-brand-subtle mb-3">
          📚 {module.topic_title}
        </p>
      )}

      {/* Description */}
      {module.description && (
        <p className="text-sm text-brand-subtle mb-4 line-clamp-2">
          {module.description}
        </p>
      )}

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-brand-subtle">Assigned</span>
          <span className="font-medium text-brand-ink">{module.assignment_count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-brand-subtle">In Progress</span>
          <span className="font-medium text-brand-ink">{module.in_progress_count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-brand-subtle">Completed</span>
          <span className="font-medium text-brand-ink">{module.completion_count}</span>
        </div>
        
        {/* Progress bar */}
        {module.assignment_count > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-brand-subtle mb-1">
              <span>Completion rate</span>
              <span>{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-brand-coral-500 h-2 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      {module.estimated_minutes && (
        <p className="text-xs text-brand-subtle mb-4">
          ⏱️ {module.estimated_minutes} minutes
          {module.is_mandatory && <span className="ml-2">• 🔒 Mandatory</span>}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-brand-border">
        <Link 
          href={`/curator/modules/${module.id}/edit`}
          className="flex-1 text-center px-3 py-2 text-sm font-medium text-brand-ink bg-brand-surface2 rounded hover:bg-brand-border transition-colors no-underline"
        >
          Edit
        </Link>
        <Link 
          href={`/curator/modules/${module.id}/assign`}
          className="flex-1 text-center px-3 py-2 text-sm font-medium text-brand-ink bg-brand-surface2 rounded hover:bg-brand-border transition-colors no-underline"
        >
          Assign
        </Link>
        <Link 
          href={`/curator/modules/${module.id}/analytics`}
          className="flex-1 text-center px-3 py-2 text-sm font-medium text-brand-ink bg-brand-surface2 rounded hover:bg-brand-border transition-colors no-underline"
        >
          Analytics
        </Link>
      </div>
    </div>
  );
}

