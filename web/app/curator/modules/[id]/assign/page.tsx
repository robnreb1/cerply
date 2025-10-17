"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  member_count: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

export default function ModuleAssignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isMandatory, setIsMandatory] = useState(false);
  const [dueDate, setDueDate] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams', {
        headers: { 
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token' 
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const res = await fetch(`/api/curator/modules/${id}/assign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token'
        },
        body: JSON.stringify({
          teamIds: selectedTeams,
          roleFilters: selectedRoles.length > 0 ? selectedRoles : undefined,
          isMandatory,
          dueDate: dueDate || undefined,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to assign module');
      }
      
      const data = await res.json();
      setSuccess(true);
      
      // Show success message and redirect after delay
      alert(`Module assigned to ${data.assigned} user(s) successfully!`);
      setTimeout(() => {
        router.push(`/curator/modules/${id}/analytics`);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/curator/modules/${id}/edit`} className="text-brand-coral-500 hover:text-brand-coral-600 mb-4 inline-block">
            ← Back to module
          </Link>
          <h1 className="text-3xl font-bold text-brand-ink">Assign Module to Team</h1>
          <p className="mt-2 text-brand-subtle">Select teams and configure assignment settings</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">Module assigned successfully! Redirecting...</p>
          </div>
        )}

        <form onSubmit={handleAssign} className="space-y-6">
          {/* Select teams */}
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <h2 className="text-xl font-semibold text-brand-ink mb-4">Select Teams *</h2>
            <p className="text-sm text-brand-subtle mb-4">Choose which teams should be assigned this module</p>
            
            {teams.length === 0 ? (
              <p className="text-brand-subtle text-sm">No teams available. Create a team first.</p>
            ) : (
              <div className="space-y-2">
                {teams.map(team => (
                  <label key={team.id} className="flex items-center p-3 border border-brand-border rounded-lg hover:bg-brand-surface2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      className="w-4 h-4 text-brand-coral-500 border-brand-border rounded focus:ring-brand-coral-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="block font-medium text-brand-ink">{team.name}</span>
                      <span className="text-sm text-brand-subtle">{team.member_count || 0} members</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Role filters (optional) */}
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <h2 className="text-xl font-semibold text-brand-ink mb-4">Filter by Role (Optional)</h2>
            <p className="text-sm text-brand-subtle mb-4">Optionally limit assignment to specific roles within selected teams</p>
            
            <div className="space-y-2">
              {['learner', 'manager', 'admin'].map(role => (
                <label key={role} className="flex items-center p-3 border border-brand-border rounded-lg hover:bg-brand-surface2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="w-4 h-4 text-brand-coral-500 border-brand-border rounded focus:ring-brand-coral-500"
                  />
                  <span className="ml-3 font-medium text-brand-ink capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assignment settings */}
          <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
            <h2 className="text-xl font-semibold text-brand-ink mb-4">Assignment Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={e => setIsMandatory(e.target.checked)}
                  className="w-4 h-4 mt-1 text-brand-coral-500 border-brand-border rounded focus:ring-brand-coral-500"
                />
                <div className="ml-3">
                  <span className="block font-medium text-brand-ink">Make this assignment mandatory</span>
                  <span className="text-sm text-brand-subtle">Users will be required to complete this module</span>
                </div>
              </label>
              
              <label className="block">
                <span className="block text-sm font-medium text-brand-ink mb-2">Due Date (Optional)</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-brand-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                />
                <span className="text-sm text-brand-subtle mt-1 block">
                  Leave blank for no due date
                </span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Link
              href={`/curator/modules/${id}/edit`}
              className="flex-1 px-6 py-3 bg-brand-surface2 text-brand-ink rounded-lg hover:bg-brand-border transition-colors text-center no-underline"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || selectedTeams.length === 0}
              className="flex-1 px-6 py-3 bg-brand-coral-500 text-white rounded-lg hover:bg-brand-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : `Assign to ${selectedTeams.length} Team(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

