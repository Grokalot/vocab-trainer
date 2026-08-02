import { useEffect, useState, type KeyboardEvent } from 'react';
import type { DefinitionEditView, SessionWord, WordEditView } from '../types';
import DefinitionEditor from './DefinitionEditor';
import ProgressSquares from './ProgressSquares';
import TileWordHeader from './TileWordHeader';

interface RecallPhaseProps {
  words: SessionWord[];
  index: number;
  total: number;
  wordEdit: WordEditView;
  definitionEdit: DefinitionEditView;
  submitting: boolean;
  onSubmit: (answer: string) => Promise<boolean>;
  onHome: () => void;
}

export default function RecallPhase({
  words,
  index,
  total,
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
  wordEdit,
  definitionEdit,
  submitting,
  onSubmit,
  onHome,
}: RecallPhaseProps & { word: SessionWord }) {
  const [answerDraft, setAnswerDraft] = useState('');
  const tileLocked = wordEdit.isEditing || definitionEdit.isEditing || submitting;

  useEffect(() => {
    setAnswerDraft('');
  }, [word.word]);

  async function handleSubmit() {
    if (!answerDraft.trim() || tileLocked) return;
    const success = await onSubmit(answerDraft);
    if (success) {
      setAnswerDraft('');
    }
  }

  function handleAnswerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    handleSubmit();
  }

  return (
    <div className="phase-center">
      <p className="phase-label">
        Recall · {index + 1} / {total}
      </p>

      <article className="center-tile">
        <TileWordHeader
          word={word.word}
          wordEdit={wordEdit}
          definitionEdit={definitionEdit}
        />
        {definitionEdit.isEditing ? (
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
            <label className="recall-input">
              <span className="sr-only">Your definition</span>
              <textarea
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                onKeyDown={handleAnswerKeyDown}
                placeholder="Type the definition…"
                rows={4}
                autoFocus
                disabled={submitting}
              />
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
