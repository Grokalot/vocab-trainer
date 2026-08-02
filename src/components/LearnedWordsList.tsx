import { useState } from 'react';
import type { WordStatistics } from '../types';

interface LearnedWordsListProps {
  words: WordStatistics[];
}

export default function LearnedWordsList({ words }: LearnedWordsListProps) {
  const [open, setOpen] = useState(false);

  if (words.length === 0) return null;

  return (
    <>
      {open && (
        <ul className="trend-list stats-word-list">
          {words.map((item) => (
            <li key={item.word} className="trend-item">
              <span>{item.word}</span>
              <span className="trend-meta">
                def {item.averageScore}% · {item.attemptCount}×
                {item.wordAttemptCount > 0 && (
                  <> · word {item.wordAverageScore}% · {item.wordAttemptCount}×</>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="ghost stats-view-words"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'Hide words' : 'View words'}
      </button>
    </>
  );
}
