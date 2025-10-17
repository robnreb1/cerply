/**
 * WorkflowLoading Component
 * Shows contextual loading messages during workflow transitions
 */

'use client';

const LOADING_MESSAGES: Record<string, string> = {
  learner_welcome: 'Understanding your request...',
  build: 'Preparing your curriculum...',
  module: 'Loading your lesson...',
  topic_search: 'Searching for topics...',
  intent_detection: 'Processing...',
};

interface WorkflowLoadingProps {
  workflow: string;
  message?: string;
}

export default function WorkflowLoading({ workflow, message }: WorkflowLoadingProps) {
  const displayMessage = message || LOADING_MESSAGES[workflow] || 'Loading...';
  
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-gray-600">{displayMessage}</span>
    </div>
  );
}

