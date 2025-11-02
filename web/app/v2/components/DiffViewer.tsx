import React from 'react'

interface DiffViewerProps {
  oldContent: string
  newContent: string
  showDiff: boolean
}

export function DiffViewer({ oldContent, newContent, showDiff }: DiffViewerProps) {
  if (!showDiff) {
    return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: newContent }} />
  }

  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  
  // Simple line-by-line diff
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)
  
  return (
    <div className="space-y-1 font-mono text-sm">
      {/* Show removed lines (in old but not in new) */}
      {oldLines.map((line, idx) => {
        if (!newSet.has(line) && line.trim()) {
          return (
            <div key={`old-${idx}`} className="bg-red-900/20 border-l-4 border-red-500 px-3 py-1">
              <span className="line-through text-red-300">{line}</span>
            </div>
          )
        }
        return null
      })}
      
      {/* Show added lines (in new but not in old) */}
      {newLines.map((line, idx) => {
        if (!oldSet.has(line) && line.trim()) {
          return (
            <div key={`new-${idx}`} className="bg-green-900/20 border-l-4 border-green-500 px-3 py-1">
              <span className="text-green-300">{line}</span>
            </div>
          )
        }
        return null
      })}
      
      {/* Show unchanged lines */}
      {newLines.map((line, idx) => {
        if (oldSet.has(line) && line.trim()) {
          return (
            <div key={`unch-${idx}`} className="px-3 py-1 text-gray-400">
              {line}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

