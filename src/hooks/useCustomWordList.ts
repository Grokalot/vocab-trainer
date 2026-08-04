import { useCallback, useState } from 'react';
import {
  addToCustomWordList,
  clearCustomWordList,
  isInCustomWordList,
  loadCustomWordList,
  removeFromCustomWordList,
} from '../lib/customWordList';

export function useCustomWordList() {
  const [customWords, setCustomWords] = useState<string[]>(() => loadCustomWordList());

  const refresh = useCallback(() => {
    setCustomWords(loadCustomWordList());
  }, []);

  const add = useCallback(
    (word: string) => {
      addToCustomWordList(word);
      refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    (word: string) => {
      removeFromCustomWordList(word);
      refresh();
    },
    [refresh],
  );

  const clear = useCallback(() => {
    clearCustomWordList();
    refresh();
  }, [refresh]);

  const has = useCallback(
    (word: string) => isInCustomWordList(word),
    [customWords],
  );

  return {
    customWords,
    customCount: customWords.length,
    add,
    remove,
    clear,
    has,
    refresh,
  };
}
