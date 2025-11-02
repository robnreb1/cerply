'use client'

import React, { useState, useEffect } from 'react'

interface Module {
  id: string
  title: string
  updatedAt: string
  visibility: string
  lockedAt: string | null
}

interface ModulesListPaneProps {
  currentModuleId: string | null
  onModuleSelect: (id: string) => void
}

export function ModulesListPane({ currentModuleId, onModuleSelect }: ModulesListPaneProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/v2/modules?organizationId=00000000-0000-0000-0000-000000000002', {
        headers: {
          'Authorization': 'Bearer dev-token',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setModules(data.modules || [])
      } else {
        setError('Failed to load modules')
      }
    } catch (err) {
      console.error('Fetch modules error:', err)
      setError('Failed to load modules')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#2d2d2d]">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-[#2d2d2d]">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Modules</h2>
          <button
            onClick={fetchModules}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-gray-500">Loading...</div>
        ) : modules.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">No modules yet</div>
        ) : (
          <div className="py-1">
            {modules.map((module) => {
              const isDraft = !module.lockedAt
              const isLive = !!module.lockedAt
              
              return (
                <button
                  key={module.id}
                  onClick={() => onModuleSelect(module.id)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-[#2d2d2d] transition-colors border-l-2 ${
                    currentModuleId === module.id
                      ? 'border-blue-500 bg-[#2d2d2d] text-gray-200'
                      : 'border-transparent text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Status icon */}
                    {isDraft && (
                      <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Draft">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    )}
                    {isLive && (
                      <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Live">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div className="font-medium truncate flex-1">{module.title}</div>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 ml-5">
                    {new Date(module.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* New Module Button */}
      <div className="flex-shrink-0 p-2 border-t border-[#2d2d2d]">
        <button
          onClick={() => onModuleSelect('new')}
          className="w-full px-3 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-[#2d2d2d] rounded transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Module
        </button>
      </div>
    </div>
  )
}

