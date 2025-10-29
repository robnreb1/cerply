'use client'

/**
 * Person Dashboard Component
 * Individual learner progress and analytics
 */

import { useState, useEffect } from 'react'

export function PersonDashboard() {
  const [userId, setUserId] = useState('')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v2/track/person/${userId}`)
      if (response.ok) {
        setData(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch person data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter User ID or Email
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            onClick={fetchData}
            disabled={!userId || isLoading}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
          >
            Search
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {data && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">Current Level</p>
              <p className="text-2xl font-bold text-gray-900">{data.currentLevel}/10</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(data.completionRate * 100)}%</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900">🔥 {data.streaks.currentStreak}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500">Items/Week</p>
              <p className="text-2xl font-bold text-gray-900">{data.pace.itemsPerWeek}</p>
            </div>
          </div>

          {/* Weak Areas */}
          {data.weakAreas?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Areas to Strengthen</h3>
              <div className="space-y-2">
                {data.weakAreas.map((area: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{area.goalName}</span>
                    <span className="text-sm text-gray-500">{Math.round(area.successRate * 100)}% success</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

