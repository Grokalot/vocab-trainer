import { getBundledDefinition, loadBundledDefinitions } from './dictionaryCom';
import { getCachedDefinition, isCustomDefinition, saveDictionaryDefinition } from './storage';

export function resolveStoredDefinition(word: string): string | undefined {
  return getCachedDefinition(word) ?? getBundledDefinition(word);
}

export async function syncBundledDefinitions(words: string[]): Promise<number> {
  await loadBundledDefinitions();
  let updated = 0;

  for (const word of words) {
    if (isCustomDefinition(word)) continue;

    const bundled = getBundledDefinition(word);
    if (!bundled) continue;

    const cached = getCachedDefinition(word);
    if (cached === bundled) continue;

    saveDictionaryDefinition(word, bundled);
    updated++;
  }

  return updated;
}
