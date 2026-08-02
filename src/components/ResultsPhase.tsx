import type { SessionWord } from '../types';

interface ResultsPhaseProps {
  average: number;
  words: SessionWord[];
  onHome: () => void;
}

export default function ResultsPhase({ average, words, onHome }: ResultsPhaseProps) {
  return (
    <div className="results-block">
      <div className="results-summary">
        <p>Average</p>
        <div className="big-score">{average}%</div>
      </div>

      {words.map((entry) => (
        <article key={entry.word} className="result-item">
          <div className="result-header">
            <h2 className="result-word">{entry.word}</h2>
            {entry.review && (
              <span className="score-mark">{entry.review.score}%</span>
            )}
          </div>
          <p>
            <strong>You</strong> — {entry.userAnswer}
          </p>
          <p>
            <strong>Answer</strong> — {entry.definition}
          </p>
          {entry.review && <p>{entry.review.feedback}</p>}
        </article>
      ))}

      <button onClick={onHome}>New session</button>
    </div>
  );
}
