import React, { useState, useEffect } from 'react'

interface CalibrationPaneProps {
  moduleId: string | null
}

export function CalibrationPane({ moduleId }: CalibrationPaneProps) {
  const [difficulty, setDifficulty] = useState(5) // 0-10 scale
  const [examples, setExamples] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch calibration examples when difficulty or moduleId changes
  useEffect(() => {
    if (!moduleId) {
      setExamples([])
      return
    }

    const fetchExamples = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/v2/build/calibration?moduleId=${moduleId}&difficulty=${difficulty}`
        )
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

    fetchExamples()
  }, [moduleId, difficulty])

  const difficultyLabel = (level: number) => {
    if (level <= 2) return 'Very Easy'
    if (level <= 4) return 'Easy'
    if (level <= 6) return 'Medium'
    if (level <= 8) return 'Hard'
    return 'Very Hard'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Calibration header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#2d2d2d]">
        <h2 className="text-sm font-medium text-gray-300">Calibration</h2>
        <p className="text-xs text-gray-500 mt-0.5">Adjust difficulty & preview items</p>
      </div>

      {/* Calibration controls */}
      {moduleId && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-[#2d2d2d] bg-[#252525]">
          <label htmlFor="difficulty" className="block text-xs font-medium text-gray-400 mb-2">
            Difficulty: <span className="text-blue-400 font-semibold">{difficultyLabel(difficulty)}</span>
          </label>
          <input
            type="range"
            id="difficulty"
            min="0"
            max="10"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full h-2 bg-[#3d3d3d] rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Easy</span>
            <span>{difficulty}</span>
            <span>Hard</span>
          </div>
        </div>
      )}

      {/* Examples area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!moduleId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs">
              <svg className="w-12 h-12 mx-auto text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-xs text-gray-500">Calibration tools will appear when you create a module</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-6 h-6 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Loading examples...</p>
            </div>
          </div>
        ) : examples.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Example Items (Level {difficulty})
            </h3>
            {examples.map((example, idx) => (
              <div key={idx} className="bg-[#252525] border border-[#3d3d3d] rounded-lg p-3">
                <p className="text-xs font-medium text-gray-300 mb-2">{example.question}</p>
                {example.options && (
                  <div className="space-y-1.5 mb-2">
                    {example.options.map((opt: string, i: number) => (
                      <div key={i} className="text-xs text-gray-400 pl-3">
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                )}
                {example.answer && (
                  <p className="text-xs text-green-400 pt-2 border-t border-[#3d3d3d]">
                    ✓ {example.answer}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {example.type || 'Multiple Choice'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Level {example.difficulty || difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500">
              No examples generated yet. Continue building your module in the chat.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
