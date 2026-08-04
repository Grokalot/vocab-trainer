import { useMemo, useState } from 'react';
import { resolveStoredDefinition } from '../lib/definitions';
import { isCustomDefinition } from '../lib/storage';
import type { WordStatistics } from '../types';

interface LearnedWordsListProps {
  words: WordStatistics[];
  onAddToCustomList: (word: string) => void;
  onRemoveFromCustomList: (word: string) => void;
  isInCustomList: (word: string) => boolean;
}

type SortKey = 'def' | 'word';
type SortState = { key: SortKey; dir: 'asc' | 'desc' };

function formatStat(score: number, attempts: number): string {
  if (attempts <= 0) return '—';
  return `${score}% x${attempts}`;
}

function sortWords(items: WordStatistics[], sort: SortState): WordStatistics[] {
  const sorted = [...items];
  const direction = sort.dir === 'asc' ? 1 : -1;

  if (sort.key === 'def') {
    sorted.sort(
      (a, b) =>
        direction * (a.averageScore - b.averageScore) ||
        direction * (a.attemptCount - b.attemptCount) ||
        a.word.localeCompare(b.word),
    );
    return sorted;
  }

  sorted.sort(
    (a, b) =>
      direction * (a.wordAverageScore - b.wordAverageScore) ||
      direction * (a.wordAttemptCount - b.wordAttemptCount) ||
      a.word.localeCompare(b.word),
  );
  return sorted;
}

export default function LearnedWordsList({
  words,
  onAddToCustomList,
  onRemoveFromCustomList,
  isInCustomList,
}: LearnedWordsListProps) {
  const [open, setOpen] = useState(false);
  const [expandedWords, setExpandedWords] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<SortState | null>(null);

  const displayedWords = useMemo(
    () => (sort ? sortWords(words, sort) : words),
    [words, sort],
  );

  if (words.length === 0) return null;

  function toggleList() {
    setOpen((current) => {
      if (current) {
        setExpandedWords(new Set());
        setSort(null);
      }
      return !current;
    });
  }

  function toggleWord(word: string) {
    setExpandedWords((current) => {
      const next = new Set(current);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key !== key) {
        return { key, dir: 'asc' };
      }
      if (current.dir === 'asc') {
        return { key, dir: 'desc' };
      }
      return null;
    });
  }

  function sortIndicator(key: SortKey): string {
    if (sort?.key !== key) return '';
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  }

  return (
    <>
      {open && (
        <div className="stats-word-list-wrap">
          <div className="stats-word-grid stats-word-header" role="row">
            <span className="stats-word-header-label">Word</span>
            <button
              type="button"
              className="stats-word-sort"
              onClick={() => toggleSort('def')}
              aria-pressed={sort?.key === 'def'}
            >
              Def{sortIndicator('def')}
            </button>
            <button
              type="button"
              className="stats-word-sort"
              onClick={() => toggleSort('word')}
              aria-pressed={sort?.key === 'word'}
            >
              Word{sortIndicator('word')}
            </button>
            <span className="stats-word-header-label stats-word-header-action">List</span>
          </div>
          <ul className="trend-list stats-word-list">
            {displayedWords.map((item) => {
              const definition = resolveStoredDefinition(item.word);
              const isExpanded = expandedWords.has(item.word);
              const isCustom = isCustomDefinition(item.word);
              const inCustomList = isInCustomList(item.word);

              return (
                <li key={item.word} className="trend-item stats-word-item">
                  <div className="stats-word-grid stats-word-row">
                    <button
                      type="button"
                      className="stats-word-toggle"
                      onClick={() => toggleWord(item.word)}
                      aria-expanded={isExpanded}
                    >
                      {item.word}
                    </button>
                    <span className="stats-word-stat">
                      {formatStat(item.averageScore, item.attemptCount)}
                    </span>
                    <span className="stats-word-stat">
                      {formatStat(item.wordAverageScore, item.wordAttemptCount)}
                    </span>
                    <div className="stats-word-list-actions">
                      {inCustomList ? (
                        <button
                          type="button"
                          className="stats-word-list-btn stats-word-list-btn-remove"
                          onClick={() => onRemoveFromCustomList(item.word)}
                          aria-label={`Remove ${item.word} from custom list`}
                          title="Remove from custom list"
                        >
                          −
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="stats-word-list-btn stats-word-list-btn-add"
                          onClick={() => onAddToCustomList(item.word)}
                          aria-label={`Add ${item.word} to custom list`}
                          title="Add to custom list"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && definition && (
                    <p className="stored-definition">
                      {isCustom && <span className="custom-tag">Custom · </span>}
                      {definition}
                    </p>
                  )}
                  {isExpanded && !definition && (
                    <p className="stored-definition">No definition stored.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <button type="button" className="ghost stats-view-words" onClick={toggleList}>
        {open ? 'Hide words' : 'View words'}
      </button>
    </>
  );
}
