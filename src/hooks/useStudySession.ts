import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AppPhase,
  RecallPhaseView,
  ResultsPhaseView,
  ReviewResult,
  SessionLoadingState,
  SessionStartMode,
  SessionWord,
  StudyPhaseView,
  Word,
} from '../types';
import {
  pickNewWords,
  pickTrackedWords,
  recordAttempt,
  saveDefinition,
} from '../lib/storage';

interface UseStudySessionOptions {
  allWords: string[];
  newWordCount: number;
  trackedWordCount: number;
  loadSessionEntries: (words: string[]) => Promise<Word[]>;
  scoreAnswer: (
    word: string,
    definition: string,
    answer: string,
  ) => Promise<ReviewResult>;
  onSessionFinished: () => void;
}

function useDefinitionEdit(
  getWord: () => SessionWord | undefined,
  updateDefinition: (word: string, definition: string) => void,
  setError: (message: string) => void,
  resetKey: string,
) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setIsEditing(false);
    setDraft('');
  }, [resetKey]);

  const start = useCallback(() => {
    const current = getWord();
    if (!current) return;
    setDraft(current.definition);
    setIsEditing(true);
  }, [getWord]);

  const cancel = useCallback(() => {
    setIsEditing(false);
    setDraft('');
  }, []);

  const save = useCallback(() => {
    const current = getWord();
    if (!current) return;

    try {
      saveDefinition(current.word, draft);
      updateDefinition(current.word, draft.trim());
      cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save definition.');
    }
  }, [getWord, draft, updateDefinition, cancel, setError]);

  return { isEditing, draft, start, setDraft, save, cancel };
}

export function useStudySession({
  allWords,
  newWordCount,
  trackedWordCount,
  loadSessionEntries,
  scoreAnswer,
  onSessionFinished,
}: UseStudySessionOptions) {
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [mode, setMode] = useState<SessionStartMode>('new');
  const [sessionWords, setSessionWords] = useState<SessionWord[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  const resetKey = `${phase}-${studyIndex}-${testIndex}`;

  const updateWordDefinition = useCallback((word: string, definition: string) => {
    setSessionWords((prev) =>
      prev.map((item) => (item.word === word ? { ...item, definition } : item)),
    );
  }, []);

  const getStudyWord = useCallback(
    () => sessionWords[studyIndex],
    [sessionWords, studyIndex],
  );

  const getTestWord = useCallback(
    () => sessionWords[testIndex],
    [sessionWords, testIndex],
  );

  const studyDefinitionEdit = useDefinitionEdit(
    getStudyWord,
    updateWordDefinition,
    setError,
    resetKey,
  );

  const testDefinitionEdit = useDefinitionEdit(
    getTestWord,
    updateWordDefinition,
    setError,
    resetKey,
  );

  const startSession = useCallback(
    async (startMode: SessionStartMode) => {
      setError('');
      setLoading(true);
      setLoadingMessage('Selecting words and fetching definitions…');

      try {
        const count = startMode === 'new' ? newWordCount : trackedWordCount;
        const selected =
          startMode === 'new'
            ? pickNewWords(allWords, count)
            : pickTrackedWords(count);

        if (selected.length === 0) {
          setError(
            startMode === 'new'
              ? 'No untested words left. Use tracked mode to review words you have studied.'
              : 'No tracked words yet. Complete a new session first.',
          );
          return;
        }

        const entries = await loadSessionEntries(selected);
        setMode(startMode);
        setSessionWords(entries);
        setStudyIndex(0);
        setTestIndex(0);
        setPhase(startMode === 'tracked-test' ? 'test' : 'study');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session.');
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    },
    [allWords, newWordCount, trackedWordCount, loadSessionEntries],
  );

  const beginRecall = useCallback(() => {
    setTestIndex(0);
    setPhase('test');
  }, []);

  const goHome = useCallback(() => {
    studyDefinitionEdit.cancel();
    testDefinitionEdit.cancel();
    setPhase('setup');
    setSessionWords([]);
    onSessionFinished();
  }, [
    studyDefinitionEdit.cancel,
    testDefinitionEdit.cancel,
    onSessionFinished,
  ]);

  const submitAnswer = useCallback(
    async (answer: string) => {
      const trimmed = answer.trim();
      if (!trimmed) return;

      const current = sessionWords[testIndex];
      if (!current) return;

      setError('');
      setLoading(true);
      setLoadingMessage(`Scoring "${current.word}"…`);

      try {
        const review = await scoreAnswer(current.word, current.definition, trimmed);
        recordAttempt(current.word, current.definition, trimmed, review.score);

        setSessionWords((prev) =>
          prev.map((item, index) =>
            index === testIndex
              ? { ...item, userAnswer: trimmed, review }
              : item,
          ),
        );

        if (testIndex < sessionWords.length - 1) {
          setTestIndex((i) => i + 1);
        } else {
          onSessionFinished();
          setPhase('results');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scoring failed.');
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    },
    [sessionWords, testIndex, scoreAnswer, onSessionFinished],
  );

  const sessionAverage = useMemo(() => {
    if (sessionWords.length === 0) return 0;
    return Math.round(
      sessionWords.reduce((sum, w) => sum + (w.review?.score ?? 0), 0) /
        sessionWords.length,
    );
  }, [sessionWords]);

  const study = useMemo((): StudyPhaseView | null => {
    if (phase !== 'study' || sessionWords.length === 0) return null;
    const current = sessionWords[studyIndex];
    if (!current) return null;

    return {
      words: sessionWords,
      word: current,
      index: studyIndex,
      total: sessionWords.length,
      definitionEdit: studyDefinitionEdit,
      canGoBack: studyIndex > 0,
      isLast: studyIndex >= sessionWords.length - 1,
      goBack: () => setStudyIndex((i) => i - 1),
      goNext: () => setStudyIndex((i) => i + 1),
      beginRecall,
      goHome,
    };
  }, [
    phase,
    sessionWords,
    studyIndex,
    studyDefinitionEdit,
    beginRecall,
    goHome,
  ]);

  const recall = useMemo((): RecallPhaseView | null => {
    if (phase !== 'test' || sessionWords.length === 0) return null;

    return {
      words: sessionWords,
      index: testIndex,
      total: sessionWords.length,
      definitionEdit: testDefinitionEdit,
      submitAnswer,
      goHome,
    };
  }, [phase, sessionWords, testIndex, testDefinitionEdit, submitAnswer, goHome]);

  const results = useMemo((): ResultsPhaseView | null => {
    if (phase !== 'results') return null;

    return {
      average: sessionAverage,
      words: sessionWords,
      goHome,
    };
  }, [phase, sessionAverage, sessionWords, goHome]);

  const loadingState: SessionLoadingState = {
    active: loading,
    message: loadingMessage,
  };

  return {
    phase,
    mode,
    loading: loadingState,
    error,
    startSession,
    study,
    recall,
    results,
  };
}
