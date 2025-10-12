"use client";
/**
 * Manager Dashboard - Overview of all managed teams
 * Epic 4: Manager Dashboard - Analytics & Insights
 * BRD: B-2, B-14 | FSD: §24 Manager Dashboard & Analytics v1
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface TeamSummary {
  teamId: string;
  teamName: string;
  avgComprehension: number;
  activeLearners: number;
  atRiskCount: number;
  totalAttempts: number;
  trendingUp: boolean;
}

export default function ManagerDashboardPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      setLoading(true);
      setError(null);

      // Fetch teams list
      const teamsRes = await fetch("/api/teams");
      if (!teamsRes.ok) throw new Error("Failed to fetch teams");
      const teamsData = await teamsRes.json();

      // Fetch analytics for each team
      const teamAnalytics = await Promise.all(
        teamsData.map(async (team: any) => {
          try {
            const analyticsRes = await fetch(`/api/manager/teams/${team.id}/analytics`);
            if (!analyticsRes.ok) return null;
            return await analyticsRes.json();
          } catch {
            return null;
          }
        })
      );

      setTeams(teamAnalytics.filter(Boolean));
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-8">
        <div className="text-center">Loading dashboard...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      </main>
    );
  }

  // Calculate totals
  const totalLearners = teams.reduce((sum, t) => sum + t.activeLearners, 0);
  const avgComprehension =
    teams.length > 0 ? teams.reduce((sum, t) => sum + t.avgComprehension, 0) / teams.length : 0;
  const totalAtRisk = teams.reduce((sum, t) => sum + t.atRiskCount, 0);

  return (
    <main className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Learners</div>
          <div className="text-3xl font-bold" data-testid="total-learners">
            {totalLearners}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Comprehension</div>
          <div className="text-3xl font-bold" data-testid="avg-comprehension">
            {(avgComprehension * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">At-Risk Learners</div>
          <div
            className={`text-3xl font-bold ${
              totalAtRisk > 0 ? "text-red-600" : "text-green-600"
            }`}
            data-testid="at-risk-count"
          >
            {totalAtRisk}
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">My Teams</h2>
        </div>

        {teams.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No teams found. Create your first team to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {teams.map((team) => (
              <Link
                key={team.teamId}
                href={`/manager/teams/${team.teamId}/dashboard`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                data-testid={`team-card-${team.teamId}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{team.teamName}</h3>
                      {team.trendingUp && (
                        <span className="text-green-600 text-sm">↑ Trending up</span>
                      )}
                    </div>

                    <div className="flex gap-6 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">{team.activeLearners}</span> learners
                      </div>
                      <div>
                        <span className="font-medium">
                          {(team.avgComprehension * 100).toFixed(1)}%
                        </span>{" "}
                        comprehension
                      </div>
                      <div>
                        <span className="font-medium">{team.totalAttempts}</span> attempts
                      </div>
                      {team.atRiskCount > 0 && (
                        <div className="text-red-600 font-medium">
                          {team.atRiskCount} at-risk
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-gray-400">→</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchTeams}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Dashboard
        </button>
      </div>
    </main>
  );
}

