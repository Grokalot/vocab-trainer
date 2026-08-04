import { useMemo, useState } from 'react';
import type { OverviewStats, SessionStartMode, TrackedWordSource, WordStatistics } from '../types';
import { getCustomEligibleCounts } from '../lib/customWordList';
import BrainProgress from './BrainProgress';
import StatsPanel from './StatsPanel';

type TrackedStartMode = Extract<
  SessionStartMode,
  'tracked-study' | 'tracked-test' | 'tracked-test-word'
>;

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
  maxWordRecallWords: number;
  onTrackedWordCountChange: (value: number) => void;
  onStartTracked: (mode: TrackedStartMode, wordSource: TrackedWordSource) => void;
  customWords: string[];
  customCount: number;
  onAddToCustomList: (word: string) => void;
  onRemoveFromCustomList: (word: string) => void;
  isInCustomList: (word: string) => boolean;
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
  maxWordRecallWords,
  onTrackedWordCountChange,
  onStartTracked,
  customWords,
  customCount,
  onAddToCustomList,
  onRemoveFromCustomList,
  isInCustomList,
}: SetupViewProps) {
  const canStartNew = untestedCount > 0 && hasApiKey;
  const [testPickerOpen, setTestPickerOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<TrackedStartMode | null>(null);
  const canStartDefinitionTest = hasApiKey && maxRetentionWords > 0;
  const canStartWordTest = hasApiKey && maxWordRecallWords > 0;
  const canOpenTestPicker = canStartDefinitionTest || canStartWordTest;

  const customEligible = useMemo(
    () => getCustomEligibleCounts(customWords),
    [customWords],
  );

  function customEligibleForMode(mode: TrackedStartMode): number {
    if (mode === 'tracked-study') return customEligible.study;
    if (mode === 'tracked-test') return customEligible.definitionTest;
    return customEligible.wordTest;
  }

  function requestTrackedStart(mode: TrackedStartMode) {
    setTestPickerOpen(false);
    setPendingMode(mode);
  }

  function cancelSourcePicker() {
    setPendingMode(null);
  }

  function confirmSource(source: TrackedWordSource) {
    if (!pendingMode) return;
    onStartTracked(pendingMode, source);
    setPendingMode(null);
  }

  function startTest(mode: Extract<SessionStartMode, 'tracked-test' | 'tracked-test-word'>) {
    requestTrackedStart(mode);
  }

  const pendingCustomEligible = pendingMode ? customEligibleForMode(pendingMode) : 0;

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

      <details className="stats-collapsible spacer-section">
        <summary>Stats</summary>
        <StatsPanel
          overview={overview}
          learnedWords={learnedWords}
          customCount={customCount}
          onAddToCustomList={onAddToCustomList}
          onRemoveFromCustomList={onRemoveFromCustomList}
          isInCustomList={isInCustomList}
        />
      </details>

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
              <button
                onClick={() => requestTrackedStart('tracked-study')}
                disabled={!hasApiKey}
              >
                Tracked study
              </button>
              <button
                onClick={() => setTestPickerOpen((open) => !open)}
                disabled={!canOpenTestPicker}
              >
                Tracked test
              </button>
            </div>
            {testPickerOpen && (
              <div className="test-type-picker">
                <button
                  type="button"
                  onClick={() => startTest('tracked-test')}
                  disabled={!canStartDefinitionTest}
                >
                  Definition test
                </button>
                <button
                  type="button"
                  onClick={() => startTest('tracked-test-word')}
                  disabled={!canStartWordTest}
                >
                  Word test
                </button>
              </div>
            )}
            {pendingMode && (
              <div className="test-type-picker word-source-picker">
                <span className="hint word-source-label">
                  {pendingMode === 'tracked-study'
                    ? 'Tracked study'
                    : pendingMode === 'tracked-test'
                      ? 'Definition test'
                      : 'Word test'}
                  {' · '}choose word list
                </span>
                <button type="button" onClick={() => confirmSource('random')}>
                  Random
                </button>
                <button
                  type="button"
                  onClick={() => confirmSource('custom')}
                  disabled={pendingCustomEligible === 0}
                >
                  Custom
                  {customCount > 0 ? ` · ${pendingCustomEligible} eligible` : ''}
                </button>
                <button type="button" className="ghost" onClick={cancelSourcePicker}>
                  Cancel
                </button>
              </div>
            )}
            <span className="hint">
              Test · long-term retention, separate from study scores
              {customCount > 0 && ` · Custom list · ${customCount} word${customCount === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
