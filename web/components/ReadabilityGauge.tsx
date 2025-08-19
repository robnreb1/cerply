interface ReadabilityGaugeProps {
  score?: number;
}

export function ReadabilityGauge({ score }: ReadabilityGaugeProps) {
  if (score === undefined || score === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-brand-subtle">Readability: —</div>
      </div>
    );
  }

  const getReadabilityColor = (score: number) => {
    if (score < 30) return 'text-red-600';
    if (score < 60) return 'text-yellow-600';
    if (score < 80) return 'text-blue-600';
    return 'text-green-600';
  };

  const getReadabilityLabel = (score: number) => {
    if (score < 30) return 'Very Hard';
    if (score < 60) return 'Hard';
    if (score < 80) return 'Moderate';
    return 'Easy';
  };

  const getReadabilityBg = (score: number) => {
    if (score < 30) return 'bg-red-50';
    if (score < 60) return 'bg-yellow-50';
    if (score < 80) return 'bg-blue-50';
    return 'bg-green-50';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Small Meter */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-8 bg-brand-surface2 rounded-8 border border-brand-border overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-300 ${getReadabilityBg(score)}`}
            style={{ width: `${score}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-medium ${getReadabilityColor(score)}`}>
              {score}
            </span>
          </div>
        </div>
        <span className="text-xs text-brand-subtle">Readability</span>
      </div>
      
      {/* Label */}
      <div className="text-xs text-brand-ink font-medium">
        {getReadabilityLabel(score)}
      </div>
    </div>
  );
}

