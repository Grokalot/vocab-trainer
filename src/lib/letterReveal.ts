const FIRST_LETTER_PENALTY = 0.2;
const REMAINING_PENALTY_BUDGET = 0.8;

export type LetterTile =
  | { kind: 'letter'; char: string; index: number }
  | { kind: 'punctuation'; char: string };

export interface WordLetterLayout {
  groups: LetterTile[][];
  letterCount: number;
}

function isLetter(char: string): boolean {
  return /\p{L}/u.test(char);
}

/** Split a headword into letter groups (by spaces) with punctuation tiles. */
export function parseWordLetterLayout(word: string): WordLetterLayout {
  const groups: LetterTile[][] = [];
  let letterCount = 0;
  let letterIndex = 0;

  for (const segment of word.trim().split(/\s+/)) {
    if (!segment) continue;

    const tiles: LetterTile[] = [];
    for (const char of segment) {
      if (isLetter(char)) {
        tiles.push({ kind: 'letter', char, index: letterIndex });
        letterIndex += 1;
        letterCount += 1;
      } else {
        tiles.push({ kind: 'punctuation', char });
      }
    }

    if (tiles.length > 0) {
      groups.push(tiles);
    }
  }

  return { groups, letterCount };
}

/** Option A: flat 20% for first letter, then 80/(L−1) per additional letter. */
export function letterRevealPenalty(revealedCount: number, letterCount: number): number {
  if (revealedCount <= 0 || letterCount <= 0) return 0;
  if (revealedCount === 1 || letterCount === 1) return FIRST_LETTER_PENALTY;

  const extraLetters = revealedCount - 1;
  const perExtraLetter = REMAINING_PENALTY_BUDGET / (letterCount - 1);
  return Math.min(1, FIRST_LETTER_PENALTY + extraLetters * perExtraLetter);
}

export function letterRevealMaxScore(revealedCount: number, letterCount: number): number {
  return Math.round((1 - letterRevealPenalty(revealedCount, letterCount)) * 100);
}

export function applyLetterRevealCap(
  aiScore: number,
  revealedCount: number,
  letterCount: number,
): number {
  const multiplier = 1 - letterRevealPenalty(revealedCount, letterCount);
  return Math.max(0, Math.min(100, Math.round(aiScore * multiplier)));
}
