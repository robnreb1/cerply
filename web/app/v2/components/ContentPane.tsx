import React from 'react'
import { DiffViewer } from './DiffViewer'

interface ContentPaneProps {
  moduleId: string | null
  isLocked: boolean
  onLockChange: (locked: boolean) => void
  refreshTrigger: number
  selectedTopic: string | null
  onTopicSelect: (topic: string | null) => void
}

export function ContentPane({ moduleId, isLocked, onLockChange, refreshTrigger, selectedTopic, onTopicSelect }: ContentPaneProps) {
  const [moduleData, setModuleData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [showDiff, setShowDiff] = React.useState(false)
  const [previousContent, setPreviousContent] = React.useState<{[key: string]: string}>({})
  const [hasCalibrationItems, setHasCalibrationItems] = React.useState(false)
  const [showExportMenu, setShowExportMenu] = React.useState(false)
  const [calibrationItems, setCalibrationItems] = React.useState<any[]>([])
  const [expandedTopics, setExpandedTopics] = React.useState<{[key: string]: boolean}>({})
  
  // Difficulty filter state
  const [difficulty, setDifficulty] = React.useState(10)
  const [showAll, setShowAll] = React.useState(true)
  const [itemTypeFilter, setItemTypeFilter] = React.useState<'all' | 'lesson' | 'quiz'>('all')

  // Export functionality
  const exportAsText = async () => {
    if (!moduleData) return
    
    let content = `${moduleData.title}\n${'='.repeat(moduleData.title.length)}\n\n`
    
    if (moduleData.description) {
      content += `${moduleData.description}\n\n`
    }
    
    // Export sections/topics
    if (moduleData.sections && moduleData.sections.length > 0) {
      content += 'Topics:\n' + '-'.repeat(50) + '\n\n'
      moduleData.sections.forEach((section: any, idx: number) => {
        content += `${idx + 1}. ${section.title}\n`
        content += `${section.content}\n\n`
      })
    }
    
    // Fetch calibration items for export
    try {
      const response = await fetch(`/api/v2/build/calibration/${moduleId}`, {
        headers: { 'Authorization': 'Bearer dev-token' },
      })
      if (response.ok) {
        const data = await response.json()
        const items = selectedTopic 
          ? data.items.filter((item: any) => item.itemData?.topicTitle === selectedTopic)
          : data.items
        
        if (items.length > 0) {
          content += '\nLearning Items:\n' + '-'.repeat(50) + '\n\n'
          
          // Group by topic
          const byTopic: {[key: string]: any[]} = {}
          items.forEach((item: any) => {
            const topic = item.itemData?.topicTitle || 'Ungrouped'
            if (!byTopic[topic]) byTopic[topic] = []
            byTopic[topic].push(item)
          })
          
          Object.keys(byTopic).forEach(topic => {
            content += `\n## ${topic}\n\n`
            byTopic[topic].forEach((item: any) => {
              if (item.itemType === 'lesson') {
                content += `### Micro-lesson: ${item.itemData.title}\n`
                content += `${item.itemData.content}\n\n`
              } else {
                content += `### Quiz: ${item.itemData.question}\n`
                if (item.itemData.options) {
                  item.itemData.options.forEach((opt: string, i: number) => {
                    content += `  ${String.fromCharCode(65 + i)}. ${opt}\n`
                  })
                }
                if (item.itemData.correctAnswer) {
                  content += `  Answer: ${item.itemData.correctAnswer}\n`
                }
                content += '\n'
              }
            })
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch calibration items for export:', error)
    }
    
    // Download
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${moduleData.title.replace(/[^a-z0-9]/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAsCSV = async () => {
    if (!moduleData) return
    
    let csv = 'Type,Topic,Title/Question,Content/Options,Difficulty\n'
    
    // Fetch calibration items
    try {
      const response = await fetch(`/api/v2/build/calibration/${moduleId}`, {
        headers: { 'Authorization': 'Bearer dev-token' },
      })
      if (response.ok) {
        const data = await response.json()
        const items = selectedTopic 
          ? data.items.filter((item: any) => item.itemData?.topicTitle === selectedTopic)
          : data.items
        
        items.forEach((item: any) => {
          const type = item.itemType === 'lesson' ? 'Micro-lesson' : 'Quiz'
          const topic = item.itemData?.topicTitle || ''
          const title = item.itemType === 'lesson' ? item.itemData.title : item.itemData.question
          const content = item.itemType === 'lesson' 
            ? item.itemData.content 
            : (item.itemData.options || []).join('; ')
          const difficulty = item.difficulty
          
          csv += `"${type}","${topic}","${title.replace(/"/g, '""')}","${content.replace(/"/g, '""')}",${difficulty}\n`
        })
      }
    } catch (error) {
      console.error('Failed to fetch calibration items for export:', error)
    }
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${moduleData.title.replace(/[^a-z0-9]/gi, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Fetch module data when moduleId changes OR refreshTrigger changes
  React.useEffect(() => {
    if (!moduleId) {
      setModuleData(null)
      setHasCalibrationItems(false)
      setCalibrationItems([])
      return
    }

    const fetchModule = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/v2/modules/${moduleId}`, {
          headers: {
            'Authorization': 'Bearer dev-token',
          },
        })
        if (response.ok) {
          const data = await response.json()
          console.log('Module data fetched:', data) // Debug log
          
          // Store previous content for diff
          if (moduleData?.sections) {
            const prevContent: {[key: string]: string} = {}
            moduleData.sections.forEach((section: any) => {
              prevContent[section.id] = section.content
            })
            setPreviousContent(prevContent)
          }
          
          // API returns nested structure: { module: {...}, sections: [...] }
          setModuleData({
            ...data.module,
            sections: data.sections || [],
          })
        } else {
          console.error('Failed to fetch module:', response.status)
        }
      } catch (error) {
        console.error('Failed to fetch module:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const checkCalibrationItems = async () => {
      try {
        const response = await fetch(`/api/v2/build/calibration/${moduleId}`, {
          headers: {
            'Authorization': 'Bearer dev-token',
          },
        })
        if (response.ok) {
          const data = await response.json()
          setCalibrationItems(data.items || [])
          setHasCalibrationItems(data.items && data.items.length > 0)
        }
      } catch (error) {
        console.error('Failed to check calibration items:', error)
        setHasCalibrationItems(false)
      }
    }

    fetchModule()
    checkCalibrationItems()
    
    // Poll for calibration items
    const pollInterval = setInterval(checkCalibrationItems, 2000)
    return () => clearInterval(pollInterval)
  }, [moduleId, refreshTrigger]) // Re-fetch when refreshTrigger changes

  const handleLockModule = async () => {
    if (!moduleId) return

    if (window.confirm('Lock this module? No further edits will be possible.')) {
      try {
        const requestBody = { 
          moduleId,
          userId: 'dev-user-123',
          organizationId: 'dev-org-123',
          lockType: 'company_module',
        }
        console.log('Locking module with payload:', requestBody)
        
        const response = await fetch(`/api/v2/build/lock`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer dev-token',
          },
          body: JSON.stringify(requestBody),
        })

        console.log('Lock response status:', response.status)
        
        if (response.ok) {
          const result = await response.json()
          console.log('Lock success:', result)
          onLockChange(true)
          alert('Module locked successfully! You can now assign it via Push.')
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Lock failed:', errorData)
          const errorMsg = errorData.error?.message || 'Please try again.'
          if (errorMsg.includes('Module not found')) {
            alert(`Failed to lock module: Module not found in database.\n\nThis can happen if:\n1. The page data is stale (try refreshing)\n2. The module wasn't saved correctly\n\nPlease refresh the page and select your module from the Modules list on the left.`)
          } else {
            alert(`Failed to lock module: ${errorMsg}`)
          }
        }
      } catch (error) {
        console.error('Lock error:', error)
        alert('Error: Unable to connect to backend.')
      }
    }
  }

  // Filter calibration items
  const filteredCalibrationItems = calibrationItems.filter((item) => {
    if (itemTypeFilter !== 'all' && item.itemType !== itemTypeFilter) return false
    if (!showAll && item.difficulty !== difficulty) return false
    if (selectedTopic && item.itemData?.topicTitle !== selectedTopic) return false
    return true
  })

  // Group items by topic
  const itemsByTopic: {[key: string]: any[]} = {}
  filteredCalibrationItems.forEach((item) => {
    const topic = item.itemData?.topicTitle || 'Ungrouped'
    if (!itemsByTopic[topic]) itemsByTopic[topic] = []
    itemsByTopic[topic].push(item)
  })

  const toggleTopic = (topicTitle: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicTitle]: !prev[topicTitle]
    }))
    // Also set as selected topic for download filtering
    onTopicSelect(selectedTopic === topicTitle ? null : topicTitle)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Content header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#3a3a3a] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-gray-300">Module Content</h2>
          <p className="text-xs text-gray-500 mt-0.5">Topics, lessons, and assessments</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          {moduleData && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2 py-1.5 text-xs bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 rounded transition-colors flex items-center gap-1"
                title={selectedTopic ? `Export ${selectedTopic}` : "Export module"}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {showExportMenu && (
                <div className="absolute top-full right-0 mt-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded shadow-lg z-50 min-w-[100px]">
                  <button
                    onClick={() => {
                      exportAsText()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-[#3d3d3d] transition-colors"
                  >
                    Export as TXT
                  </button>
                  <button
                    onClick={() => {
                      exportAsCSV()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-[#3d3d3d] transition-colors border-t border-[#3d3d3d]"
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
          )}
          {moduleData?.sections && moduleData.sections.length > 0 && Object.keys(previousContent).length > 0 && (
            <button
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                showDiff 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setShowDiff(!showDiff)}
            >
              {showDiff ? 'Hide Changes' : 'Show Changes'}
            </button>
          )}
          {moduleId && !isLocked && hasCalibrationItems && (
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
              onClick={handleLockModule}
            >
              Lock Module
            </button>
          )}
        </div>
      </div>

      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!moduleId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <svg className="w-16 h-16 mx-auto text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-400 mb-2">No module loaded</p>
              <p className="text-xs text-gray-600">Start a conversation in the chat to create a new module</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-400">Loading module...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Module header */}
            {(moduleData?.title !== 'Draft Module' || moduleData?.sections?.length > 0) && (
              <div className="bg-[#252525] border border-[#3d3d3d] rounded-lg p-4">
                <h1 className="text-lg font-semibold text-gray-200 mb-2">
                  {moduleData?.title || 'Untitled Module'}
                </h1>
                {moduleData?.description && (
                  <p className="text-sm text-gray-400 mb-3">{moduleData.description}</p>
                )}
              </div>
            )}

            {/* Topics with expandable content */}
            {moduleData?.sections?.map((section: any) => {
              const topicItems = itemsByTopic[section.title] || []
              const isExpanded = expandedTopics[section.title]
              
              return (
                <div 
                  key={section.id}
                  className={`bg-[#252525] border rounded-lg transition-all ${
                    selectedTopic === section.title 
                      ? 'border-blue-500 shadow-md shadow-blue-500/20' 
                      : 'border-[#3d3d3d]'
                  }`}
                >
                  {/* Topic header - clickable */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                    onClick={() => toggleTopic(section.title)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <h3 className="text-base font-semibold text-gray-200">
                            {section.title}
                          </h3>
                          {selectedTopic === section.title && (
                            <span className="text-xs text-blue-400 font-medium">
                              [Export Filter Active]
                            </span>
                          )}
                          {topicItems.length > 0 && (
                            <span className="text-xs text-gray-500">
                              ({topicItems.filter(i => i.itemType === 'lesson').length} lessons, {topicItems.filter(i => i.itemType === 'quiz').length} quizzes)
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-400 whitespace-pre-wrap">
                          {section.content}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable content - lessons and quizzes */}
                  {isExpanded && topicItems.length > 0 && (
                    <div className="border-t border-[#3d3d3d] p-4 space-y-3 bg-[#1e1e1e]">
                      {topicItems.map((item: any) => (
                        <div key={item.id} className="bg-[#252525] border border-[#3d3d3d] rounded p-3">
                          {item.itemType === 'lesson' ? (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-purple-400">Micro-lesson</p>
                                <span className="text-xs text-gray-500">Difficulty: {item.difficulty}/10</span>
                              </div>
                              <p className="text-xs font-medium text-gray-300 mb-1">{item.itemData.title}</p>
                              <p className="text-xs text-gray-400 leading-relaxed">{item.itemData.content}</p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-green-400">Quiz</p>
                                <span className="text-xs text-gray-500">Difficulty: {item.difficulty}/10</span>
                              </div>
                              <p className="text-xs font-medium text-gray-300 mb-2">{item.itemData.question}</p>
                              {item.itemData.options && (
                                <div className="space-y-1 mb-2">
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Difficulty slider at bottom - fixed */}
      {moduleId && calibrationItems.length > 0 && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-[#3a3a3a] bg-[#252525]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label htmlFor="difficulty" className="block text-xs font-medium text-gray-400">
                Difficulty:
              </label>
              <button
                onClick={() => setShowAll(false)}
                disabled={!showAll}
                className={`text-xs font-semibold transition-colors ${
                  !showAll 
                    ? 'text-blue-400 cursor-pointer' 
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                {showAll ? 'Level' : `Level ${difficulty}`}
              </button>
              <span className="text-gray-600 text-xs">/</span>
              <button
                onClick={() => setShowAll(true)}
                disabled={showAll}
                className={`text-xs font-semibold transition-colors ${
                  showAll 
                    ? 'text-blue-400 cursor-pointer' 
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                All
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Content type filters - toggleable */}
              <div className="flex gap-1">
                <button
                  onClick={() => setItemTypeFilter(prev => prev === 'lesson' ? 'all' : 'lesson')}
                  className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                    itemTypeFilter === 'lesson'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#2d2d2d] text-gray-500 hover:bg-[#3d3d3d] hover:text-gray-400'
                  }`}
                  title="Toggle micro-lessons"
                >
                  Lessons
                </button>
                <button
                  onClick={() => setItemTypeFilter(prev => prev === 'quiz' ? 'all' : 'quiz')}
                  className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                    itemTypeFilter === 'quiz'
                      ? 'bg-green-600 text-white'
                      : 'bg-[#2d2d2d] text-gray-500 hover:bg-[#3d3d3d] hover:text-gray-400'
                  }`}
                  title="Toggle quizzes"
                >
                  Quizzes
                </button>
              </div>
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
              setShowAll(false)
            }}
            disabled={showAll}
            className="w-full h-2 bg-[#3d3d3d] rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      )}
    </div>
  )
}
