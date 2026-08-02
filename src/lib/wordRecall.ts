import type { Attempt, RetentionProgress, RetentionStore, WeightedWord } from '../types';
import { resolveStoredDefinition } from './definitions';
import { isBadWordRecallDefinition } from './wordRecallPrompt';
import { loadProgress, wordKey } from './storage';

const WORD_RECALL_PROGRESS_KEY = 'vocab-trainer-word-recall-progress';

export function loadWordRecallProgress(): RetentionStore {
  try {
    const raw = localStorage.getItem(WORD_RECALL_PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RetentionStore;
  } catch {
    return {};
  }
}

export function saveWordRecallProgress(progress: RetentionStore): void {
  localStorage.setItem(WORD_RECALL_PROGRESS_KEY, JSON.stringify(progress));
}

export function recordWordRecallAttempt(
  word: string,
  userAnswer: string,
  score: number,
): void {
  const progress = loadWordRecallProgress();
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
  saveWordRecallProgress(progress);
}

export function getWordRecallStats(): {
  wordCount: number;
  attemptCount: number;
  overallAverage: number;
} {
  const progress = loadWordRecallProgress();
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

export function migrateWordRecallWordProgress(oldWord: string, newWord: string): void {
  const oldKey = wordKey(oldWord);
  const newKey = wordKey(newWord);
  if (oldKey === newKey) {
    const progress = loadWordRecallProgress();
    if (progress[oldKey]) {
      progress[oldKey].word = newWord.trim();
      saveWordRecallProgress(progress);
    }
    return;
  }

  const progress = loadWordRecallProgress();
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
  saveWordRecallProgress(progress);
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

function getStudiedWordsWithDefinitions(): Array<{ word: string; definition: string }> {
  return Object.values(loadProgress())
    .filter((entry) => entry.attempts.length > 0)
    .map((entry) => ({
      word: entry.word,
      definition: entry.lastDefinition || resolveStoredDefinition(entry.word) || '',
    }))
    .filter((entry) => entry.definition.length > 0);
}

export function getWordRecallEligibleCount(): number {
  return getStudiedWordsWithDefinitions().filter(
    (entry) => !isBadWordRecallDefinition(entry.word, entry.definition),
  ).length;
}

/** Pick words for word recall test — weaker word-supply scores appear more often. */
export function pickWordRecallTestWords(count: number): string[] {
  const eligible = getStudiedWordsWithDefinitions().filter(
    (entry) => !isBadWordRecallDefinition(entry.word, entry.definition),
  );

  if (eligible.length === 0) return [];

  const wordRecall = loadWordRecallProgress();
  const weighted = eligible.map((entry) => {
    const recallEntry = wordRecall[wordKey(entry.word)];
    const lastScore = recallEntry?.attempts.at(-1)?.score;
    const weight = lastScore === undefined ? 50 : Math.max(1, 100 - lastScore);
    return { word: entry.word, weight };
  });

  return weightedPick(weighted, Math.min(count, eligible.length));
}
