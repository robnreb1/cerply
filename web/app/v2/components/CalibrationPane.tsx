import React, { useState, useEffect } from 'react'

interface CalibrationPaneProps {
  moduleId: string | null
  selectedTopic: string | null
}

export function CalibrationPane({ moduleId, selectedTopic }: CalibrationPaneProps) {
  const [difficulty, setDifficulty] = useState(10) // 0-10 scale, default to show all
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAll, setShowAll] = useState(true) // Show all difficulty levels
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'lesson' | 'quiz'>('all') // Item type filter

  // Fetch calibration items from database with polling while generating
  useEffect(() => {
    if (!moduleId) {
      setItems([])
      return
    }

    let pollInterval: NodeJS.Timeout

    const fetchItems = async () => {
      try {
        const response = await fetch(`/api/v2/build/calibration/${moduleId}`, {
          headers: {
            'Authorization': 'Bearer dev-token',
          },
        })
        if (response.ok) {
          const data = await response.json()
          setItems(data.items || [])
          
          // If we have items, stop polling
          if (data.items && data.items.length > 0) {
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error('Failed to fetch calibration items:', error)
      }
    }

    // Initial fetch
    fetchItems()
    
    // Poll every 2 seconds to catch new items as they're generated
    pollInterval = setInterval(fetchItems, 2000)

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [moduleId])

  // Filter items by difficulty, type, and selected topic
  const filteredItems = items.filter((item) => {
    // Filter by item type (lesson/quiz)
    if (itemTypeFilter !== 'all' && item.itemType !== itemTypeFilter) {
      return false
    }
    
    // Filter by difficulty - exact match or show all
    if (!showAll && item.difficulty !== difficulty) {
      return false
    }
    
    // Filter by selected topic if one is selected
    if (selectedTopic && item.itemData?.topicTitle) {
      return item.itemData.topicTitle === selectedTopic
    }
    
    return true
  })

  const difficultyLabel = (level: number) => {
    if (level === 0) return 'None'
    if (level <= 2) return 'Very Easy'
    if (level <= 4) return 'Easy'
    if (level <= 6) return 'Medium'
    if (level <= 8) return 'Hard'
    return 'Very Hard'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Calibration header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#3a3a3a]">
        <h2 className="text-sm font-medium text-gray-300">
          Calibration
          {selectedTopic && (
            <span className="ml-2 text-xs text-blue-400">● Filtered by: {selectedTopic}</span>
          )}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Refine delivery content</p>
      </div>

      {/* Calibration controls - always visible */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#3a3a3a] bg-[#252525]">
        {/* Difficulty slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="difficulty" className="block text-xs font-medium text-gray-400">
              Difficulty: <span className="text-blue-400 font-semibold">{showAll ? 'All' : `Level ${difficulty}`}</span>
            </label>
            <div className="flex items-center gap-2">
              {/* Content type filters - small and subtle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setItemTypeFilter('all')}
                  className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                    itemTypeFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#2d2d2d] text-gray-500 hover:bg-[#3d3d3d] hover:text-gray-400'
                  }`}
                  title="Show all content"
                >
                  All
                </button>
                <button
                  onClick={() => setItemTypeFilter('lesson')}
                  className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                    itemTypeFilter === 'lesson'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#2d2d2d] text-gray-500 hover:bg-[#3d3d3d] hover:text-gray-400'
                  }`}
                  title="Show micro-lessons only"
                >
                  Lessons
                </button>
                <button
                  onClick={() => setItemTypeFilter('quiz')}
                  className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                    itemTypeFilter === 'quiz'
                      ? 'bg-green-600 text-white'
                      : 'bg-[#2d2d2d] text-gray-500 hover:bg-[#3d3d3d] hover:text-gray-400'
                  }`}
                  title="Show quizzes only"
                >
                  Quizzes
                </button>
              </div>
              <button
                onClick={() => setShowAll(!showAll)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  showAll 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'
                }`}
              >
                All
              </button>
            </div>
          </div>
          <input
            type="range"
            id="difficulty"
            min="1"
            max="10"
            step="1"
            value={difficulty}
            onChange={(e) => {
              setDifficulty(Number(e.target.value))
              setShowAll(false) // Turn off "all" when slider moves
            }}
            disabled={!moduleId || showAll}
            className="w-full h-2 bg-[#3d3d3d] rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

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
        ) : filteredItems.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Learning Items ({filteredItems.length})
            </h3>
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-[#252525] border border-[#3d3d3d] rounded-lg p-3">
                {item.itemType === 'lesson' ? (
                  <>
                    <p className="text-xs font-medium text-blue-400 mb-1">{item.itemData.topicTitle}</p>
                    <p className="text-xs font-semibold text-gray-300 mb-2">{item.itemData.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.itemData.content}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-300 mb-2">{item.itemData.question}</p>
                    {item.itemData.options && (
                      <div className="space-y-1.5 mb-2">
                        {item.itemData.options.map((opt: string, i: number) => (
                          <div key={i} className="text-xs text-gray-400 pl-3">
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.itemData.correctAnswer && (
                      <p className="text-xs text-green-400 pt-2 border-t border-[#3d3d3d]">
                        ✓ {item.itemData.correctAnswer}
                      </p>
                    )}
                  </>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {item.itemType === 'lesson' ? 'Micro-lesson' : 'Quiz'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Level {item.difficulty}
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
