/**
 * Simple diff utility for track changes UI
 * Creates line-by-line diffs similar to Cursor's approach
 */

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  content: string
  lineNumber: number
}

export interface Diff {
  oldLines: DiffLine[]
  newLines: DiffLine[]
  changes: {
    additions: number
    deletions: number
    unchanged: number
  }
}

/**
 * Create a simple line-by-line diff
 * Returns array of changes with their types
 */
export function createDiff(oldContent: string, newContent: string): Diff {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  
  const result: Diff = {
    oldLines: [],
    newLines: [],
    changes: { additions: 0, deletions: 0, unchanged: 0 }
  }
  
  // Simple line matching algorithm
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)
  
  // Process old lines
  oldLines.forEach((line, idx) => {
    if (newSet.has(line)) {
      result.oldLines.push({ type: 'unchanged', content: line, lineNumber: idx + 1 })
      result.changes.unchanged++
    } else {
      result.oldLines.push({ type: 'removed', content: line, lineNumber: idx + 1 })
      result.changes.deletions++
    }
  })
  
  // Process new lines
  newLines.forEach((line, idx) => {
    if (oldSet.has(line)) {
      result.newLines.push({ type: 'unchanged', content: line, lineNumber: idx + 1 })
    } else {
      result.newLines.push({ type: 'added', content: line, lineNumber: idx + 1 })
      result.changes.additions++
    }
  })
  
  return result
}

/**
 * Create inline diff markers (for Cursor-style display)
 */
export function createInlineDiff(oldContent: string, newContent: string): string {
  const diff = createDiff(oldContent, newContent)
  let result = ''
  
  // Show removed lines with strikethrough
  diff.oldLines.filter(l => l.type === 'removed').forEach(line => {
    result += `~~${line.content}~~\n`
  })
  
  // Show added lines with highlight
  diff.newLines.filter(l => l.type === 'added').forEach(line => {
    result += `**${line.content}**\n`
  })
  
  // Show unchanged lines normally
  diff.newLines.filter(l => l.type === 'unchanged').forEach(line => {
    result += `${line.content}\n`
  })
  
  return result
}

