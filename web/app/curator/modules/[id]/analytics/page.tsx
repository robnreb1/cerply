"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Module {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface Stats {
  assigned: number;
  inProgress: number;
  completed: number;
  overdue: number;
  avgMasteryScore: number;
  avgTimeSpent: number;
}

interface Assignment {
  id: string;
  user_id: string;
  user_email: string;
  status: string;
  assigned_at: string;
  due_date: string;
  deadline_at: string; // v2.0 proficiency deadline
  started_at: string;
  completed_at: string;
  mastery_score: number;
  time_spent_seconds: number;
  current_proficiency_pct: number; // v2.0 proficiency tracking
  target_proficiency_pct: number; // v2.0 proficiency target
  risk_status: 'on_track' | 'at_risk' | 'overdue' | 'achieved'; // v2.0 risk status
}

export default function ModuleAnalyticsPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [module, setModule] = useState<Module | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProgress();
    }
  }, [id]);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/curator/modules/${id}/progress`, {
        headers: { 
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token' 
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to fetch progress');
      }
      
      const data = await res.json();
      setModule(data.module);
      setStats(data.stats);
      setAssignments(data.assignments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAssignments = () => {
    const now = new Date();
    
    switch (filter) {
      case 'assigned':
        return assignments.filter(a => a.status === 'assigned');
      case 'in_progress':
        return assignments.filter(a => a.status === 'in_progress');
      case 'completed':
        return assignments.filter(a => a.status === 'completed');
      case 'overdue':
        return assignments.filter(a => 
          a.due_date && 
          new Date(a.due_date) < now && 
          a.status !== 'completed'
        );
      default:
        return assignments;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getRiskStatusBadge = (riskStatus: string) => {
    switch (riskStatus) {
      case 'achieved': return { color: 'bg-green-100 text-green-800', icon: '✓', label: 'Achieved' };
      case 'on_track': return { color: 'bg-blue-100 text-blue-800', icon: '→', label: 'On Track' };
      case 'at_risk': return { color: 'bg-orange-100 text-orange-800', icon: '⚠', label: 'At Risk' };
      case 'overdue': return { color: 'bg-red-100 text-red-800', icon: '!', label: 'Overdue' };
      default: return { color: 'bg-gray-100 text-gray-800', icon: '•', label: status };
    }
  };

  const isOverdue = (assignment: Assignment) => {
    if (!assignment.due_date || assignment.status === 'completed') return false;
    return new Date(assignment.due_date) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-coral-500 border-t-transparent"></div>
          <p className="mt-4 text-brand-subtle">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href={`/curator/modules/${id}/edit`} className="text-brand-coral-500">
            ← Back to module
          </Link>
        </div>
      </div>
    );
  }

  if (!module || !stats) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-subtle">No data available</p>
          <Link href={`/curator/modules/${id}/edit`} className="mt-4 text-brand-coral-500">
            ← Back to module
          </Link>
        </div>
      </div>
    );
  }

  const filteredAssignments = getFilteredAssignments();

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/curator/modules/${id}/edit`} className="text-brand-coral-500 hover:text-brand-coral-600 mb-4 inline-block">
            ← Back to module
          </Link>
          <h1 className="text-3xl font-bold text-brand-ink">{module.title}</h1>
          <p className="mt-2 text-brand-subtle">Progress tracking and analytics</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <p className="text-sm text-brand-subtle mb-2">Total Assigned</p>
            <p className="text-3xl font-bold text-brand-ink">{stats.assigned}</p>
          </div>
          
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <p className="text-sm text-brand-subtle mb-2">In Progress</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.inProgress}</p>
          </div>
          
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <p className="text-sm text-brand-subtle mb-2">Completed</p>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            {stats.assigned > 0 && (
              <p className="text-xs text-brand-subtle mt-2">
                {Math.round((stats.completed / stats.assigned) * 100)}% completion rate
              </p>
            )}
          </div>
          
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <p className="text-sm text-brand-subtle mb-2">At Risk</p>
            <p className="text-3xl font-bold text-orange-600">
              {assignments.filter(a => a.risk_status === 'at_risk').length}
            </p>
            <p className="text-xs text-brand-subtle mt-2">
              &lt;7 days to deadline
            </p>
          </div>
          
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <p className="text-sm text-brand-subtle mb-2">Overdue</p>
            <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Performance metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <h3 className="font-semibold text-brand-ink mb-4">Average Mastery Score</h3>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold text-brand-ink">
                {stats.avgMasteryScore ? `${Math.round(stats.avgMasteryScore * 100)}%` : 'N/A'}
              </p>
              {stats.avgMasteryScore > 0 && (
                <div className="flex-1 mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-brand-coral-500 h-3 rounded-full transition-all"
                      style={{ width: `${stats.avgMasteryScore * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-brand-subtle mt-2">Across completed assignments</p>
          </div>
          
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <h3 className="font-semibold text-brand-ink mb-4">Average Time Spent</h3>
            <p className="text-4xl font-bold text-brand-ink">
              {formatDuration(stats.avgTimeSpent)}
            </p>
            <p className="text-sm text-brand-subtle mt-2">Per learner</p>
          </div>
        </div>

        {/* Assignments table */}
        <div className="bg-brand-surface rounded-lg border border-brand-border">
          {/* Filter tabs */}
          <div className="flex gap-2 p-4 border-b border-brand-border overflow-x-auto">
            {([
              { key: 'all', label: 'All' },
              { key: 'assigned', label: 'Not Started' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
              { key: 'overdue', label: 'Overdue' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 font-medium rounded transition-colors whitespace-nowrap ${
                  filter === key
                    ? 'bg-brand-coral-500 text-white'
                    : 'bg-brand-surface2 text-brand-ink hover:bg-brand-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-surface2 border-b border-brand-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-subtle uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-subtle uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-subtle uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-subtle uppercase tracking-wider">
                    Proficiency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-subtle uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-subtle uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-subtle uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brand-subtle uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-brand-subtle">
                      No assignments found for this filter
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map(assignment => {
                    const riskBadge = getRiskStatusBadge(assignment.risk_status || 'on_track');
                    return (
                      <tr key={assignment.id} className="hover:bg-brand-surface2">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-brand-ink">{assignment.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(assignment.status)}`}>
                            {assignment.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${riskBadge.color}`}>
                            {riskBadge.icon} {riskBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignment.current_proficiency_pct !== undefined ? (
                            <div>
                              <div className="text-sm font-medium text-brand-ink">
                                {assignment.current_proficiency_pct}%
                                {assignment.target_proficiency_pct && (
                                  <span className="text-xs text-brand-subtle"> / {assignment.target_proficiency_pct}%</span>
                                )}
                              </div>
                              {assignment.target_proficiency_pct && (
                                <div className="mt-1 w-24 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full ${
                                      assignment.current_proficiency_pct >= assignment.target_proficiency_pct 
                                        ? 'bg-green-500' 
                                        : assignment.current_proficiency_pct >= assignment.target_proficiency_pct * 0.7
                                        ? 'bg-blue-500'
                                        : 'bg-orange-500'
                                    }`}
                                    style={{ width: `${Math.min(100, (assignment.current_proficiency_pct / assignment.target_proficiency_pct) * 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-brand-subtle">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-subtle">
                          {formatDate(assignment.assigned_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-subtle">
                          {formatDate(assignment.deadline_at || assignment.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-ink">
                          {assignment.mastery_score 
                            ? `${Math.round(assignment.mastery_score * 100)}%`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-ink">
                          {assignment.time_spent_seconds 
                            ? formatDuration(assignment.time_spent_seconds)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

