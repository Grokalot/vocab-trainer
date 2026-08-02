import { prepareWordRecallPrompt } from '../lib/wordRecallPrompt';
import type { SessionWord } from '../types';
import AutoFitWord from './AutoFitWord';

interface ResultsPhaseProps {
  average: number;
  words: SessionWord[];
  variant: 'definition' | 'word';
  onHome: () => void;
}

export default function ResultsPhase({ average, words, variant, onHome }: ResultsPhaseProps) {
  const isWordRecall = variant === 'word';

  return (
    <div className="results-block">
      <div className="results-summary">
        <p>{isWordRecall ? 'Word recall average' : 'Average'}</p>
        <div className="big-score">{average}%</div>
      </div>

      {words.map((entry) => {
        const wordRecallPrompt =
          isWordRecall ? prepareWordRecallPrompt(entry.word, entry.definition) : null;

        return (
        <article key={entry.word} className="result-item">
          {isWordRecall ? (
            <>
              <div className="result-header">
                <p className="word-recall-result-def">
                  {wordRecallPrompt ?? entry.definition}
                </p>
                {entry.review && (
                  <span className="score-mark">{entry.review.score}%</span>
                )}
              </div>
              <p>
                <strong>You</strong> — {entry.userAnswer}
              </p>
              <p>
                <strong>Answer</strong> — {entry.word}
              </p>
            </>
          ) : (
            <>
              <div className="result-header">
                <AutoFitWord word={entry.word} className="result-word" maxRem={1.1} minRem={0.6} />
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
            </>
          )}
          {entry.review && <p>{entry.review.feedback}</p>}
        </article>
        );
      })}

      <button onClick={onHome}>New session</button>
    </div>
  );
}
