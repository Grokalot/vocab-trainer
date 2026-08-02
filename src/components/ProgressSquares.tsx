import type { SessionWord } from '../types';

interface ProgressSquaresProps {
  words: SessionWord[];
  activeIndex: number;
  completedBefore: boolean;
}

export default function ProgressSquares({
  words,
  activeIndex,
  completedBefore,
}: ProgressSquaresProps) {
  return (
    <div className="progress-squares">
      {words.map((entry, index) => (
        <span
          key={entry.word}
          className={`square ${
            index === activeIndex
              ? 'active'
              : completedBefore && index < activeIndex
                ? 'visited'
                : ''
          }`}
        />
      ))}
    </div>
  );
}
