'use client'

/**
 * Calibration Pane - Right panel for Build workspace
 * Shows example items at different difficulty levels (0-10)
 */

import { useState, useEffect } from 'react'

interface CalibrationPaneProps {
  moduleId: string | null
}

interface CalibrationExample {
  difficulty: number
  itemType: string
  question: string
  options?: string[]
}

export function CalibrationPane({ moduleId }: CalibrationPaneProps) {
  const [examples, setExamples] = useState<CalibrationExample[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(5)

  useEffect(() => {
    if (moduleId) {
      fetchExamples()
    }
  }, [moduleId, selectedDifficulty])

  const fetchExamples = async () => {
    if (!moduleId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v2/build/calibration?moduleId=${moduleId}&difficulty=${selectedDifficulty}`)
      if (response.ok) {
        const data = await response.json()
        setExamples(data.examples || [])
      }
    } catch (error) {
      console.error('Failed to fetch calibration examples:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return { label: 'Beginner', color: 'bg-green-100 text-green-800' }
    if (level <= 5) return { label: 'Intermediate', color: 'bg-blue-100 text-blue-800' }
    if (level <= 8) return { label: 'Advanced', color: 'bg-orange-100 text-orange-800' }
    return { label: 'Expert', color: 'bg-red-100 text-red-800' }
  }

  if (!moduleId) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-gray-400 text-center">
        <div>
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm">Calibration examples</p>
          <p className="text-xs mt-1">Preview difficulty levels</p>
        </div>
      </div>
    )
  }

  const difficultyInfo = getDifficultyLabel(selectedDifficulty)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Calibration</h2>
        <p className="text-xs text-gray-500 mt-1">Preview difficulty levels</p>
      </div>

      {/* Difficulty Slider */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">Difficulty Level</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
            {selectedDifficulty} - {difficultyInfo.label}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      {/* Examples */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        ) : examples.length > 0 ? (
          <div className="space-y-4">
            {examples.map((example, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 capitalize">
                    {example.itemType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">Level {example.difficulty}</span>
                </div>
                <p className="text-sm text-gray-900 mb-3">{example.question}</p>
                {example.options && (
                  <div className="space-y-1.5">
                    {example.options.map((option, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded">
                        <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-[10px] font-medium">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 text-sm py-8">
            <p>No examples available yet</p>
            <p className="text-xs mt-1">Examples will appear as you build</p>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="font-medium mb-1">About Calibration</p>
          <p className="text-gray-500">
            These examples help you understand how difficulty levels affect question complexity. Use them to guide your chat instructions.
          </p>
        </div>
      </div>
    </div>
  )
}

