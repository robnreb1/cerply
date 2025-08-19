interface PruneSuggestion {
  item: {
    id: string;
    stem: string;
    meta?: {
      qualityScore?: number;
      bannedFlags?: string[];
      conflicts?: string[];
    };
  };
  reason: string;
}

interface PruneSuggestionsProps {
  suggestions: PruneSuggestion[];
}

export function PruneSuggestions({ suggestions }: PruneSuggestionsProps) {
  if (!suggestions.length) return null;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-brand-ink">Prune Suggestions</h3>
        <span className="text-sm text-brand-subtle">
          {suggestions.length} item{suggestions.length !== 1 ? 's' : ''} recommended for review
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="text-left py-2 font-medium text-brand-ink">Item</th>
              <th className="text-left py-2 font-medium text-brand-ink">Reason</th>
              <th className="text-left py-2 font-medium text-brand-ink">Quality Score</th>
              <th className="text-left py-2 font-medium text-brand-ink">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {suggestions.map((suggestion) => (
              <tr key={suggestion.item.id} className="hover:bg-brand-surface2">
                <td className="py-3 pr-4">
                  <div className="max-w-xs">
                    <div className="font-medium text-brand-ink line-clamp-2">
                      {suggestion.item.stem}
                    </div>
                    <div className="text-xs text-brand-subtle mt-1">
                      ID: {suggestion.item.id}
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="text-brand-ink">
                    {suggestion.reason}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {suggestion.item.meta?.qualityScore !== undefined ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        suggestion.item.meta.qualityScore < 60 
                          ? 'bg-red-100 text-red-700' 
                          : suggestion.item.meta.qualityScore < 80 
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {suggestion.item.meta.qualityScore}
                      </span>
                    ) : (
                      <span className="text-brand-subtle">—</span>
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <button 
                    className="px-3 py-1 text-xs rounded-8 border border-brand-border bg-brand-surface text-brand-ink hover:bg-brand-surface2 transition-colors"
                    onClick={() => {
                      // For now, just log the action (no-op as specified)
                      console.log('Archive suggestion clicked for item:', suggestion.item.id);
                      alert('Archive functionality not yet implemented');
                    }}
                  >
                    Archive suggestion
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-brand-subtle">
        These items have quality issues that may affect learning outcomes. 
        Review and consider archiving or improving them.
      </div>
    </div>
  );
}
