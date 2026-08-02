import { useEffect, useState } from 'react';
import type { DefinitionEditView, SessionWord } from '../types';
import ProgressSquares from './ProgressSquares';

interface RecallPhaseProps {
  words: SessionWord[];
  index: number;
  total: number;
  definitionEdit: DefinitionEditView;
  onSubmit: (answer: string) => void;
  onHome: () => void;
}

export default function RecallPhase({
  words,
  index,
  total,
  definitionEdit,
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
      definitionEdit={definitionEdit}
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
  definitionEdit,
  onSubmit,
  onHome,
}: RecallPhaseProps & { word: SessionWord }) {
  const [answerDraft, setAnswerDraft] = useState('');

  useEffect(() => {
    setAnswerDraft('');
  }, [word.word]);

  function handleSubmit() {
    onSubmit(answerDraft);
    setAnswerDraft('');
  }

  return (
    <div className="phase-center">
      <p className="phase-label">
        Recall · {index + 1} / {total}
      </p>

      <article className="center-tile">
        <div className="tile-header">
          <h2 className="tile-word">{word.word}</h2>
          {!definitionEdit.isEditing && (
            <button type="button" className="compact ghost" onClick={definitionEdit.start}>
              Def
            </button>
          )}
        </div>
        {definitionEdit.isEditing ? (
          <div className="definition-editor">
            <textarea
              value={definitionEdit.draft}
              onChange={(e) => definitionEdit.setDraft(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="inline-form">
              <button type="button" className="compact" onClick={definitionEdit.save}>
                Save
              </button>
              <button type="button" className="compact ghost" onClick={definitionEdit.cancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <label className="recall-input">
            <span className="sr-only">Your definition</span>
            <textarea
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              placeholder="Type the definition…"
              rows={4}
              autoFocus
            />
          </label>
        )}
      </article>

      <ProgressSquares words={words} activeIndex={index} completedBefore />

      <div className="nav-row">
        <button onClick={handleSubmit} disabled={!answerDraft.trim()}>
          Submit
        </button>
      </div>
      <button type="button" className="ghost home-button" onClick={onHome}>
        Home
      </button>
    </div>
  );
}
