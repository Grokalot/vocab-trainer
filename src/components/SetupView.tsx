import type { OverviewStats, SessionStartMode, WordStatistics } from '../types';
import BrainProgress from './BrainProgress';
import LearnedWordsList from './LearnedWordsList';

interface SetupViewProps {
  hasApiKey: boolean;
  wordCount: number;
  maxNewWords: number;
  untestedCount: number;
  totalWords: number;
  onWordCountChange: (value: number) => void;
  onStartNew: () => void;
  improvingWords: WordStatistics[];
  learnedWords: WordStatistics[];
  overview: OverviewStats;
  hasStudiedWords: boolean;
  trackedWordCount: number;
  maxTrackedWords: number;
  maxRetentionWords: number;
  onTrackedWordCountChange: (value: number) => void;
  onStartTracked: (mode: Extract<SessionStartMode, 'tracked-study' | 'tracked-test'>) => void;
}

export default function SetupView({
  hasApiKey,
  wordCount,
  maxNewWords,
  untestedCount,
  totalWords,
  onWordCountChange,
  onStartNew,
  improvingWords,
  learnedWords,
  overview,
  hasStudiedWords,
  trackedWordCount,
  maxTrackedWords,
  maxRetentionWords,
  onTrackedWordCountChange,
  onStartTracked,
}: SetupViewProps) {
  const canStartNew = untestedCount > 0 && hasApiKey;

  return (
    <>
      {totalWords > 0 && (
        <BrainProgress learned={overview.wordsLearned} total={totalWords} />
      )}

      <div className="panel setup-form">
        <label>
          New · words per session
          <input
            type="number"
            min={1}
            max={maxNewWords || 1}
            value={wordCount}
            disabled={untestedCount === 0}
            onChange={(e) => onWordCountChange(Number(e.target.value))}
          />
          <span className="hint">
            {totalWords > 0
              ? `${untestedCount} untested · ${totalWords} total`
              : 'Loading word list…'}
          </span>
        </label>
        <button onClick={onStartNew} disabled={!canStartNew}>
          Start new
        </button>
        {!hasApiKey && (
          <p className="hint">Add your OpenAI API key in Settings to begin.</p>
        )}
        {hasApiKey && untestedCount === 0 && totalWords > 0 && (
          <p className="hint">All words tested. Use tracked mode to review.</p>
        )}
      </div>

      <div className="spacer-section stats-panel">
        <dl className="stats-list">
          <div className="stats-row">
            <dt>Total sessions</dt>
            <dd>{overview.totalSessions}</dd>
          </div>
          <div className="stats-row stats-sub">
            <dt>New</dt>
            <dd>{overview.sessionsNew}</dd>
          </div>
          <div className="stats-row stats-sub">
            <dt>Tracked study</dt>
            <dd>{overview.sessionsTrackedStudy}</dd>
          </div>
          <div className="stats-row stats-sub">
            <dt>Tracked test</dt>
            <dd>{overview.sessionsTrackedTest}</dd>
          </div>
          <div className="stats-row">
            <dt>Words learned</dt>
            <dd>{overview.wordsLearned}</dd>
          </div>
          <div className="stats-row">
            <dt>Total average</dt>
            <dd>{overview.totalAverage}%</dd>
          </div>
        </dl>
        <LearnedWordsList words={learnedWords} />
      </div>

      {improvingWords.length > 0 && (
        <div className="spacer-section">
          <h2 className="section-title">Improving</h2>
          <ul className="trend-list">
            {improvingWords.slice(0, 8).map((item) => (
              <li key={item.word} className="trend-item">
                <span>{item.word}</span>
                <span className="trend-meta">{item.recentAverage}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasStudiedWords && (
        <div className="spacer-section">
          <h2 className="section-title">Tracked</h2>
          <div className="tracked-controls setup-form">
            <label>
              Words per session
              <input
                type="number"
                min={1}
                max={maxTrackedWords || 20}
                value={trackedWordCount}
                onChange={(e) => onTrackedWordCountChange(Number(e.target.value))}
              />
              <span className="hint">
                Study · weaker recall words appear more often
              </span>
            </label>
            <div className="tracked-actions">
              <button onClick={() => onStartTracked('tracked-study')} disabled={!hasApiKey}>
                Tracked study
              </button>
              <button
                onClick={() => onStartTracked('tracked-test')}
                disabled={!hasApiKey || maxRetentionWords === 0}
              >
                Tracked test
              </button>
            </div>
            <span className="hint">
              Test · long-term retention, separate from study scores
            </span>
          </div>
        </div>
      )}
    </>
  );
}
