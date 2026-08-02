const MASK = '———';

const BAD_DEFINITION_PATTERNS = [
  /^\s*(?:an?\s+)?(?:archaic\s+)?variant\s+of\s+/i,
  /^\s*see\s+\S/i,
  /^\s*same\s+as\s+/i,
  /^\s*also\s+see\s+/i,
  /^\s*short\s+for\s+/i,
  /^\s*abbrev(?:iation)?\.?\s+of\s+/i,
  /^\s*alt(?:ernate)?\.?\s+spelling\s+of\s+/i,
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForCompare(word: string): string {
  return word.toLowerCase().replace(/['']/g, '').replace(/[^a-z]/g, '');
}

function areCognates(a: string, b: string): boolean {
  const left = normalizeForCompare(a);
  const right = normalizeForCompare(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const variants = [
    left.replace(/our/g, 'or'),
    left.replace(/or/g, 'our'),
    left.replace(/re/g, 'er'),
    left.replace(/er/g, 're'),
    left.replace(/ise/g, 'ize'),
    left.replace(/ize/g, 'ise'),
  ];

  return variants.some((candidate) => candidate === right);
}

function addSpellingVariants(form: string, target: Set<string>): void {
  const trimmed = form.trim();
  if (trimmed.length < 2) return;

  target.add(trimmed);

  if (trimmed.endsWith('our')) {
    target.add(trimmed.slice(0, -3) + 'or');
  }
  if (trimmed.endsWith('or')) {
    target.add(trimmed.slice(0, -2) + 'our');
  }
  if (trimmed.endsWith('re') && trimmed.length > 3) {
    target.add(trimmed.slice(0, -2) + 'er');
  }
  if (trimmed.endsWith('er') && trimmed.length > 3) {
    target.add(trimmed.slice(0, -2) + 're');
  }
  if (trimmed.endsWith('ise')) {
    target.add(trimmed.slice(0, -3) + 'ize');
  }
  if (trimmed.endsWith('ize')) {
    target.add(trimmed.slice(0, -3) + 'ise');
  }
}

/** Forms of the headword to mask, longest first to avoid partial replacements. */
export function wordMaskForms(word: string): string[] {
  const forms = new Set<string>();
  const base = word.trim();
  if (!base) return [];

  const seeds = [base, ...base.split(/\s+/).filter(Boolean)];

  for (const seed of seeds) {
    addSpellingVariants(seed, forms);
    addSpellingVariants(seed.toLowerCase(), forms);
  }

  const withInflections = new Set<string>();
  for (const form of forms) {
    withInflections.add(form);
    if (!form.endsWith('s')) {
      withInflections.add(`${form}s`);
      withInflections.add(`${form}es`);
    }
    withInflections.add(`${form}'s`);
    withInflections.add(`${form}'s`);
  }

  return [...withInflections].sort((a, b) => b.length - a.length);
}

export function maskWordInDefinition(word: string, definition: string): string {
  let result = definition;

  for (const form of wordMaskForms(word)) {
    const pattern = new RegExp(`\\b${escapeRegex(form)}\\b`, 'gi');
    result = result.replace(pattern, MASK);
  }

  return result.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

function isVariantOfCognate(word: string, definition: string): boolean {
  const match = definition
    .trim()
    .match(/^\s*(?:an?\s+)?(?:archaic\s+)?variant\s+of\s+([^.]+)/i);
  if (!match) return false;
  const target = match[1].trim().replace(/[.,;:!?]+$/, '');
  return areCognates(word, target);
}

function hasInsufficientContentAfterMask(word: string, definition: string): boolean {
  const masked = maskWordInDefinition(word, definition);
  const lettersOnly = masked.replaceAll(MASK, '').replace(/[^a-zA-Z]/g, '');
  return lettersOnly.length < 8;
}

/** True when a definition should not be used as a word-recall prompt. */
export function isBadWordRecallDefinition(word: string, definition: string): boolean {
  const trimmed = definition.trim();
  if (!trimmed) return true;

  if (BAD_DEFINITION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (isVariantOfCognate(word, trimmed)) {
    return true;
  }

  if (hasInsufficientContentAfterMask(word, trimmed)) {
    return true;
  }

  return false;
}

/** Masked prompt for word-recall UI, or null if the definition is unusable. */
export function prepareWordRecallPrompt(word: string, definition: string): string | null {
  if (isBadWordRecallDefinition(word, definition)) {
    return null;
  }
  return maskWordInDefinition(word, definition);
}
