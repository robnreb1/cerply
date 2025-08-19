interface QualityScoreProps {
  score?: number;
}

export function QualityScore({ score }: QualityScoreProps) {
  if (score === undefined || score === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-brand-subtle">Quality: —</div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score < 60) return 'text-red-600';
    if (score < 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score < 60) return 'bg-red-100';
    if (score < 80) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  const getScoreBorderColor = (score: number) => {
    if (score < 60) return 'border-red-200';
    if (score < 80) return 'border-yellow-200';
    return 'border-green-200';
  };

  const getScoreLabel = (score: number) => {
    if (score < 60) return 'Poor';
    if (score < 80) return 'Fair';
    return 'Good';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Big Score Display */}
      <div className={`flex items-center justify-center w-16 h-16 rounded-12 border-2 ${getScoreBorderColor(score)} ${getScoreBgColor(score)}`}>
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
      </div>
      
      {/* Score Details */}
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium text-brand-ink">
          Quality Score
        </div>
        <div className="text-xs text-brand-subtle">
          {getScoreLabel(score)}
        </div>
        
        {/* Progress Bar */}
        <div className="w-24 h-2 bg-brand-surface2 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${getScoreBgColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

