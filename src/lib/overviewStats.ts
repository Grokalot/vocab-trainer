import { getRetentionStats } from './retention';
import { getSessionStats } from './sessionStats';
import { getTrackedStats, loadProgress } from './storage';
import { loadRetentionProgress } from './retention';
import { getWordRecallStats, loadWordRecallProgress } from './wordRecall';
import type { OverviewStats } from '../types';

function getCombinedAverage(): number {
  let totalScore = 0;
  let totalAttempts = 0;

  for (const entry of Object.values(loadProgress())) {
    for (const attempt of entry.attempts) {
      totalScore += attempt.score;
      totalAttempts++;
    }
  }

  for (const entry of Object.values(loadRetentionProgress())) {
    for (const attempt of entry.attempts) {
      totalScore += attempt.score;
      totalAttempts++;
    }
  }

  for (const entry of Object.values(loadWordRecallProgress())) {
    for (const attempt of entry.attempts) {
      totalScore += attempt.score;
      totalAttempts++;
    }
  }

  return totalAttempts === 0 ? 0 : Math.round(totalScore / totalAttempts);
}

export function getOverviewStats(): OverviewStats {
  const sessions = getSessionStats();
  const { count: wordsLearned } = getTrackedStats();
  const definitionTest = getRetentionStats();
  const wordRecall = getWordRecallStats();

  return {
    totalSessions: sessions.totalSessions,
    sessionsNew: sessions.new,
    sessionsTrackedStudy: sessions.trackedStudy,
    sessionsTrackedTest: sessions.trackedTest,
    sessionsTrackedTestWord: sessions.trackedTestWord,
    wordsLearned,
    totalAverage: getCombinedAverage(),
    definitionAttempts: definitionTest.attemptCount,
    definitionAverage: definitionTest.overallAverage,
    wordRecallAttempts: wordRecall.attemptCount,
    wordRecallAverage: wordRecall.overallAverage,
  };
}
