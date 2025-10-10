"use client";
/**
 * Team Analytics Detail Dashboard
 * Epic 4: Manager Dashboard - Analytics & Insights
 * BRD: B-2, B-14 | FSD: §24 Manager Dashboard & Analytics v1
 */

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface TeamAnalytics {
  teamId: string;
  teamName: string;
  avgComprehension: number;
  activeLearners: number;
  atRiskCount: number;
  totalAttempts: number;
  completionRate: number;
  trendingUp: boolean;
  lastUpdated: string;
}

interface LearnerStatus {
  userId: string;
  name: string | null;
  email: string;
  comprehensionRate: number;
  totalAttempts: number;
  lastAttemptAt: string | null;
  overdueReviews: number;
  isAtRisk: boolean;
}

interface RetentionCurve {
  dayOffset: number;
  retentionRate: number;
  sampleSize: number;
}

export default function TeamDashboardPage() {
  const params = useParams();
  const teamId = params?.teamId as string;

  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [atRiskLearners, setAtRiskLearners] = useState<LearnerStatus[]>([]);
  const [retentionCurve, setRetentionCurve] = useState<RetentionCurve[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchDashboardData();
    }
  }, [teamId]);

  async function fetchDashboardData(forceRefresh = false) {
    try {
      setLoading(true);
      setError(null);

      const refreshParam = forceRefresh ? "?refresh=true" : "";

      // Fetch team analytics
      const analyticsRes = await fetch(`/api/manager/teams/${teamId}/analytics${refreshParam}`);
      if (!analyticsRes.ok) throw new Error("Failed to fetch analytics");
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      // Fetch at-risk learners
      const atRiskRes = await fetch(`/api/manager/teams/${teamId}/at-risk?limit=10`);
      if (atRiskRes.ok) {
        const atRiskData = await atRiskRes.json();
        setAtRiskLearners(atRiskData.learners || []);
      }

      // Fetch retention curve
      const retentionRes = await fetch(`/api/manager/teams/${teamId}/retention`);
      if (retentionRes.ok) {
        const retentionData = await retentionRes.json();
        setRetentionCurve(retentionData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-8">
        <div className="text-center">Loading team dashboard...</div>
      </main>
    );
  }

  if (error || !analytics) {
    return (
      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error || "Team not found"}
        </div>
        <div className="mt-4">
          <Link href="/manager/dashboard" className="text-blue-600 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const updatedAt = new Date(analytics.lastUpdated);
  const timeAgo = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60)); // minutes ago

  return (
    <main className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/manager/dashboard" className="text-blue-600 hover:underline mb-2 inline-block">
          ← Back to all teams
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{analytics.teamName}</h1>
          <div className="text-sm text-gray-500">
            Updated ~{timeAgo} min ago
            <button
              onClick={() => fetchDashboardData(true)}
              className="ml-2 text-blue-600 hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Active Learners</div>
          <div className="text-3xl font-bold">{analytics.activeLearners}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Comprehension</div>
          <div className="text-3xl font-bold" data-testid="comprehension-chart">
            {(analytics.avgComprehension * 100).toFixed(1)}%
          </div>
          {analytics.trendingUp && (
            <div className="text-sm text-green-600 mt-1">↑ Trending up</div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">At-Risk</div>
          <div
            className={`text-3xl font-bold ${
              analytics.atRiskCount > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {analytics.atRiskCount}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Attempts</div>
          <div className="text-3xl font-bold">{analytics.totalAttempts}</div>
        </div>
      </div>

      {/* Retention Curve */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Retention Curve</h2>
        <div className="grid grid-cols-4 gap-4" data-testid="retention-heatmap">
          {retentionCurve.map((point) => (
            <div
              key={point.dayOffset}
              className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="text-sm text-gray-600 mb-1">Day {point.dayOffset}</div>
              <div className="text-2xl font-bold">
                {(point.retentionRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">n={point.sampleSize}</div>
            </div>
          ))}
        </div>
        {retentionCurve.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No retention data yet. Data will appear as learners complete reviews over time.
          </div>
        )}
      </div>

      {/* At-Risk Learners Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">At-Risk Learners</h2>
        </div>

        {atRiskLearners.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No at-risk learners identified. Great work!
          </div>
        ) : (
          <div className="overflow-x-auto" data-testid="at-risk-table">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comprehension
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overdue Reviews
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {atRiskLearners.map((learner) => (
                  <tr key={learner.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {learner.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {(learner.comprehensionRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {learner.totalAttempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {learner.overdueReviews}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {learner.lastAttemptAt
                        ? new Date(learner.lastAttemptAt).toLocaleDateString()
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

