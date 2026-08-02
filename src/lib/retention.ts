import type { Attempt, RetentionProgress, RetentionStore, WeightedWord } from '../types';
import { loadProgress, wordKey } from './storage';

const RETENTION_PROGRESS_KEY = 'vocab-trainer-retention-progress';

export function loadRetentionProgress(): RetentionStore {
  try {
    const raw = localStorage.getItem(RETENTION_PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RetentionStore;
  } catch {
    return {};
  }
}

export function saveRetentionProgress(progress: RetentionStore): void {
  localStorage.setItem(RETENTION_PROGRESS_KEY, JSON.stringify(progress));
}

export function recordRetentionAttempt(
  word: string,
  userAnswer: string,
  score: number,
): void {
  const progress = loadRetentionProgress();
  const key = wordKey(word);
  const existing: RetentionProgress = progress[key] ?? { word, attempts: [] };

  const attempt: Attempt = {
    timestamp: Date.now(),
    score,
    userAnswer,
  };

  existing.attempts.push(attempt);
  existing.word = word;
  progress[key] = existing;
  saveRetentionProgress(progress);
}

export function getRetentionStats(): {
  wordCount: number;
  attemptCount: number;
  overallAverage: number;
} {
  const progress = loadRetentionProgress();
  const entries = Object.values(progress).filter((entry) => entry.attempts.length > 0);

  if (entries.length === 0) {
    return { wordCount: 0, attemptCount: 0, overallAverage: 0 };
  }

  let totalScore = 0;
  let totalAttempts = 0;
  for (const entry of entries) {
    for (const attempt of entry.attempts) {
      totalScore += attempt.score;
      totalAttempts++;
    }
  }

  return {
    wordCount: entries.length,
    attemptCount: totalAttempts,
    overallAverage: Math.round(totalScore / totalAttempts),
  };
}

export function migrateRetentionWordProgress(oldWord: string, newWord: string): void {
  const oldKey = wordKey(oldWord);
  const newKey = wordKey(newWord);
  if (oldKey === newKey) {
    const progress = loadRetentionProgress();
    if (progress[oldKey]) {
      progress[oldKey].word = newWord.trim();
      saveRetentionProgress(progress);
    }
    return;
  }

  const progress = loadRetentionProgress();
  const oldEntry = progress[oldKey];
  if (!oldEntry) return;

  const newEntry = progress[newKey];
  if (newEntry) {
    newEntry.attempts = [...newEntry.attempts, ...oldEntry.attempts].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    newEntry.word = newWord.trim();
  } else {
    progress[newKey] = { ...oldEntry, word: newWord.trim() };
  }

  delete progress[oldKey];
  saveRetentionProgress(progress);
}

function weightedPick(pool: WeightedWord[], count: number): string[] {
  const selected: string[] = [];
  const remaining = [...pool];

  while (selected.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    let index = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= remaining[i].weight;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    selected.push(remaining[index].word);
    remaining.splice(index, 1);
  }

  return selected;
}

/** Pick words for tracked test — retention scores; eligible if studied in main progress. */
export function pickRetentionTestWords(count: number): string[] {
  const studied = Object.values(loadProgress()).filter((entry) => entry.attempts.length > 0);

  if (studied.length === 0) return [];

  const retention = loadRetentionProgress();
  const weighted = studied.map((entry) => {
    const retEntry = retention[wordKey(entry.word)];
    const lastScore = retEntry?.attempts.at(-1)?.score;
    const weight = lastScore === undefined ? 50 : Math.max(1, 100 - lastScore);
    return { word: entry.word, weight };
  });

  return weightedPick(weighted, Math.min(count, studied.length));
}

export function getRetentionEligibleCount(): number {
  return Object.values(loadProgress()).filter((entry) => entry.attempts.length > 0).length;
}
