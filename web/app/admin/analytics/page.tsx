"use client";
/**
 * Admin Analytics Dashboard - Organization Overview
 * Epic 4: Manager Dashboard - Analytics & Insights
 * BRD: B-2, B-14 | FSD: §24 Manager Dashboard & Analytics v1
 */

import React, { useState, useEffect } from "react";

interface OrganizationOverview {
  organizationId: string;
  organizationName: string;
  totalTeams: number;
  activeLearners: number;
  avgComprehension: number;
  totalAtRiskCount: number;
  totalAttempts: number;
}

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<OrganizationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Default org ID (would come from auth context in production)
  const orgId = "00000000-0000-0000-0000-000000000001";

  useEffect(() => {
    fetchOverview();
  }, []);

  async function fetchOverview() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/analytics/organization/${orgId}/overview`);
      if (!res.ok) throw new Error("Failed to fetch organization overview");

      const data = await res.json();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  async function exportAnalytics(format: "json" | "csv") {
    try {
      setExporting(true);

      const res = await fetch(`/api/analytics/organization/${orgId}/export?format=${format}`);
      if (!res.ok) throw new Error("Failed to export analytics");

      if (format === "csv") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-${orgId}-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-${orgId}-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-8">
        <div className="text-center">Loading organization analytics...</div>
      </main>
    );
  }

  if (error || !overview) {
    return (
      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error || "Failed to load analytics"}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organization Analytics</h1>
          <p className="text-gray-600 mt-1">{overview.organizationName}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => exportAnalytics("json")}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportAnalytics("csv")}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Organization-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Teams</div>
          <div className="text-3xl font-bold">{overview.totalTeams}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Active Learners</div>
          <div className="text-3xl font-bold">{overview.activeLearners}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Comprehension</div>
          <div className="text-3xl font-bold">
            {(overview.avgComprehension * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total At-Risk</div>
          <div
            className={`text-3xl font-bold ${
              overview.totalAtRiskCount > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {overview.totalAtRiskCount}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Attempts</div>
          <div className="text-3xl font-bold">{overview.totalAttempts.toLocaleString()}</div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Insights</h2>
        <div className="space-y-3 text-sm text-gray-700">
          {overview.avgComprehension >= 0.8 && (
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>
                <strong>Strong Performance:</strong> Organization-wide comprehension is above 80%.
              </span>
            </div>
          )}
          {overview.avgComprehension < 0.7 && (
            <div className="flex items-start gap-2">
              <span className="text-yellow-600">⚠</span>
              <span>
                <strong>Action Needed:</strong> Organization-wide comprehension is below 70%.
                Review team performance and consider additional support.
              </span>
            </div>
          )}
          {overview.totalAtRiskCount > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-red-600">!</span>
              <span>
                <strong>At-Risk Learners:</strong> {overview.totalAtRiskCount} learners need
                attention across {overview.totalTeams} teams.
              </span>
            </div>
          )}
          {overview.activeLearners === 0 && (
            <div className="flex items-start gap-2">
              <span className="text-gray-600">ℹ</span>
              <span>
                <strong>No Active Learners:</strong> No learning activity recorded. Ensure teams
                are assigned tracks and learners are engaging with content.
              </span>
            </div>
          )}
          {overview.activeLearners > 0 && overview.totalAtRiskCount === 0 && (
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>
                <strong>All Clear:</strong> No at-risk learners identified across the organization.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </main>
  );
}

