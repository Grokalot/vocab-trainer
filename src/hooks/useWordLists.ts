import { useCallback, useEffect, useState } from 'react';
import { syncBundledDefinitions } from '../lib/definitions';
import { addWord, loadWordList, renameWord } from '../lib/words';
import type { WordList } from '../types';

export function useWordLists() {
  const [wordList, setWordList] = useState<WordList>({ words: [] });
  const [newWordCount, setNewWordCount] = useState(5);
  const [trackedWordCount, setTrackedWordCount] = useState(5);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const loaded = await loadWordList();
        setWordList(loaded);
        await syncBundledDefinitions(loaded.words);
      } catch {
        setLoadError('Could not load word list.');
      }
    }

    init();
  }, []);

  const clampNewWordCount = useCallback(
    (value: number, maxNew: number) =>
      Math.max(1, Math.min(maxNew || 20, value)),
    [],
  );

  const clampTrackedWordCount = useCallback(
    (value: number, maxTracked: number) =>
      Math.max(1, Math.min(maxTracked || 20, value)),
    [],
  );

  const replaceWordList = useCallback((next: WordList) => {
    setWordList(next);
    setNewWordCount((current) =>
      Math.min(current, Math.max(1, next.words.length)),
    );
  }, []);

  const addWordToList = useCallback(
    (word: string) => {
      const updated = addWord(wordList, word);
      replaceWordList(updated);
      return updated;
    },
    [wordList, replaceWordList],
  );

  const renameWordInList = useCallback(
    (oldWord: string, newWord: string) => {
      const updated = renameWord(wordList, oldWord, newWord);
      replaceWordList(updated);
      return updated;
    },
    [wordList, replaceWordList],
  );

  return {
    wordList,
    words: wordList.words,
    newWordCount,
    setNewWordCount,
    trackedWordCount,
    setTrackedWordCount,
    isManagerOpen,
    setIsManagerOpen,
    loadError,
    clampNewWordCount,
    clampTrackedWordCount,
    replaceWordList,
    addWordToList,
    renameWordInList,
  };
}
