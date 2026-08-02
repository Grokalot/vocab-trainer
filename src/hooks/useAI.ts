import { useCallback } from 'react';
import { fetchGptDefinition, loadWordEntries, scoreAttempt } from '../lib/ai';
import { refreshDefinitionsForWords } from '../lib/dictionaryCom';
import { isCustomDefinition, saveDictionaryDefinition } from '../lib/storage';
import type { RefreshProgress, ReviewResult, Word } from '../types';

export function useAI() {
  const loadSessionEntries = useCallback(
    (words: string[]): Promise<Word[]> => loadWordEntries(words),
    [],
  );

  const scoreAnswer = useCallback(
    (
      word: string,
      definition: string,
      answer: string,
    ): Promise<ReviewResult> => scoreAttempt(word, definition, answer),
    [],
  );

  const refreshDefinitions = useCallback(
    (words: string[], onProgress?: (progress: RefreshProgress) => void) =>
      refreshDefinitionsForWords(words, {
        isCustomDefinition,
        applyDefinition: saveDictionaryDefinition,
        onProgress,
      }),
    [],
  );

  const fetchDefinitionFromGpt = useCallback(
    (word: string): Promise<string> => fetchGptDefinition(word),
    [],
  );

  return {
    loadSessionEntries,
    scoreAnswer,
    refreshDefinitions,
    fetchDefinitionFromGpt,
  };
}
