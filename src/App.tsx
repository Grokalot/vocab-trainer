import { useEffect, useState } from 'react';
import type { AppPhase, SessionWord } from './types';
import { loadWordList } from './lib/words';
import WordListManager from './components/WordListManager';
import { loadWordEntries, scoreAttempt } from './lib/ai';
import { syncBundledDefinitions } from './lib/definitions';
import {
  getTrackedStats,
  getWordTrends,
  loadSettings,
  pickTrackedWords,
  pickWords,
  recordAttempt,
  saveDefinition,
  saveSettings,
  TRACKED_DISPLAY_LIMIT,
} from './lib/storage';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [wordCount, setWordCount] = useState(5);
  const [allWords, setAllWords] = useState<string[]>([]);
  const [sessionWords, setSessionWords] = useState<SessionWord[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [trends, setTrends] = useState(getWordTrends());
  const [editingDefinition, setEditingDefinition] = useState(false);
  const [definitionDraft, setDefinitionDraft] = useState('');

  useEffect(() => {
    setEditingDefinition(false);
    setDefinitionDraft('');
  }, [studyIndex, testIndex, phase]);

  useEffect(() => {
    async function init() {
      try {
        const words = await loadWordList();
        setAllWords(words);
        await syncBundledDefinitions(words);
      } catch {
        setError('Could not load word list.');
      }
    }

    init();
    setApiKey(loadSettings().openaiApiKey);
  }, []);

  const maxWords = Math.min(allWords.length, 20);
  const trackedStats = getTrackedStats();
  const displayedTrends = trends.slice(0, TRACKED_DISPLAY_LIMIT);
  const trackedOverflow = trends.length - displayedTrends.length;

  async function startSession(mode: 'mixed' | 'tracked') {
    setError('');
    setLoading(true);
    setLoadingMessage('Selecting words and fetching definitions…');

    try {
      const selected =
        mode === 'tracked'
          ? pickTrackedWords(wordCount)
          : pickWords(allWords, wordCount);

      if (selected.length === 0) {
        setError(
          mode === 'tracked'
            ? 'No tracked words yet. Complete a mixed session first.'
            : 'No words available.',
        );
        return;
      }

      const entries = await loadWordEntries(selected);
      setSessionWords(entries);
      setStudyIndex(0);
      setTestIndex(0);
      setPhase('study');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }

  function beginTest() {
    setTestIndex(0);
    setPhase('test');
  }

  async function submitAnswer() {
    const current = sessionWords[testIndex];
    const answer = current.userAnswer?.trim();
    if (!answer) return;

    setError('');
    setLoading(true);
    setLoadingMessage(`Scoring "${current.word}"…`);

    try {
      const result = await scoreAttempt(current.word, current.definition, answer);
      recordAttempt(current.word, current.definition, answer, result.score);

      setSessionWords((prev) =>
        prev.map((item, index) =>
          index === testIndex ? { ...item, scoreResult: result } : item,
        ),
      );

      if (testIndex < sessionWords.length - 1) {
        setTestIndex((i) => i + 1);
      } else {
        setTrends(getWordTrends());
        setPhase('results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scoring failed.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }

  function updateAnswer(value: string) {
    setSessionWords((prev) =>
      prev.map((item, index) =>
        index === testIndex ? { ...item, userAnswer: value } : item,
      ),
    );
  }

  function saveApiKey() {
    saveSettings({ openaiApiKey: apiKey.trim() });
  }

  function refreshProgress() {
    setTrends(getWordTrends());
  }

  function handleWordsChange(words: string[]) {
    setAllWords(words);
    setWordCount((current) => Math.min(current, Math.max(1, words.length)));
  }

  function cancelDefinitionEdit() {
    setEditingDefinition(false);
    setDefinitionDraft('');
  }

  function startDefinitionEdit() {
    const index = phase === 'study' ? studyIndex : testIndex;
    setDefinitionDraft(sessionWords[index].definition);
    setEditingDefinition(true);
  }

  function saveSessionDefinition() {
    const index = phase === 'study' ? studyIndex : testIndex;
    const word = sessionWords[index].word;

    try {
      saveDefinition(word, definitionDraft);
      setSessionWords((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, definition: definitionDraft.trim() } : item,
        ),
      );
      cancelDefinitionEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save definition.');
    }
  }

  function resetToSetup() {
    cancelDefinitionEdit();
    setPhase('setup');
    setSessionWords([]);
    setTrends(getWordTrends());
  }

  const sessionAverage =
    sessionWords.length > 0
      ? Math.round(
          sessionWords.reduce((sum, w) => sum + (w.scoreResult?.score ?? 0), 0) /
            sessionWords.length,
        )
      : 0;

  const improvingWords = trends.filter((t) => t.trend === 'improving');

  function ProgressSquares({ activeIndex, completedBefore }: { activeIndex: number; completedBefore: boolean }) {
    return (
      <div className="progress-squares">
        {sessionWords.map((entry, index) => (
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

  return (
    <div className="app">
      <header>
        <h1>Vocab</h1>
        <p>Study · Recall · Improve</p>
      </header>

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="loading">
          <p>{loadingMessage || 'Loading…'}</p>
        </div>
      )}

      {!loading && phase === 'setup' && (
        <>
          <div className="panel setup-form">
            <label>
              Words per session
              <input
                type="number"
                min={1}
                max={maxWords || 20}
                value={wordCount}
                onChange={(e) =>
                  setWordCount(Math.max(1, Math.min(maxWords || 20, Number(e.target.value))))
                }
              />
              <span className="hint">
                {allWords.length > 0
                  ? `${allWords.length} words · mix of new and weaker words`
                  : 'Loading word list…'}
              </span>
            </label>
            <button onClick={() => startSession('mixed')} disabled={!allWords.length || !apiKey.trim()}>
              Start mixed
            </button>
            {!apiKey.trim() && (
              <p className="hint">Add your OpenAI API key in Settings to begin.</p>
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

          {trends.length > 0 && (
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
                <p className="hint overflow-hint">
                  +{trackedOverflow} more not shown
                </p>
              )}
              <button
                className="tracked-start"
                onClick={() => startSession('tracked')}
                disabled={!apiKey.trim()}
              >
                Start tracked
              </button>
            </div>
          )}
        </>
      )}

      {!loading && phase === 'study' && sessionWords.length > 0 && (
        <div className="phase-center">
          <p className="phase-label">
            Study · {studyIndex + 1} / {sessionWords.length}
          </p>

          <article className="center-tile">
            <div className="tile-header">
              <h2 className="tile-word">{sessionWords[studyIndex].word}</h2>
              {!editingDefinition && (
                <button
                  type="button"
                  className="compact ghost"
                  onClick={startDefinitionEdit}
                >
                  Def
                </button>
              )}
            </div>
            {editingDefinition ? (
              <div className="definition-editor">
                <textarea
                  value={definitionDraft}
                  onChange={(e) => setDefinitionDraft(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="inline-form">
                  <button type="button" className="compact" onClick={saveSessionDefinition}>
                    Save
                  </button>
                  <button type="button" className="compact ghost" onClick={cancelDefinitionEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="tile-definition">{sessionWords[studyIndex].definition}</p>
            )}
          </article>

          <ProgressSquares activeIndex={studyIndex} completedBefore={false} />

          <div className="nav-row">
            <button
              className="ghost"
              disabled={studyIndex === 0}
              onClick={() => setStudyIndex((i) => i - 1)}
              aria-label="Previous word"
            >
              ←
            </button>
            {studyIndex < sessionWords.length - 1 ? (
              <button onClick={() => setStudyIndex((i) => i + 1)}>Next</button>
            ) : (
              <button onClick={beginTest}>Ready</button>
            )}
          </div>
          <button type="button" className="ghost home-button" onClick={resetToSetup}>
            Home
          </button>
        </div>
      )}

      {!loading && phase === 'test' && sessionWords.length > 0 && (
        <div className="phase-center">
          <p className="phase-label">
            Recall · {testIndex + 1} / {sessionWords.length}
          </p>

          <article className="center-tile">
            <div className="tile-header">
              <h2 className="tile-word">{sessionWords[testIndex].word}</h2>
              {!editingDefinition && (
                <button
                  type="button"
                  className="compact ghost"
                  onClick={startDefinitionEdit}
                >
                  Def
                </button>
              )}
            </div>
            {editingDefinition ? (
              <div className="definition-editor">
                <textarea
                  value={definitionDraft}
                  onChange={(e) => setDefinitionDraft(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="inline-form">
                  <button type="button" className="compact" onClick={saveSessionDefinition}>
                    Save
                  </button>
                  <button type="button" className="compact ghost" onClick={cancelDefinitionEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                placeholder="Define this word…"
                value={sessionWords[testIndex].userAnswer ?? ''}
                onChange={(e) => updateAnswer(e.target.value)}
                autoFocus
              />
            )}
          </article>

          <ProgressSquares activeIndex={testIndex} completedBefore />

          <div className="nav-row">
            <button
              onClick={submitAnswer}
              disabled={
                editingDefinition || !sessionWords[testIndex].userAnswer?.trim()
              }
            >
              {testIndex < sessionWords.length - 1 ? 'Submit' : 'Finish'}
            </button>
          </div>
          <button type="button" className="ghost home-button" onClick={resetToSetup}>
            Home
          </button>
        </div>
      )}

      {!loading && phase === 'results' && (
        <div className="results-block">
          <div className="results-summary">
            <p>Average</p>
            <div className="big-score">{sessionAverage}%</div>
          </div>

          {sessionWords.map((entry) => (
            <article key={entry.word} className="result-item">
              <div className="result-header">
                <h2 className="result-word">{entry.word}</h2>
                {entry.scoreResult && (
                  <span className="score-mark">{entry.scoreResult.score}%</span>
                )}
              </div>
              <p>
                <strong>You</strong> — {entry.userAnswer}
              </p>
              <p>
                <strong>Answer</strong> — {entry.definition}
              </p>
              {entry.scoreResult && <p>{entry.scoreResult.feedback}</p>}
            </article>
          ))}

          <button onClick={resetToSetup}>New session</button>
        </div>
      )}

      <details className="settings-panel">
        <summary>Settings</summary>
        <div className="panel setup-form">
          <label>
            OpenAI API key
            <input
              type="password"
              placeholder="sk-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={saveApiKey}
            />
            <span className="hint">
              Used for definitions and scoring. Stored locally only.
            </span>
          </label>
        </div>
      </details>

      <details className="settings-panel">
        <summary>Word list · {allWords.length} words</summary>
        <WordListManager
          words={allWords}
          onWordsChange={handleWordsChange}
          onProgressChange={refreshProgress}
        />
      </details>
    </div>
  );
}
