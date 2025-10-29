'use client'

/**
 * Track Dashboard - V2.0
 * Team, Person, and Module analytics views
 */

import { useState } from 'react'
import { TeamDashboard } from '../components/TeamDashboard'
import { PersonDashboard } from '../components/PersonDashboard'
import { ModuleDashboard } from '../components/ModuleDashboard'

type ViewType = 'team' | 'person' | 'module'

export default function TrackPage() {
  const [currentView, setCurrentView] = useState<ViewType>('team')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Track</h1>
            <a
              href="/v2"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </a>
          </div>

          {/* View Tabs */}
          <div className="mt-4 flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setCurrentView('team')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === 'team'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Team View
            </button>
            <button
              onClick={() => setCurrentView('person')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === 'person'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Person View
            </button>
            <button
              onClick={() => setCurrentView('module')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentView === 'module'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Module View
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {currentView === 'team' && <TeamDashboard />}
        {currentView === 'person' && <PersonDashboard />}
        {currentView === 'module' && <ModuleDashboard />}
      </main>
    </div>
  )
}

