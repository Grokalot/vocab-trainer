import type { Trend, WordProgress, WordTrend } from '../types';

const PROGRESS_KEY = 'vocab-trainer-progress';
const SETTINGS_KEY = 'vocab-trainer-settings';

export const TRACKED_DISPLAY_LIMIT = 10;
export interface AppSettings {
  openaiApiKey: string;
}

const defaultSettings: AppSettings = {
  openaiApiKey: '',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadProgress(): Record<string, WordProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, WordProgress>): void {
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

  existing.attempts.push({
    timestamp: Date.now(),
    score,
    userAnswer,
  });
  existing.lastDefinition = definition;
  progress[key] = existing;
  saveProgress(progress);
}

export function getWordTrends(): WordTrend[] {
  const progress = loadProgress();

  return Object.values(progress)
    .filter((entry) => entry.attempts.length > 0)
    .map((entry) => {
      const scores = entry.attempts.map((a) => a.score);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const recent = scores.slice(-3);
      const recentAverage = recent.reduce((a, b) => a + b, 0) / recent.length;

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
      };
    })
    .sort((a, b) => {
      if (a.trend === 'improving' && b.trend !== 'improving') return -1;
      if (b.trend === 'improving' && a.trend !== 'improving') return 1;
      return b.recentAverage - a.recentAverage;
    });
}

export function pickWords(allWords: string[], count: number): string[] {
  const progress = loadProgress();
  const weighted = allWords.map((word) => {
    const key = wordKey(word);
    const entry = progress[key];
    const lastScore = entry?.attempts.at(-1)?.score;
    const weight = lastScore === undefined ? 2 : Math.max(1, 100 - lastScore);
    return { word, weight };
  });

  return weightedPick(weighted, count);
}

export function getTrackedStats(): { count: number; overallAverage: number } {
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
  return progress[wordKey(word)]?.lastDefinition;
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

function weightedPick(pool: { word: string; weight: number }[], count: number): string[] {
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
