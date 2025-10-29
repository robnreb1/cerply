'use client'

/**
 * Content Pane - Center panel for Build workspace
 * Displays Module content and provenance badges
 */

import { useState, useEffect } from 'react'

interface ContentPaneProps {
  moduleId: string | null
  isLocked: boolean
  onLockChange: (locked: boolean) => void
}

interface Section {
  id: string
  heading: string
  content: string
  provenance: string
}

interface ModuleData {
  id: string
  title: string
  description: string
  sections: Section[]
  status: string
}

export function ContentPane({ moduleId, isLocked, onLockChange }: ContentPaneProps) {
  const [moduleData, setModuleData] = useState<ModuleData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (moduleId) {
      fetchModule()
    }
  }, [moduleId])

  const fetchModule = async () => {
    if (!moduleId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v2/modules/${moduleId}`)
      if (response.ok) {
        const data = await response.json()
        setModuleData(data)
      }
    } catch (error) {
      console.error('Failed to fetch module:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLock = async () => {
    if (!moduleId) return
    try {
      const response = await fetch('/api/v2/build/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          onLockChange(true)
          alert('Module locked successfully!')
        } else {
          alert(`Cannot lock: ${data.issues?.join(', ')}`)
        }
      }
    } catch (error) {
      console.error('Failed to lock module:', error)
    }
  }

  const getProvenanceBadge = (provenance: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      certified_core: { label: 'Certified Core', color: 'bg-green-100 text-green-800' },
      building_blocks: { label: 'Cerply Template', color: 'bg-blue-100 text-blue-800' },
      client_library: { label: 'Internal', color: 'bg-gray-100 text-gray-800' },
      industry: { label: 'Industry Source', color: 'bg-purple-100 text-purple-800' },
    }
    const badge = badges[provenance] || badges.client_library
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  if (!moduleId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No module selected</p>
          <p className="text-sm text-gray-400 mt-2">Start by describing your learning goal in the chat</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading module...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Content Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {moduleData?.title || 'Untitled Module'}
            </h2>
            <p className="text-sm text-gray-600">{moduleData?.description || 'No description'}</p>
          </div>
          {!isLocked && (
            <button
              onClick={handleLock}
              className="ml-4 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Lock Module
            </button>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {moduleData?.sections && moduleData.sections.length > 0 ? (
          <div className="max-w-3xl space-y-6">
            {moduleData.sections.map((section, idx) => (
              <div key={section.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {idx + 1}. {section.heading}
                  </h3>
                  {getProvenanceBadge(section.provenance)}
                </div>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <p>{section.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No sections yet</p>
            <p className="text-sm text-gray-400 mt-1">Chat with the AI to build your module</p>
          </div>
        )}
      </div>
    </>
  )
}
