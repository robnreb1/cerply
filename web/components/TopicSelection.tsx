/**
 * TopicSelection Component
 * Displays topic suggestions when user provides subject-level request
 */

'use client';

interface Topic {
  topicId: string | null;
  title: string;
  description: string;
  exists: boolean;
  confidence?: number;
}

interface TopicSelectionProps {
  topics: Topic[];
  onSelect: (topic: Topic) => void;
  onRefine?: () => void;
}

export default function TopicSelection({ topics, onSelect, onRefine }: TopicSelectionProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 my-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        Choose a topic to focus on:
      </h3>
      <div className="space-y-3">
        {topics.map((topic, i) => (
          <button
            key={i}
            onClick={() => onSelect(topic)}
            className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-white hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {topic.title}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {topic.description}
                </div>
              </div>
              {topic.exists && (
                <div className="ml-3 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium whitespace-nowrap">
                  ✓ Content available
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      {onRefine && (
        <button
          onClick={onRefine}
          className="mt-4 text-sm text-gray-600 hover:text-blue-600 hover:underline transition-colors"
        >
          I want something more specific...
        </button>
      )}
    </div>
  );
}

