import type { SessionStartMode, TrackedStats, WordStatistics } from '../types';

interface SetupViewProps {
  hasApiKey: boolean;
  wordCount: number;
  maxNewWords: number;
  untestedCount: number;
  totalWords: number;
  onWordCountChange: (value: number) => void;
  onStartNew: () => void;
  improvingWords: WordStatistics[];
  trackedStats: TrackedStats;
  displayedTrends: WordStatistics[];
  trackedOverflow: number;
  trackedWordCount: number;
  maxTrackedWords: number;
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
  trackedStats,
  displayedTrends,
  trackedOverflow,
  trackedWordCount,
  maxTrackedWords,
  onTrackedWordCountChange,
  onStartTracked,
}: SetupViewProps) {
  const canStartNew = untestedCount > 0 && hasApiKey;

  return (
    <>
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

      {displayedTrends.length > 0 && (
        <div className="spacer-section">
          <div className="section-header">
            <h2 className="section-title">Tracked</h2>
            <span className="section-stats">
              {trackedStats.count} words · {trackedStats.overallAverage}% avg
            </span>
          </div>
          <ul className="trend-list capped">
            {displayedTrends.map((item) => (
              <li key={item.word} className="trend-item">
                <span>{item.word}</span>
                <span className="trend-meta">
                  {item.averageScore}% · {item.attemptCount}×
                </span>
              </li>
            ))}
          </ul>
          {trackedOverflow > 0 && (
            <p className="hint overflow-hint">+{trackedOverflow} more not shown</p>
          )}
          <div className="tracked-controls setup-form">
            <label>
              Tracked · words per session
              <input
                type="number"
                min={1}
                max={maxTrackedWords || 20}
                value={trackedWordCount}
                onChange={(e) => onTrackedWordCountChange(Number(e.target.value))}
              />
              <span className="hint">Weaker tracked words appear more often</span>
            </label>
            <div className="tracked-actions">
              <button onClick={() => onStartTracked('tracked-study')} disabled={!hasApiKey}>
                Tracked study
              </button>
              <button onClick={() => onStartTracked('tracked-test')} disabled={!hasApiKey}>
                Tracked test
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
