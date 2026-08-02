import { wordKey } from './storage';

const BROWSER_PROXY_PREFIX = '/api/dictionary';
const DICTIONARY_ORIGIN = 'https://www.dictionary.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let bundledDefinitions: Record<string, string> | null = null;

export function toDictionarySlug(word: string): string {
  return word
    .split(/[/:]/)[0]
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function parseDictionaryComHtml(html: string): string[] {
  const definitions: string[] = [];

  const blockRegex = /<p class="txt-variant-label-short">\s*([\s\S]*?)\s*<\/p>/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) definitions.push(text);
  }

  if (definitions.length > 0) return definitions;

  const metaMatch = html.match(
    /name="description"\s+content='[^']*definition:\s*(.+?)\.\s*See examples/i,
  );
  if (metaMatch?.[1]) {
    definitions.push(metaMatch[1].trim());
  }

  return definitions;
}

export function pickPrimaryDefinition(definitions: string[]): string | undefined {
  if (definitions.length === 0) return undefined;
  return definitions[0];
}

function buildLookupUrls(word: string): string[] {
  const slug = toDictionarySlug(word);
  const firstWord = toDictionarySlug(word.split(/\s+/)[0]);
  const urls = [`${DICTIONARY_ORIGIN}/browse/${slug}`];
  if (firstWord !== slug) {
    urls.push(`${DICTIONARY_ORIGIN}/browse/${firstWord}`);
  }
  return [...new Set(urls)];
}

async function fetchHtml(url: string): Promise<string | null> {
  const isBrowser = typeof window !== 'undefined';
  const fetchUrl = isBrowser
    ? `${BROWSER_PROXY_PREFIX}${url.replace(DICTIONARY_ORIGIN, '')}`
    : url;

  try {
    const response = await fetch(fetchUrl, {
      headers: isBrowser ? undefined : { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function fetchDictionaryComDefinition(word: string): Promise<string | undefined> {
  for (const url of buildLookupUrls(word)) {
    const html = await fetchHtml(url);
    if (!html) continue;

    const definitions = parseDictionaryComHtml(html);
    const picked = pickPrimaryDefinition(definitions);
    if (picked) return picked;
  }

  return undefined;
}

export async function loadBundledDefinitions(): Promise<Record<string, string>> {
  if (bundledDefinitions) return bundledDefinitions;

  try {
    const response = await fetch('/definitions.json');
    if (response.ok) {
      bundledDefinitions = (await response.json()) as Record<string, string>;
      return bundledDefinitions;
    }
  } catch {
    // bundled file optional until refresh script runs
  }

  bundledDefinitions = {};
  return bundledDefinitions;
}

export function getBundledDefinition(word: string): string | undefined {
  return bundledDefinitions?.[wordKey(word)];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RefreshProgress {
  done: number;
  total: number;
  word: string;
  updated: number;
  skipped: number;
  missed: number;
}

export async function refreshDefinitionsForWords(
  words: string[],
  options: {
    respectCustom?: boolean;
    isCustomDefinition?: (word: string) => boolean;
    onProgress?: (progress: RefreshProgress) => void;
    applyDefinition: (word: string, definition: string) => void;
    delayMs?: number;
  },
): Promise<{ updated: number; skipped: number; missed: string[] }> {
  const {
    respectCustom = true,
    isCustomDefinition,
    onProgress,
    applyDefinition,
    delayMs = 350,
  } = options;

  let updated = 0;
  let skipped = 0;
  const missed: string[] = [];

  for (let index = 0; index < words.length; index++) {
    const word = words[index];

    if (respectCustom && isCustomDefinition?.(word)) {
      skipped++;
      onProgress?.({
        done: index + 1,
        total: words.length,
        word,
        updated,
        skipped,
        missed: missed.length,
      });
      continue;
    }

    const definition = await fetchDictionaryComDefinition(word);
    if (definition) {
      applyDefinition(word, definition);
      updated++;
    } else {
      missed.push(word);
    }

    onProgress?.({
      done: index + 1,
      total: words.length,
      word,
      updated,
      skipped,
      missed: missed.length,
    });

    if (index < words.length - 1) {
      await delay(delayMs);
    }
  }

  return { updated, skipped, missed };
}
