import { useCallback, useMemo, useState } from 'react';
import { getOverviewStats } from '../lib/overviewStats';
import { getRetentionEligibleCount } from '../lib/retention';
import { getWordRecallEligibleCount } from '../lib/wordRecall';
import { getSessionStats } from '../lib/sessionStats';
import {
  getTrackedStats,
  getUntestedWords,
  getWordTrends,
} from '../lib/storage';
import type { StudyStatistics, WordStatistics } from '../types';

export function useStatistics(allWords: string[]): StudyStatistics & { refresh: () => void } {
  const [revision, setRevision] = useState(0);
  const [trends, setTrends] = useState<WordStatistics[]>(() => getWordTrends());

  const refresh = useCallback(() => {
    setTrends(getWordTrends());
    setRevision((current) => current + 1);
  }, []);

  const trackedStats = useMemo(() => getTrackedStats(), [trends, revision]);
  const improvingWords = useMemo(
    () => trends.filter((t) => t.trend === 'improving'),
    [trends],
  );
  const maxTrackedWords = Math.min(trackedStats.count, 20);
  const retentionEligible = useMemo(() => getRetentionEligibleCount(), [trends, revision]);
  const maxRetentionWords = Math.min(retentionEligible, 20);
  const wordRecallEligible = useMemo(() => getWordRecallEligibleCount(), [trends, revision]);
  const maxWordRecallWords = Math.min(wordRecallEligible, 20);
  const untestedCount = useMemo(
    () => getUntestedWords(allWords).length,
    [allWords, trends, revision],
  );
  const maxNewWords = Math.min(untestedCount, 20);
  const sessionStats = useMemo(() => getSessionStats(), [revision]);
  const overview = useMemo(() => getOverviewStats(), [revision]);

  return {
    trends,
    trackedStats,
    improvingWords,
    maxTrackedWords,
    maxRetentionWords,
    maxWordRecallWords,
    untestedCount,
    maxNewWords,
    sessionStats,
    overview,
    refresh,
  };
}
