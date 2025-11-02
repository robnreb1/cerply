'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatPane } from '../components/ChatPane'
import { ContentPane } from '../components/ContentPane'
import { ModulesListPane } from '../components/ModulesListPane'

/**
 * Cerply V2.0 Build Workspace
 * 4-pane layout: ModulesList | Chat | (Content stack Calibration)
 */
export default function BuildWorkspace() {
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [contentRefresh, setContentRefresh] = useState(0) // Trigger to refresh content
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null) // Selected topic for filtering
  
  // Resizable panes state
  const [modulesListWidth, setModulesListWidth] = useState(10) // 10% of total width
  const [chatWidth, setChatWidth] = useState(35) // 35% of total width (percentage)
  const [contentHeight, setContentHeight] = useState(66.67) // 2/3 of right side in percentage
  const [isResizingModulesList, setIsResizingModulesList] = useState(false)
  const [isResizingChat, setIsResizingChat] = useState(false)
  const [isResizingContent, setIsResizingContent] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const rightPaneRef = useRef<HTMLDivElement>(null)

  const handleContentUpdate = () => {
    setContentRefresh(prev => prev + 1)
  }
  
  const handleModuleSelect = (id: string) => {
    if (id === 'new') {
      // Reset to create new module
      setModuleId(null)
      setIsLocked(false)
    } else {
      // Load existing module
      setModuleId(id)
      setContentRefresh(prev => prev + 1)
    }
  }
  
  // Handle pane resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.getBoundingClientRect().width
        
        if (isResizingModulesList) {
          const newWidthPx = e.clientX - containerRef.current.getBoundingClientRect().left
          const newWidthPercent = (newWidthPx / containerWidth) * 100
          if (newWidthPercent >= 5 && newWidthPercent <= 20) {
            setModulesListWidth(newWidthPercent)
          }
        }
        
        if (isResizingChat) {
          const modulesListWidthPx = (modulesListWidth / 100) * containerWidth
          const newChatWidthPx = e.clientX - containerRef.current.getBoundingClientRect().left - modulesListWidthPx
          const newChatWidthPercent = (newChatWidthPx / containerWidth) * 100
          if (newChatWidthPercent >= 20 && newChatWidthPercent <= 50) {
            setChatWidth(newChatWidthPercent)
          }
        }
      }
      
      if (isResizingContent && rightPaneRef.current) {
        const rightPaneTop = rightPaneRef.current.getBoundingClientRect().top
        const rightPaneHeight = rightPaneRef.current.getBoundingClientRect().height
        const newHeight = e.clientY - rightPaneTop
        const newHeightPercent = (newHeight / rightPaneHeight) * 100
        if (newHeightPercent >= 20 && newHeightPercent <= 80) {
          setContentHeight(newHeightPercent)
        }
      }
    }
    
    const handleMouseUp = () => {
      setIsResizingModulesList(false)
      setIsResizingChat(false)
      setIsResizingContent(false)
    }
    
    if (isResizingModulesList || isResizingChat || isResizingContent) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizingModulesList, isResizingChat, isResizingContent, modulesListWidth])

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e]">
      {/* Header - Cursor style */}
      <header className="h-12 border-b border-[#3a3a3a] flex items-center justify-between px-4 bg-[#181818] flex-shrink-0">
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

      {/* 4-Pane Layout: ModulesList | Chat | (Content stack Calibration) */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Modules List Pane - Far Left (resizable) */}
        <div 
          style={{ width: `${modulesListWidth}%`, minWidth: '80px', maxWidth: '20%' }} 
          className="flex-shrink-0 relative"
        >
          <ModulesListPane 
            currentModuleId={moduleId}
            onModuleSelect={handleModuleSelect}
          />
          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors group z-10"
            onMouseDown={() => setIsResizingModulesList(true)}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
        </div>

        {/* Chat Pane - Left (resizable) */}
        <div 
          style={{ width: `${chatWidth}%`, minWidth: '20%', maxWidth: '50%' }} 
          className="border-r border-[#3a3a3a] flex flex-col bg-[#1e1e1e] relative flex-shrink-0"
        >
          <ChatPane 
            moduleId={moduleId} 
            onModuleCreated={setModuleId}
            onContentUpdate={handleContentUpdate}
            isLocked={isLocked}
          />
          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors group z-10"
            onMouseDown={() => setIsResizingChat(true)}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
        </div>

        {/* Right Side - Single Content Pane (flexible) */}
        <div ref={rightPaneRef} className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
          <ContentPane 
            moduleId={moduleId}
            isLocked={isLocked}
            onLockChange={setIsLocked}
            refreshTrigger={contentRefresh}
            selectedTopic={selectedTopic}
            onTopicSelect={setSelectedTopic}
          />
        </div>
      </div>
    </div>
  )
}
