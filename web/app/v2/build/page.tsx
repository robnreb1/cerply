'use client'

import { useState } from 'react'
import { ChatPane } from '../components/ChatPane'
import { ContentPane } from '../components/ContentPane'
import { CalibrationPane } from '../components/CalibrationPane'

/**
 * Cerply V2.0 Build Workspace
 * 3-pane Cursor-inspired layout with dark theme
 */
export default function BuildWorkspace() {
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e]">
      {/* Header - Cursor style */}
      <header className="h-12 border-b border-[#2d2d2d] flex items-center justify-between px-4 bg-[#181818] flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium text-gray-300">Cerply Build</h1>
          {moduleId && (
            <span className="text-xs text-gray-500">
              {moduleId.substring(0, 8)}...
            </span>
          )}
        </div>
        
        {/* Navigation Menu */}
        <div className="flex items-center gap-2">
          {isLocked && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Locked
            </span>
          )}
          
          {/* Menu */}
          <div className="flex items-center gap-1">
            <a
              href="/v2/push"
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#2d2d2d] rounded transition-colors"
            >
              Push
            </a>
            <a
              href="/v2/track"
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#2d2d2d] rounded transition-colors"
            >
              Track
            </a>
            <a
              href="/v2/certified"
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#2d2d2d] rounded transition-colors"
            >
              Certified
            </a>
          </div>
        </div>
      </header>

      {/* 3-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Pane - Left */}
        <div className="w-80 border-r border-[#2d2d2d] flex flex-col bg-[#1e1e1e]">
          <ChatPane 
            moduleId={moduleId} 
            onModuleCreated={setModuleId}
            isLocked={isLocked}
          />
        </div>

        {/* Content Pane - Center (larger) */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          <ContentPane 
            moduleId={moduleId}
            isLocked={isLocked}
            onLockChange={setIsLocked}
          />
        </div>

        {/* Calibration Pane - Right */}
        <div className="w-80 border-l border-[#2d2d2d] flex flex-col bg-[#1e1e1e]">
          <CalibrationPane moduleId={moduleId} />
        </div>
      </div>
    </div>
  )
}
