interface QualityFlagsProps {
  bannedFlags?: string[];
  conflicts?: string[];
}

export function QualityFlags({ bannedFlags, conflicts }: QualityFlagsProps) {
  const hasBanned = bannedFlags && bannedFlags.length > 0;
  const hasConflicts = conflicts && conflicts.length > 0;

  if (!hasBanned && !hasConflicts) {
    return (
      <div className="text-sm text-brand-subtle">
        ✓ No quality issues detected
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Banned Flags */}
      {hasBanned && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-brand-ink">Banned Patterns:</span>
          <div className="flex flex-wrap gap-1">
            {bannedFlags.map((flag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 border border-red-200"
              >
                {flag}
              </span>
            ))}
          </div>
          <span className="text-xs text-brand-subtle">
            ({bannedFlags.length} total)
          </span>
        </div>
      )}

      {/* Conflicts */}
      {hasConflicts && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-brand-ink">Answer Conflicts:</span>
          <div className="flex flex-wrap gap-1">
            {conflicts.map((conflict, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 border border-orange-200"
              >
                {conflict}
              </span>
            ))}
          </div>
          <span className="text-xs text-brand-subtle">
            ({conflicts.length} total)
          </span>
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-brand-subtle">
        {hasBanned && hasConflicts && (
          <span>
            {bannedFlags.length} banned patterns, {conflicts.length} conflicts
          </span>
        )}
        {hasBanned && !hasConflicts && (
          <span>{bannedFlags.length} banned patterns</span>
        )}
        {!hasBanned && hasConflicts && (
          <span>{conflicts.length} conflicts</span>
        )}
      </div>
    </div>
  );
}

