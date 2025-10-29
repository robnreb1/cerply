'use client'

/**
 * Build Workspace - V2.0
 * 
 * Cursor-inspired 3-pane layout for Module creation
 * - Chat Pane (left): Prompt & chat with AI
 * - Content Pane (center): Live Module preview
 * - Calibration Pane (right): Difficulty examples
 */

import { useState } from 'react'
import { ChatPane } from '../components/ChatPane'
import { ContentPane } from '../components/ContentPane'
import { CalibrationPane } from '../components/CalibrationPane'

export default function BuildWorkspace() {
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  return (
    <div className="h-screen w-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Build</h1>
          {moduleId && (
            <span className="text-sm text-gray-500">
              Module ID: {moduleId.substring(0, 8)}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isLocked && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Locked
            </span>
          )}
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => window.location.href = '/v2'}
          >
            Exit
          </button>
        </div>
      </header>

      {/* 3-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Pane - Left */}
        <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
          <ChatPane 
            moduleId={moduleId} 
            onModuleCreated={setModuleId}
            isLocked={isLocked}
          />
        </div>

        {/* Content Pane - Center (larger) */}
        <div className="flex-1 flex flex-col bg-gray-50">
          <ContentPane 
            moduleId={moduleId}
            isLocked={isLocked}
            onLockChange={setIsLocked}
          />
        </div>

        {/* Calibration Pane - Right */}
        <div className="w-96 border-l border-gray-200 flex flex-col bg-white">
          <CalibrationPane moduleId={moduleId} />
        </div>
      </div>
    </div>
  )
}

