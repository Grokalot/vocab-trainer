import { loadProgress, wordKey } from './storage';
import { resolveStoredDefinition } from './definitions';
import { isBadWordRecallDefinition } from './wordRecallPrompt';

const CUSTOM_WORD_LIST_KEY = 'vocab-trainer-custom-word-list';

export function loadCustomWordList(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_WORD_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function saveCustomWordList(words: string[]): void {
  localStorage.setItem(CUSTOM_WORD_LIST_KEY, JSON.stringify(words));
}

export function isInCustomWordList(word: string): boolean {
  const key = wordKey(word);
  return loadCustomWordList().some((item) => wordKey(item) === key);
}

export function addToCustomWordList(word: string): void {
  const trimmed = word.trim();
  if (!trimmed) return;

  const key = wordKey(trimmed);
  const current = loadCustomWordList();
  if (current.some((item) => wordKey(item) === key)) return;

  saveCustomWordList([...current, trimmed]);
}

export function removeFromCustomWordList(word: string): void {
  const key = wordKey(word);
  saveCustomWordList(loadCustomWordList().filter((item) => wordKey(item) !== key));
}

export function clearCustomWordList(): void {
  saveCustomWordList([]);
}

export function migrateCustomWordListRename(oldWord: string, newWord: string): void {
  const oldKey = wordKey(oldWord);
  const trimmed = newWord.trim();
  if (!trimmed) return;

  const current = loadCustomWordList();
  let changed = false;
  const next = current.map((item) => {
    if (wordKey(item) !== oldKey) return item;
    changed = true;
    return trimmed;
  });

  if (!changed) return;

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const item of next) {
    const key = wordKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  saveCustomWordList(deduped);
}

export function filterWordsToCustomPool(words: string[], customWords: string[]): string[] {
  if (customWords.length === 0) return [];
  const pool = new Set(customWords.map(wordKey));
  return words.filter((word) => pool.has(wordKey(word)));
}

export function getCustomEligibleCounts(customWords: string[]): {
  study: number;
  definitionTest: number;
  wordTest: number;
} {
  if (customWords.length === 0) {
    return { study: 0, definitionTest: 0, wordTest: 0 };
  }

  const pool = new Set(customWords.map(wordKey));
  const studied = Object.values(loadProgress()).filter(
    (entry) => entry.attempts.length > 0 && pool.has(wordKey(entry.word)),
  );

  const wordTest = studied.filter((entry) => {
    const definition = entry.lastDefinition || resolveStoredDefinition(entry.word) || '';
    return definition.length > 0 && !isBadWordRecallDefinition(entry.word, definition);
  }).length;

  return {
    study: studied.length,
    definitionTest: studied.length,
    wordTest,
  };
}
