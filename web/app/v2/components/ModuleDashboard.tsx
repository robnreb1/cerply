'use client'

/**
 * Module Dashboard Component
 * Module-level analytics and insights
 */

import { useState, useEffect } from 'react'

export function ModuleDashboard() {
  const [moduleId, setModuleId] = useState('')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLooding] = useState(false)

  const fetchData = async () => {
    if (!moduleId) return
    setIsLooding(true)
    try {
      const response = await fetch(`/api/v2/track/module/${moduleId}`)
      if (response.ok) {
        setData(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch module data:', error)
    } finally {
      setIsLooding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter Module ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            placeholder="mod_..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            onClick={fetchData}
            disabled={!moduleId || isLoading}
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
          {/* Core Freshness */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Core Freshness</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Freshness Score</span>
              <span className="text-2xl font-bold text-gray-900">{data.coreFreshness.freshnessScore}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${data.coreFreshness.freshnessScore}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {data.coreFreshness.staleSections} of {data.coreFreshness.totalSections} sections need updating
            </p>
          </div>

          {/* Reach & Engagement */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Reach</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Targeted</p>
                  <p className="text-2xl font-bold text-gray-900">{data.reach.totalTargeted}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Started</p>
                  <p className="text-lg font-semibold text-gray-700">{data.reach.started} ({Math.round(data.reach.startRate * 100)}%)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-lg font-semibold text-gray-700">{data.reach.completed} ({Math.round(data.reach.completionRate * 100)}%)</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Performance</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(data.answerRates.averageScore * 100)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Time on Task</p>
                  <p className="text-lg font-semibold text-gray-700">{Math.round(data.timeOnTask.averageSeconds)}s</p>
                </div>
              </div>
            </div>
          </div>

          {/* Problem Items */}
          {data.confusingItems?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Items Needing Attention</h3>
              <div className="space-y-2">
                {data.confusingItems.slice(0, 5).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-red-50 p-3 rounded">
                    <span className="text-gray-700 truncate">{item.itemContent}</span>
                    <span className="text-red-600 ml-2">{Math.round(item.successRate * 100)}% success</span>
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

