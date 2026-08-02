import { useCallback, useMemo, useState } from 'react';
import { getSessionStats } from '../lib/sessionStats';
import {
  getTrackedStats,
  getUntestedWords,
  getWordTrends,
  TRACKED_DISPLAY_LIMIT,
} from '../lib/storage';
import type { StudyStatistics, WordStatistics } from '../types';

export function useStatistics(allWords: string[]): StudyStatistics & { refresh: () => void } {
  const [revision, setRevision] = useState(0);
  const [trends, setTrends] = useState<WordStatistics[]>(() => getWordTrends());

  const refresh = useCallback(() => {
    setTrends(getWordTrends());
    setRevision((current) => current + 1);
  }, []);

  const trackedStats = useMemo(() => getTrackedStats(), [trends]);
  const improvingWords = useMemo(
    () => trends.filter((t) => t.trend === 'improving'),
    [trends],
  );
  const displayedTrends = useMemo(
    () => trends.slice(0, TRACKED_DISPLAY_LIMIT),
    [trends],
  );
  const trackedOverflow = Math.max(0, trends.length - displayedTrends.length);
  const maxTrackedWords = Math.min(trackedStats.count, 20);
  const untestedCount = useMemo(
    () => getUntestedWords(allWords).length,
    [allWords, trends],
  );
  const maxNewWords = Math.min(untestedCount, 20);
  const sessionStats = useMemo(() => getSessionStats(), [revision]);

  return {
    trends,
    trackedStats,
    improvingWords,
    displayedTrends,
    trackedOverflow,
    maxTrackedWords,
    untestedCount,
    maxNewWords,
    sessionStats,
    refresh,
  };
}
