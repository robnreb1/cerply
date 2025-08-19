'use client';

import { useState, useEffect } from 'react';
import { QualityScore } from './QualityScore';
import { QualityFlags } from './QualityFlags';
import { ReadabilityGauge } from './ReadabilityGauge';
import { ExplainerMeter } from './ExplainerMeter';
import { PruneSuggestions } from './PruneSuggestions';

type MCQItem = {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
};

type ItemMeta = {
  readability?: number;
  bannedFlags: string[];
  qualityScore?: number;
  sourceSnippet?: string;
  conflicts?: string[];
  explainerLength?: number;
};

type QualityResult = {
  itemId: string;
  meta: ItemMeta;
  conflicts?: string[];
  explainerLength?: number;
};

type MCQItemAugmented = MCQItem & { meta?: ItemMeta };

interface QualityPanelProps {
  items: MCQItem[];
}

export function QualityPanel({ items }: QualityPanelProps) {
  const [qualityData, setQualityData] = useState<MCQItemAugmented[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'scoreDesc' | 'scoreAsc' | 'readability'>('scoreDesc');
  const [filters, setFilters] = useState({
    hasBannedFlags: false,
    hasConflicts: false,
    lowScore: false,
  });

  // Update URL hash when sort/filter changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (sortBy !== 'scoreDesc') params.set('qSort', sortBy);
    if (filters.hasBannedFlags) params.set('qFilter', 'banned');
    if (filters.hasConflicts) params.set('qFilter', 'conflicts');
    if (filters.lowScore) params.set('qFilter', 'lowScore');
    
    const hash = params.toString() ? `?${params.toString()}` : '';
    window.location.hash = hash;
  }, [sortBy, filters]);

  // Read initial sort/filter from URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const sort = params.get('qSort');
      if (sort && ['scoreDesc', 'scoreAsc', 'readability'].includes(sort)) {
        setSortBy(sort as any);
      }
      
      const filter = params.get('qFilter');
      if (filter) {
        setFilters({
          hasBannedFlags: filter === 'banned',
          hasConflicts: filter === 'conflicts',
          lowScore: filter === 'lowScore',
        });
      }
    }
  }, []);

  const computeQuality = async () => {
    if (!items.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/curator/quality/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setQualityData(data.items);
    } catch (err: any) {
      console.error('Quality computation failed:', err);
      setError(err?.message || 'Failed to compute quality metrics');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    if (!qualityData) return [];
    
    let filtered = qualityData.filter(item => {
      if (filters.hasBannedFlags && (!item.meta?.bannedFlags?.length)) return false;
      if (filters.hasConflicts && (!item.meta?.conflicts?.length)) return false;
      if (filters.lowScore && (item.meta?.qualityScore ?? 0) >= 60) return false;
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'scoreDesc':
          return (b.meta?.qualityScore ?? 0) - (a.meta?.qualityScore ?? 0);
        case 'scoreAsc':
          return (a.meta?.qualityScore ?? 0) - (b.meta?.qualityScore ?? 0);
        case 'readability':
          return (b.meta?.readability ?? 0) - (a.meta?.readability ?? 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [qualityData, filters, sortBy]);

  const pruneSuggestions = useMemo(() => {
    if (!qualityData) return [];
    
    return qualityData
      .filter(item => {
        const score = item.meta?.qualityScore ?? 0;
        const hasBanned = item.meta?.bannedFlags?.length;
        const hasConflicts = item.meta?.conflicts?.length;
        return score < 60 || hasBanned || hasConflicts;
      })
      .map(item => ({
        item,
        reason: [
          item.meta?.qualityScore && item.meta.qualityScore < 60 ? 'Low quality score' : null,
          item.meta?.bannedFlags?.length ? `${item.meta.bannedFlags.length} banned patterns` : null,
          item.meta?.conflicts?.length ? `${item.meta.conflicts.length} answer conflicts` : null,
        ].filter(Boolean).join(', '),
      }));
  }, [qualityData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button className="btn" disabled>
            Computing Quality...
          </button>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-brand-surface2 rounded mb-2"></div>
              <div className="h-3 bg-brand-surface2 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card space-y-4">
        <div className="text-center space-y-3">
          <div className="text-lg font-medium text-brand-ink">Quality Check Failed</div>
          <div className="text-brand-subtle">{error}</div>
          <button className="btn" onClick={computeQuality}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!qualityData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button className="btn" onClick={computeQuality}>
            Compute Quality
          </button>
        </div>
        <div className="text-sm text-brand-subtle">
          Click to analyze readability, flags, and quality scores for your items.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Quality Analysis</h3>
          <button className="btn" onClick={computeQuality}>
            Recompute
          </button>
        </div>
        
        {/* Sort & Filter Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-brand-subtle">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 rounded-8 border border-brand-border bg-brand-surface text-brand-ink text-sm"
            >
              <option value="scoreDesc">Score (High → Low)</option>
              <option value="scoreAsc">Score (Low → High)</option>
              <option value="readability">Readability</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.hasBannedFlags}
                onChange={(e) => setFilters(prev => ({ ...prev, hasBannedFlags: e.target.checked }))}
                className="rounded"
              />
              Has banned patterns
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.hasConflicts}
                onChange={(e) => setFilters(prev => ({ ...prev, hasConflicts: e.target.checked }))}
                className="rounded"
              />
              Has conflicts
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.lowScore}
                onChange={(e) => setFilters(prev => ({ ...prev, lowScore: e.target.checked }))}
                className="rounded"
              />
              Low score (&lt;60)
            </label>
          </div>
        </div>
      </div>

      {/* Quality Items */}
      <div className="space-y-3">
        {filteredAndSortedItems.map((item) => (
          <div key={item.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium text-brand-ink mb-2">{item.stem}</div>
                <div className="flex flex-wrap gap-3">
                  <QualityScore score={item.meta?.qualityScore} />
                  <ReadabilityGauge score={item.meta?.readability} />
                  <ExplainerMeter length={item.meta?.explainerLength} />
                </div>
              </div>
            </div>
            
            <QualityFlags 
              bannedFlags={item.meta?.bannedFlags} 
              conflicts={item.meta?.conflicts}
            />
          </div>
        ))}
      </div>

      {/* Prune Suggestions */}
      {pruneSuggestions.length > 0 && (
        <PruneSuggestions suggestions={pruneSuggestions} />
      )}
    </div>
  );
}

// Helper hook for useMemo
function useMemo<T>(factory: () => T, deps: any[]): T {
  const [value, setValue] = useState<T>(factory);
  
  useEffect(() => {
    setValue(factory());
  }, deps);
  
  return value;
}
