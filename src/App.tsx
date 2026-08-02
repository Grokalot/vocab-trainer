import { useSettings } from './hooks/useSettings';
import { useAI } from './hooks/useAI';
import { useStatistics } from './hooks/useStatistics';
import { useWordLists } from './hooks/useWordLists';
import { useStudySession } from './hooks/useStudySession';
import { recordSessionCompletion } from './lib/sessionStats';
import SetupView from './components/SetupView';
import StudyPhase from './components/StudyPhase';
import RecallPhase from './components/RecallPhase';
import ResultsPhase from './components/ResultsPhase';
import WordListManager from './components/WordListManager';

export default function App() {
  const settings = useSettings();
  const ai = useAI();
  const wordLists = useWordLists();
  const statistics = useStatistics(wordLists.words);

  const session = useStudySession({
    allWords: wordLists.words,
    newWordCount: wordLists.newWordCount,
    trackedWordCount: wordLists.trackedWordCount,
    loadSessionEntries: ai.loadSessionEntries,
    scoreAnswer: ai.scoreAnswer,
    fetchGptDefinition: ai.fetchDefinitionFromGpt,
    renameWordInList: wordLists.renameWordInList,
    onWordRenamed: statistics.refresh,
    onSessionCompleted: (summary) => {
      recordSessionCompletion(summary);
      statistics.refresh();
    },
    onSessionFinished: statistics.refresh,
  });

  const error = session.error ?? wordLists.loadError;

  return (
    <div className="app">
      <header>
        <h1>Vocab</h1>
        <p>Study · Recall · Improve</p>
      </header>

      {error && <div className="error">{error}</div>}

      {session.loading.active && (
        <div className="loading">
          <p>{session.loading.message || 'Loading…'}</p>
        </div>
      )}

      {!session.loading.active && session.phase === 'setup' && (
        <SetupView
          hasApiKey={settings.hasApiKey}
          wordCount={wordLists.newWordCount}
          maxNewWords={statistics.maxNewWords}
          untestedCount={statistics.untestedCount}
          totalWords={wordLists.words.length}
          onWordCountChange={(value) =>
            wordLists.setNewWordCount(
              wordLists.clampNewWordCount(value, statistics.maxNewWords),
            )
          }
          onStartNew={() => session.startSession('new')}
          improvingWords={statistics.improvingWords}
          learnedWords={statistics.trends}
          overview={statistics.overview}
          hasStudiedWords={statistics.trackedStats.count > 0}
          trackedWordCount={wordLists.trackedWordCount}
          maxTrackedWords={statistics.maxTrackedWords}
          maxRetentionWords={statistics.maxRetentionWords}
          onTrackedWordCountChange={(value) =>
            wordLists.setTrackedWordCount(
              wordLists.clampTrackedWordCount(
                value,
                Math.max(statistics.maxTrackedWords, statistics.maxRetentionWords),
              ),
            )
          }
          onStartTracked={session.startSession}
        />
      )}

      {!session.loading.active && session.study && (
        <StudyPhase
          words={session.study.words}
          word={session.study.word}
          index={session.study.index}
          total={session.study.total}
          definitionEdit={session.study.definitionEdit}
          wordEdit={session.study.wordEdit}
          canGoBack={session.study.canGoBack}
          isLast={session.study.isLast}
          onGoBack={session.study.goBack}
          onGoNext={session.study.goNext}
          onBeginRecall={session.study.beginRecall}
          onHome={session.study.goHome}
        />
      )}

      {!session.loading.active && session.recall && (
        <RecallPhase
          words={session.recall.words}
          index={session.recall.index}
          total={session.recall.total}
          definitionEdit={session.recall.definitionEdit}
          wordEdit={session.recall.wordEdit}
          onSubmit={session.recall.submitAnswer}
          onHome={session.recall.goHome}
        />
      )}

      {!session.loading.active && session.results && (
        <ResultsPhase
          average={session.results.average}
          words={session.results.words}
          onHome={session.results.goHome}
        />
      )}

      <div className="app-footer">
        <details className="settings-panel">
          <summary>Settings</summary>
          <div className="panel setup-form">
            <label>
              OpenAI API key
              <input
                type="password"
                placeholder="sk-…"
                value={settings.apiKey}
                onChange={(e) => settings.setApiKey(e.target.value)}
                onBlur={settings.persistApiKey}
              />
              <span className="hint">
                Used for definitions and scoring. Stored locally only.
              </span>
            </label>
          </div>
        </details>

        <details
          className="settings-panel settings-panel-end"
          onToggle={(e) => wordLists.setIsManagerOpen(e.currentTarget.open)}
        >
          <summary>Word list · {wordLists.words.length} words</summary>
          {wordLists.isManagerOpen && (
            <WordListManager
              words={wordLists.words}
              onAddWord={wordLists.addWordToList}
              onRenameWord={wordLists.renameWordInList}
              onRefreshDefinitions={ai.refreshDefinitions}
              onFetchGptDefinition={ai.fetchDefinitionFromGpt}
              onStatisticsChange={statistics.refresh}
            />
          )}
        </details>
      </div>
    </div>
  );
}
