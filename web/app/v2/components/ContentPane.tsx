import React from 'react'

interface ContentPaneProps {
  moduleId: string | null
  isLocked: boolean
  onLockChange: (locked: boolean) => void
}

export function ContentPane({ moduleId, isLocked, onLockChange }: ContentPaneProps) {
  const [moduleData, setModuleData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // Fetch module data when moduleId changes
  React.useEffect(() => {
    if (!moduleId) {
      setModuleData(null)
      return
    }

    const fetchModule = async () => {
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

    fetchModule()
  }, [moduleId])

  const handleLockModule = async () => {
    if (!moduleId) return

    if (window.confirm('Lock this module? No further edits will be possible.')) {
      try {
        const response = await fetch(`/api/v2/build/lock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId }),
        })

        if (response.ok) {
          onLockChange(true)
        } else {
          alert('Failed to lock module. Please try again.')
        }
      } catch (error) {
        console.error('Lock error:', error)
        alert('Error: Unable to connect to backend.')
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Content header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#2d2d2d] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-gray-300">Module Content</h2>
          <p className="text-xs text-gray-500 mt-0.5">Live preview as you build</p>
        </div>
        {moduleId && !isLocked && (
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
            onClick={handleLockModule}
          >
            Lock Module
          </button>
        )}
      </div>

      {/* Content area */}
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
              <p className="text-sm text-gray-500">Loading module...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Module header */}
            <div className="bg-[#252525] border border-[#3d3d3d] rounded-lg p-4">
              <h1 className="text-lg font-semibold text-gray-200 mb-2">
                {moduleData?.title || 'Untitled Module'}
              </h1>
              <p className="text-sm text-gray-400 mb-3">
                {moduleData?.description || 'No description yet'}
              </p>
              <div className="flex flex-wrap gap-2">
                {moduleData?.tags?.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {tag}
                  </span>
                ))}
                {moduleData?.provenance && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    {moduleData.provenance}
                  </span>
                )}
              </div>
            </div>

            {/* Sections */}
            {moduleData?.sections?.map((section: any, idx: number) => (
              <div key={idx} className="bg-[#252525] border border-[#3d3d3d] rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-200 mb-2">
                  {section.title}
                </h3>
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Placeholder if no content */}
            {(!moduleData?.sections || moduleData.sections.length === 0) && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  Module content will appear here as you build...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
