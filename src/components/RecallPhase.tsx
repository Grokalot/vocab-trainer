import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { prepareWordRecallPrompt } from '../lib/wordRecallPrompt';
import { countTypedLetters, parseWordLetterLayout } from '../lib/letterReveal';
import type { DefinitionEditView, SessionWord, WordEditView } from '../types';
import DefinitionEditor from './DefinitionEditor';
import LetterRevealRow from './LetterRevealRow';
import ProgressSquares from './ProgressSquares';
import TileWordHeader from './TileWordHeader';

interface RecallPhaseProps {
  words: SessionWord[];
  index: number;
  total: number;
  variant: 'definition' | 'word';
  wordEdit: WordEditView;
  definitionEdit: DefinitionEditView;
  submitting: boolean;
  onSubmit: (
    answer: string,
    options?: { lettersRevealed?: number },
  ) => Promise<boolean>;
  onHome: () => void;
}

export default function RecallPhase({
  words,
  index,
  total,
  variant,
  wordEdit,
  definitionEdit,
  submitting,
  onSubmit,
  onHome,
}: RecallPhaseProps) {
  const word = words[index];

  return (
    <RecallPhaseInner
      key={word.word}
      words={words}
      index={index}
      total={total}
      word={word}
      variant={variant}
      wordEdit={wordEdit}
      definitionEdit={definitionEdit}
      submitting={submitting}
      onSubmit={onSubmit}
      onHome={onHome}
    />
  );
}

function RecallPhaseInner({
  words,
  index,
  total,
  word,
  variant,
  wordEdit,
  definitionEdit,
  submitting,
  onSubmit,
  onHome,
}: RecallPhaseProps & { word: SessionWord }) {
  const [answerDraft, setAnswerDraft] = useState('');
  const [inputOverLimitFlash, setInputOverLimitFlash] = useState(false);
  const [revealedLetterIndices, setRevealedLetterIndices] = useState<Set<number>>(
    () => new Set(),
  );
  const overLimitFlashTimeoutRef = useRef<number | null>(null);
  const tileLocked = wordEdit.isEditing || definitionEdit.isEditing || submitting;
  const isWordRecall = variant === 'word';
  const wordRecallPrompt = isWordRecall
    ? prepareWordRecallPrompt(word.word, word.definition)
    : null;
  const { letterCount } = useMemo(
    () => parseWordLetterLayout(word.word),
    [word.word],
  );
  const typedLetterCount = useMemo(() => {
    return Math.min(countTypedLetters(answerDraft), letterCount);
  }, [answerDraft, letterCount]);

  useEffect(() => {
    setAnswerDraft('');
    setRevealedLetterIndices(new Set());
    setInputOverLimitFlash(false);
  }, [word.word]);

  useEffect(() => {
    return () => {
      if (overLimitFlashTimeoutRef.current !== null) {
        window.clearTimeout(overLimitFlashTimeoutRef.current);
      }
    };
  }, []);

  function triggerOverLimitFlash() {
    setInputOverLimitFlash(false);
    window.requestAnimationFrame(() => {
      setInputOverLimitFlash(true);
      if (overLimitFlashTimeoutRef.current !== null) {
        window.clearTimeout(overLimitFlashTimeoutRef.current);
      }
      overLimitFlashTimeoutRef.current = window.setTimeout(() => {
        setInputOverLimitFlash(false);
        overLimitFlashTimeoutRef.current = null;
      }, 450);
    });
  }

  function handleAnswerChange(value: string) {
    const previousCount = countTypedLetters(answerDraft);
    setAnswerDraft(value);

    if (!isWordRecall || letterCount === 0) return;

    const nextCount = countTypedLetters(value);
    if (nextCount > letterCount && nextCount > previousCount) {
      triggerOverLimitFlash();
    }
  }
  function revealLetter(letterIndex: number) {
    setRevealedLetterIndices((current) => {
      if (current.has(letterIndex)) return current;
      const next = new Set(current);
      next.add(letterIndex);
      return next;
    });
  }

  async function handleSubmit() {
    if (!answerDraft.trim() || tileLocked) return;
    const success = await onSubmit(answerDraft, {
      lettersRevealed: isWordRecall ? revealedLetterIndices.size : undefined,
    });
    if (success) {
      setAnswerDraft('');
      setRevealedLetterIndices(new Set());
    }
  }

  function handleAnswerKeyDown(e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    handleSubmit();
  }

  return (
    <div className="phase-center">
      <p className="phase-label">
        {isWordRecall ? 'Word recall' : 'Recall'} · {index + 1} / {total}
      </p>

      <article className="center-tile">
        {isWordRecall && letterCount > 0 && (
          <LetterRevealRow
            word={word.word}
            revealedLetterIndices={revealedLetterIndices}
            onRevealLetter={revealLetter}
            typedLetterCount={typedLetterCount}
            disabled={submitting}
          />
        )}
        {isWordRecall ? (
          <p className="word-recall-prompt">
            {wordRecallPrompt ?? word.definition}
          </p>
        ) : (
          <TileWordHeader
            word={word.word}
            wordEdit={wordEdit}
            definitionEdit={definitionEdit}
          />
        )}
        {!isWordRecall && definitionEdit.isEditing ? (
          <DefinitionEditor
            draft={definitionEdit.draft}
            fetchingGpt={definitionEdit.fetchingGpt}
            onDraftChange={definitionEdit.setDraft}
            onSave={definitionEdit.save}
            onCancel={definitionEdit.cancel}
            onFetchGpt={definitionEdit.fetchFromGpt}
          />
        ) : (
          !wordEdit.isEditing && (
            <label
              className={`recall-input${inputOverLimitFlash ? ' recall-input-over-limit' : ''}`}
            >
              <span className="sr-only">{isWordRecall ? 'Your word' : 'Your definition'}</span>
              {isWordRecall ? (
                <input
                  type="text"
                  value={answerDraft}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onKeyDown={handleAnswerKeyDown}
                  placeholder="Type the word…"
                  autoFocus
                  disabled={submitting}
                />
              ) : (
                <textarea
                  value={answerDraft}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onKeyDown={handleAnswerKeyDown}
                  placeholder="Type the definition…"
                  rows={4}
                  autoFocus
                  disabled={submitting}
                />
              )}
            </label>
          )
        )}
      </article>

      <ProgressSquares words={words} activeIndex={index} completedBefore />

      <div className="nav-row">
        <button onClick={handleSubmit} disabled={!answerDraft.trim() || tileLocked}>
          {submitting ? 'Scoring…' : 'Submit'}
        </button>
      </div>
      <button type="button" className="ghost home-button" onClick={onHome}>
        Home
      </button>
    </div>
  );
}
