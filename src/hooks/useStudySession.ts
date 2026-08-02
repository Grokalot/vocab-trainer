import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  SessionCompletionSummary,
} from '../types';
import {
  pickNewWords,
  pickTrackedWords,
  recordAttempt,
  saveDefinition,
} from '../lib/storage';
import { pickRetentionTestWords, recordRetentionAttempt } from '../lib/retention';
import { pickWordRecallTestWords, recordWordRecallAttempt } from '../lib/wordRecall';
import { applyLetterRevealCap, letterRevealMaxScore, parseWordLetterLayout } from '../lib/letterReveal';

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
  scoreWordAnswer: (
    word: string,
    definition: string,
    answer: string,
  ) => Promise<ReviewResult>;
  onSessionFinished: () => void;
  onSessionCompleted?: (summary: SessionCompletionSummary) => void;
  fetchGptDefinition: (word: string) => Promise<string>;
  renameWordInList: (oldWord: string, newWord: string) => void;
  onWordRenamed: () => void;
}

function useWordEdit(
  getWord: () => SessionWord | undefined,
  renameWordInSession: (oldWord: string, newWord: string) => void,
  renameWordInList: (oldWord: string, newWord: string) => void,
  onWordRenamed: () => void,
  cancelDefinitionEdit: () => void,
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
    cancelDefinitionEdit();
    setDraft(current.word);
    setIsEditing(true);
  }, [getWord, cancelDefinitionEdit]);

  const cancel = useCallback(() => {
    setIsEditing(false);
    setDraft('');
  }, []);

  const save = useCallback(() => {
    const current = getWord();
    if (!current) return;

    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Enter a word.');
      return;
    }
    if (trimmed === current.word) {
      cancel();
      return;
    }

    try {
      renameWordInList(current.word, trimmed);
      renameWordInSession(current.word, trimmed);
      onWordRenamed();
      cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename word.');
    }
  }, [
    getWord,
    draft,
    renameWordInList,
    renameWordInSession,
    onWordRenamed,
    cancel,
    setError,
  ]);

  return { isEditing, draft, start, setDraft, save, cancel };
}

function useDefinitionEdit(
  getWord: () => SessionWord | undefined,
  updateDefinition: (word: string, definition: string) => void,
  fetchGptDefinition: (word: string) => Promise<string>,
  cancelWordEdit: () => void,
  setError: (message: string) => void,
  resetKey: string,
) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [fetchingGpt, setFetchingGpt] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setDraft('');
    setFetchingGpt(false);
  }, [resetKey]);

  const start = useCallback(() => {
    const current = getWord();
    if (!current) return;
    cancelWordEdit();
    setDraft(current.definition);
    setIsEditing(true);
  }, [getWord, cancelWordEdit]);

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

  const fetchFromGpt = useCallback(async () => {
    const current = getWord();
    if (!current || fetchingGpt) return;

    setFetchingGpt(true);
    setError('');
    try {
      const definition = await fetchGptDefinition(current.word);
      setDraft(definition);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch definition from GPT.');
    } finally {
      setFetchingGpt(false);
    }
  }, [getWord, fetchGptDefinition, setError]);

  return { isEditing, draft, fetchingGpt, start, setDraft, save, cancel, fetchFromGpt };
}

function isTrackedTestStartMode(mode: SessionStartMode): boolean {
  return mode === 'tracked-test' || mode === 'tracked-test-word';
}

export function useStudySession({
  allWords,
  newWordCount,
  trackedWordCount,
  loadSessionEntries,
  scoreAnswer,
  scoreWordAnswer,
  onSessionFinished,
  onSessionCompleted,
  fetchGptDefinition,
  renameWordInList,
  onWordRenamed,
}: UseStudySessionOptions) {
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [mode, setMode] = useState<SessionStartMode>('new');
  const [sessionWords, setSessionWords] = useState<SessionWord[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [testIndex, setTestIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingBlocksUI, setLoadingBlocksUI] = useState(false);
  const [error, setError] = useState('');

  const resetKey = `${phase}-${studyIndex}-${testIndex}`;

  const updateWordDefinition = useCallback((word: string, definition: string) => {
    setSessionWords((prev) =>
      prev.map((item) => (item.word === word ? { ...item, definition } : item)),
    );
  }, []);

  const renameWordInSession = useCallback((oldWord: string, newWord: string) => {
    setSessionWords((prev) =>
      prev.map((item) => (item.word === oldWord ? { ...item, word: newWord } : item)),
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

  const studyWordCancelRef = useRef<() => void>(() => {});
  const testWordCancelRef = useRef<() => void>(() => {});

  const studyDefinitionEdit = useDefinitionEdit(
    getStudyWord,
    updateWordDefinition,
    fetchGptDefinition,
    () => studyWordCancelRef.current(),
    setError,
    resetKey,
  );

  const studyWordEdit = useWordEdit(
    getStudyWord,
    renameWordInSession,
    renameWordInList,
    onWordRenamed,
    studyDefinitionEdit.cancel,
    setError,
    resetKey,
  );

  studyWordCancelRef.current = studyWordEdit.cancel;

  const testDefinitionEdit = useDefinitionEdit(
    getTestWord,
    updateWordDefinition,
    fetchGptDefinition,
    () => testWordCancelRef.current(),
    setError,
    resetKey,
  );

  const testWordEdit = useWordEdit(
    getTestWord,
    renameWordInSession,
    renameWordInList,
    onWordRenamed,
    testDefinitionEdit.cancel,
    setError,
    resetKey,
  );

  testWordCancelRef.current = testWordEdit.cancel;

  const startSession = useCallback(
    async (startMode: SessionStartMode) => {
      setError('');
      setLoading(true);
      setLoadingBlocksUI(true);
      setLoadingMessage('Selecting words and fetching definitions…');

      try {
        const count = startMode === 'new' ? newWordCount : trackedWordCount;
        const selected =
          startMode === 'new'
            ? pickNewWords(allWords, count)
            : startMode === 'tracked-test'
              ? pickRetentionTestWords(count)
              : startMode === 'tracked-test-word'
                ? pickWordRecallTestWords(count)
                : pickTrackedWords(count);

        if (selected.length === 0) {
          setError(
            startMode === 'new'
              ? 'No untested words left. Use tracked mode to review words you have studied.'
              : startMode === 'tracked-test-word'
                ? 'No words with usable definitions for word test. Edit circular definitions (e.g. "variant of …") in your word list.'
                : isTrackedTestStartMode(startMode)
                  ? 'No studied words yet. Complete a new or tracked study session first.'
                  : 'No tracked words yet. Complete a new session first.',
          );
          return;
        }

        const entries = await loadSessionEntries(selected);
        setMode(startMode);
        setSessionWords(entries);
        setStudyIndex(0);
        setTestIndex(0);
        setPhase(isTrackedTestStartMode(startMode) ? 'test' : 'study');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session.');
      } finally {
        setLoading(false);
        setLoadingBlocksUI(false);
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
    studyWordEdit.cancel();
    testDefinitionEdit.cancel();
    testWordEdit.cancel();
    setPhase('setup');
    setSessionWords([]);
    onSessionFinished();
  }, [
    studyDefinitionEdit.cancel,
    studyWordEdit.cancel,
    testDefinitionEdit.cancel,
    testWordEdit.cancel,
    onSessionFinished,
  ]);

  const submitAnswer = useCallback(
    async (
      answer: string,
      options?: { lettersRevealed?: number },
    ): Promise<boolean> => {
      const trimmed = answer.trim();
      if (!trimmed) return false;

      const current = sessionWords[testIndex];
      if (!current) return false;

      setError('');
      setLoading(true);
      setLoadingBlocksUI(false);
      setLoadingMessage(
        mode === 'tracked-test-word' ? 'Scoring word answer…' : `Scoring "${current.word}"…`,
      );

      try {
        const isWordTest = mode === 'tracked-test-word';
        const aiReview = isWordTest
          ? await scoreWordAnswer(current.word, current.definition, trimmed)
          : await scoreAnswer(current.word, current.definition, trimmed);

        let review = aiReview;
        if (isWordTest) {
          const { letterCount } = parseWordLetterLayout(current.word);
          const lettersRevealed = options?.lettersRevealed ?? 0;
          const scoreCap = letterRevealMaxScore(lettersRevealed, letterCount);
          const adjustedScore = applyLetterRevealCap(
            aiReview.score,
            lettersRevealed,
            letterCount,
          );
          review = {
            ...aiReview,
            score: adjustedScore,
            aiScore: aiReview.score,
            scoreCap,
            lettersRevealed,
          };
        }

        if (mode === 'tracked-test') {
          recordRetentionAttempt(current.word, trimmed, review.score);
        } else if (mode === 'tracked-test-word') {
          recordWordRecallAttempt(current.word, trimmed, review.score);
        } else {
          recordAttempt(current.word, current.definition, trimmed, review.score);
        }

        const updatedWords = sessionWords.map((item, index) =>
          index === testIndex
            ? { ...item, userAnswer: trimmed, review }
            : item,
        );

        setSessionWords(updatedWords);

        if (testIndex < sessionWords.length - 1) {
          setTestIndex((i) => i + 1);
        } else {
          const averageScore = Math.round(
            updatedWords.reduce((sum, w) => sum + (w.review?.score ?? 0), 0) /
              updatedWords.length,
          );

          onSessionCompleted?.({
            mode,
            wordCount: updatedWords.length,
            averageScore,
            words: updatedWords,
          });
          onSessionFinished();
          setPhase('results');
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scoring failed.');
        return false;
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    },
    [sessionWords, testIndex, mode, scoreAnswer, scoreWordAnswer, onSessionCompleted, onSessionFinished],
  );

  const recallVariant = mode === 'tracked-test-word' ? 'word' : 'definition';

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
      wordEdit: studyWordEdit,
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
    studyWordEdit,
    beginRecall,
    goHome,
  ]);

  const recall = useMemo((): RecallPhaseView | null => {
    if (phase !== 'test' || sessionWords.length === 0) return null;

    return {
      words: sessionWords,
      index: testIndex,
      total: sessionWords.length,
      variant: recallVariant,
      definitionEdit: testDefinitionEdit,
      wordEdit: testWordEdit,
      submitAnswer,
      goHome,
    };
  }, [phase, sessionWords, testIndex, recallVariant, testDefinitionEdit, testWordEdit, submitAnswer, goHome]);

  const results = useMemo((): ResultsPhaseView | null => {
    if (phase !== 'results') return null;

    return {
      average: sessionAverage,
      words: sessionWords,
      variant: recallVariant,
      goHome,
    };
  }, [phase, sessionAverage, sessionWords, recallVariant, goHome]);

  const loadingState: SessionLoadingState = {
    active: loading,
    message: loadingMessage,
    blocksUI: loadingBlocksUI,
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
