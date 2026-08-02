import { loadWordRecallProgress } from './wordRecall';
import type {
  AppSettings,
  Attempt,
  ProgressStore,
  TrackedStats,
  Trend,
  WordProgress,
  WordStatistics,
  WeightedWord,
} from '../types';

const PROGRESS_KEY = 'vocab-trainer-progress';
const SETTINGS_KEY = 'vocab-trainer-settings';

export const TRACKED_DISPLAY_LIMIT = 10;

const defaultSettings: AppSettings = {
  openaiApiKey: '',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return {};
  }
}

export function saveProgress(progress: ProgressStore): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function recordAttempt(
  word: string,
  definition: string,
  userAnswer: string,
  score: number,
): void {
  const progress = loadProgress();
  const key = wordKey(word);
  const existing = progress[key] ?? { word, attempts: [], lastDefinition: definition };

  const attempt: Attempt = {
    timestamp: Date.now(),
    score,
    userAnswer,
  };

  existing.attempts.push(attempt);
  existing.lastDefinition = definition;
  progress[key] = existing;
  saveProgress(progress);
}

export function getWordTrends(): WordStatistics[] {
  const progress = loadProgress();
  const wordRecall = loadWordRecallProgress();

  return Object.values(progress)
    .filter((entry) => entry.attempts.length > 0)
    .map((entry): WordStatistics => {
      const scores = entry.attempts.map((a) => a.score);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const recent = scores.slice(-3);
      const recentAverage = recent.reduce((a, b) => a + b, 0) / recent.length;

      const wordAttempts = wordRecall[wordKey(entry.word)]?.attempts ?? [];
      const wordAttemptCount = wordAttempts.length;
      const wordAverageScore =
        wordAttemptCount > 0
          ? Math.round(
              wordAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
                wordAttemptCount,
            )
          : 0;

      let trend: Trend = 'stable';
      if (entry.attempts.length === 1) {
        trend = 'new';
      } else if (recentAverage >= averageScore + 10) {
        trend = 'improving';
      } else if (recentAverage <= averageScore - 10) {
        trend = 'declining';
      }

      return {
        word: entry.word,
        trend,
        averageScore: Math.round(averageScore),
        recentAverage: Math.round(recentAverage),
        attemptCount: entry.attempts.length,
        wordAttemptCount,
        wordAverageScore,
      };
    })
    .sort((a, b) => {
      if (a.trend === 'improving' && b.trend !== 'improving') return -1;
      if (b.trend === 'improving' && a.trend !== 'improving') return 1;
      return b.recentAverage - a.recentAverage;
    });
}

export function getUntestedWords(allWords: string[]): string[] {
  const progress = loadProgress();
  return allWords.filter((word) => {
    const entry = progress[wordKey(word)];
    return !entry?.attempts.length;
  });
}

export function pickNewWords(allWords: string[], count: number): string[] {
  const pool = [...getUntestedWords(allWords)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function getTrackedStats(): TrackedStats {
  const progress = loadProgress();
  const entries = Object.values(progress).filter((entry) => entry.attempts.length > 0);

  if (entries.length === 0) {
    return { count: 0, overallAverage: 0 };
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
    count: entries.length,
    overallAverage: Math.round(totalScore / totalAttempts),
  };
}

export function getCachedDefinition(word: string): string | undefined {
  const progress = loadProgress();
  const definition = progress[wordKey(word)]?.lastDefinition;
  return definition || undefined;
}

export function isCustomDefinition(word: string): boolean {
  return Boolean(loadProgress()[wordKey(word)]?.customDefinition);
}

export function saveDefinition(word: string, definition: string): void {
  const trimmed = definition.trim();
  if (!trimmed) {
    throw new Error('Enter a definition.');
  }

  const progress = loadProgress();
  const key = wordKey(word);
  const existing: WordProgress = progress[key] ?? { word, attempts: [], lastDefinition: '' };

  existing.lastDefinition = trimmed;
  existing.word = word;
  existing.customDefinition = true;
  progress[key] = existing;
  saveProgress(progress);
}

export function saveDictionaryDefinition(word: string, definition: string): void {
  const trimmed = definition.trim();
  if (!trimmed) return;

  const progress = loadProgress();
  const key = wordKey(word);
  const existing: WordProgress = progress[key] ?? { word, attempts: [], lastDefinition: '' };

  existing.lastDefinition = trimmed;
  existing.word = word;
  existing.customDefinition = false;
  progress[key] = existing;
  saveProgress(progress);
}

export function wordKey(word: string): string {
  return word.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function migrateWordProgress(oldWord: string, newWord: string): void {
  const oldKey = wordKey(oldWord);
  const newKey = wordKey(newWord);
  if (oldKey === newKey) {
    const progress = loadProgress();
    if (progress[oldKey]) {
      progress[oldKey].word = newWord.trim();
      saveProgress(progress);
    }
    return;
  }

  const progress = loadProgress();
  const oldEntry = progress[oldKey];
  if (!oldEntry) return;

  const newEntry = progress[newKey];
  if (newEntry) {
    newEntry.attempts = [...newEntry.attempts, ...oldEntry.attempts].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    if (!newEntry.lastDefinition && oldEntry.lastDefinition) {
      newEntry.lastDefinition = oldEntry.lastDefinition;
    }
    newEntry.word = newWord.trim();
  } else {
    progress[newKey] = { ...oldEntry, word: newWord.trim() };
  }

  delete progress[oldKey];
  saveProgress(progress);
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

export function pickTrackedWords(count: number): string[] {
  const progress = loadProgress();
  const tracked = Object.values(progress).filter((entry) => entry.attempts.length > 0);

  if (tracked.length === 0) return [];

  const weighted = tracked.map((entry) => {
    const lastScore = entry.attempts.at(-1)?.score ?? 0;
    return { word: entry.word, weight: Math.max(1, 100 - lastScore) };
  });

  return weightedPick(weighted, Math.min(count, tracked.length));
}
