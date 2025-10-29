'use client'

/**
 * Team Dashboard Component
 * Shows team-level analytics: mastery, active users, at-risk users, etc.
 */

import { useState, useEffect } from 'react'

interface TeamDashboardData {
  masteryBySkill: Array<{
    skillName: string
    totalLearners: number
    proficientCount: number
    proficiencyRate: number
  }>
  activeUsers: Array<{
    userName: string
    sessionsThisWeek: number
    itemsCompleted: number
    currentStreak: number
  }>
  atRiskUsers: Array<{
    userName: string
    riskFactors: string[]
    daysInactive: number
  }>
  recentWins: Array<{
    userName: string
    achievement: string
    achievedAt: Date
  }>
  staleModules: Array<{
    moduleName: string
    daysSinceUpdate: number
    activeAssignments: number
  }>
}

export function TeamDashboard() {
  const [data, setData] = useState<TeamDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // days

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - Number(dateRange))
      const response = await fetch(
        `/api/v2/track/team?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`
      )
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Team Performance</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Mastery by Skill */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Mastery by Skill</h3>
        <div className="space-y-3">
          {data?.masteryBySkill?.slice(0, 5).map((skill, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{skill.skillName}</span>
                <span className="text-gray-500">
                  {skill.proficientCount}/{skill.totalLearners} proficient ({Math.round(skill.proficiencyRate * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${skill.proficiencyRate * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Users & At-Risk Users */}
      <div className="grid grid-cols-2 gap-6">
        {/* Active Users */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Active Users</h3>
          <div className="space-y-3">
            {data?.activeUsers?.slice(0, 5).map((user, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.userName}</p>
                  <p className="text-xs text-gray-500">
                    {user.sessionsThisWeek} sessions • {user.itemsCompleted} completed
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  🔥 {user.currentStreak}d
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Users */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">At-Risk Users</h3>
          <div className="space-y-3">
            {data?.atRiskUsers?.slice(0, 5).map((user, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.userName}</p>
                  <p className="text-xs text-gray-500">{user.riskFactors.join(', ')}</p>
                </div>
                <span className="text-xs text-gray-400">{user.daysInactive}d inactive</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Wins & Stale Modules */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Wins */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Wins 🎉</h3>
          <div className="space-y-3">
            {data?.recentWins?.slice(0, 5).map((win, idx) => (
              <div key={idx} className="border-l-2 border-yellow-400 pl-3">
                <p className="text-sm font-medium text-gray-900">{win.userName}</p>
                <p className="text-xs text-gray-600">{win.achievement}</p>
                <p className="text-xs text-gray-400">
                  {new Date(win.achievedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stale Modules */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Stale Modules</h3>
          <div className="space-y-3">
            {data?.staleModules?.slice(0, 5).map((module, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{module.moduleName}</p>
                  <p className="text-xs text-gray-500">
                    {module.activeAssignments} active assignments
                  </p>
                </div>
                <span className="text-xs text-orange-600">{module.daysSinceUpdate}d old</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

