import { migrateWordProgress, wordKey } from './storage';
import type { WordList } from '../types';

const WORD_LIST_KEY = 'vocab-trainer-word-list';

export function getStoredWordList(): WordList | null {
  try {
    const raw = localStorage.getItem(WORD_LIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    return { words: parsed.filter(Boolean) };
  } catch {
    return null;
  }
}

export function saveStoredWordList(wordList: WordList): void {
  localStorage.setItem(WORD_LIST_KEY, JSON.stringify(wordList.words));
}

async function loadSeedWordList(): Promise<WordList> {
  const response = await fetch('/words.txt');
  if (!response.ok) {
    throw new Error('Failed to load word list');
  }
  const text = await response.text();
  const words = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return { words };
}

export async function loadWordList(): Promise<WordList> {
  const stored = getStoredWordList();
  if (stored) return stored;

  const seed = await loadSeedWordList();
  saveStoredWordList(seed);
  return seed;
}

export function addWord(wordList: WordList, word: string): WordList {
  const trimmed = word.trim();
  if (!trimmed) {
    throw new Error('Enter a word.');
  }
  if (wordList.words.some((existing) => wordKey(existing) === wordKey(trimmed))) {
    throw new Error(`"${trimmed}" is already in your list.`);
  }

  const updated: WordList = { words: [...wordList.words, trimmed] };
  saveStoredWordList(updated);
  return updated;
}

export function renameWord(wordList: WordList, oldWord: string, newWord: string): WordList {
  const trimmed = newWord.trim();
  if (!trimmed) {
    throw new Error('Enter a word.');
  }

  const oldIndex = wordList.words.findIndex((w) => w === oldWord);
  if (oldIndex === -1) {
    throw new Error('Word not found.');
  }

  const duplicate = wordList.words.some(
    (w, index) => index !== oldIndex && wordKey(w) === wordKey(trimmed),
  );
  if (duplicate) {
    throw new Error(`"${trimmed}" is already in your list.`);
  }

  const updated: WordList = {
    words: wordList.words.map((w) => (w === oldWord ? trimmed : w)),
  };
  saveStoredWordList(updated);
  migrateWordProgress(oldWord, trimmed);
  return updated;
}

export function filterWords(wordList: WordList, query: string, limit = 50): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return wordList.words.slice(0, limit);

  return wordList.words
    .filter((word) => word.toLowerCase().includes(normalized))
    .slice(0, limit);
}
