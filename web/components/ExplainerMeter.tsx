interface ExplainerMeterProps {
  length?: number;
}

export function ExplainerMeter({ length }: ExplainerMeterProps) {
  if (length === undefined || length === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-brand-subtle">Explainer: —</div>
      </div>
    );
  }

  const getLengthStatus = (length: number) => {
    if (length < 20) return { label: 'Under', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (length <= 60) return { label: 'OK', color: 'text-green-600', bg: 'bg-green-50' };
    return { label: 'Over', color: 'text-orange-600', bg: 'bg-orange-50' };
  };

  const status = getLengthStatus(length);
  const targetRange = '20-60 words';

  return (
    <div className="flex items-center gap-2">
      {/* Small Meter */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-8 bg-brand-surface2 rounded-8 border border-brand-border overflow-hidden relative">
          {/* Target range indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full relative">
              {/* Target zone (20-60 words) */}
              <div className="absolute left-[33%] right-[17%] top-0 bottom-0 bg-green-200 opacity-30"></div>
              {/* Current position indicator */}
              <div 
                className={`absolute top-1/2 w-1 h-4 -translate-y-1/2 transition-all duration-300 ${status.bg}`}
                style={{ 
                  left: `${Math.min(100, Math.max(0, ((length - 10) / 80) * 100))}%` 
                }}
              />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-medium ${status.color}`}>
              {length}
            </span>
          </div>
        </div>
        <span className="text-xs text-brand-subtle">Explainer</span>
      </div>
      
      {/* Status and Target */}
      <div className="flex flex-col gap-1">
        <span className={`text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
        <span className="text-xs text-brand-subtle">
          Target: {targetRange}
        </span>
      </div>
    </div>
  );
}

