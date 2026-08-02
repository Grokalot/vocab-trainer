import { migrateWordProgress, wordKey } from './storage';

const WORD_LIST_KEY = 'vocab-trainer-word-list';

export function getStoredWordList(): string[] | null {
  try {
    const raw = localStorage.getItem(WORD_LIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter(Boolean);
  } catch {
    return null;
  }
}

export function saveStoredWordList(words: string[]): void {
  localStorage.setItem(WORD_LIST_KEY, JSON.stringify(words));
}

async function loadSeedWordList(): Promise<string[]> {
  const response = await fetch('/words.txt');
  if (!response.ok) {
    throw new Error('Failed to load word list');
  }
  const text = await response.text();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function loadWordList(): Promise<string[]> {
  const stored = getStoredWordList();
  if (stored) return stored;

  const seed = await loadSeedWordList();
  saveStoredWordList(seed);
  return seed;
}

export function addWord(words: string[], word: string): string[] {
  const trimmed = word.trim();
  if (!trimmed) {
    throw new Error('Enter a word.');
  }
  if (words.some((existing) => wordKey(existing) === wordKey(trimmed))) {
    throw new Error(`"${trimmed}" is already in your list.`);
  }

  const updated = [...words, trimmed];
  saveStoredWordList(updated);
  return updated;
}

export function renameWord(words: string[], oldWord: string, newWord: string): string[] {
  const trimmed = newWord.trim();
  if (!trimmed) {
    throw new Error('Enter a word.');
  }

  const oldIndex = words.findIndex((w) => w === oldWord);
  if (oldIndex === -1) {
    throw new Error('Word not found.');
  }

  const duplicate = words.some(
    (w, index) => index !== oldIndex && wordKey(w) === wordKey(trimmed),
  );
  if (duplicate) {
    throw new Error(`"${trimmed}" is already in your list.`);
  }

  const updated = words.map((w) => (w === oldWord ? trimmed : w));
  saveStoredWordList(updated);
  migrateWordProgress(oldWord, trimmed);
  return updated;
}

export function filterWords(words: string[], query: string, limit = 50): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return words.slice(0, limit);

  return words.filter((word) => word.toLowerCase().includes(normalized)).slice(0, limit);
}
