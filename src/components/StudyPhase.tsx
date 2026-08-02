import type { DefinitionEditView, SessionWord } from '../types';
import ProgressSquares from './ProgressSquares';

interface StudyPhaseProps {
  words: SessionWord[];
  word: SessionWord;
  index: number;
  total: number;
  definitionEdit: DefinitionEditView;
  canGoBack: boolean;
  isLast: boolean;
  onGoBack: () => void;
  onGoNext: () => void;
  onBeginRecall: () => void;
  onHome: () => void;
}

export default function StudyPhase({
  words,
  word,
  index,
  total,
  definitionEdit,
  canGoBack,
  isLast,
  onGoBack,
  onGoNext,
  onBeginRecall,
  onHome,
}: StudyPhaseProps) {
  return (
    <div className="phase-center">
      <p className="phase-label">
        Study · {index + 1} / {total}
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
          <p className="tile-definition">{word.definition}</p>
        )}
      </article>

      <ProgressSquares words={words} activeIndex={index} completedBefore={false} />

      <div className="nav-row">
        <button className="ghost" disabled={!canGoBack} onClick={onGoBack} aria-label="Previous word">
          ←
        </button>
        {isLast ? (
          <button onClick={onBeginRecall}>Ready</button>
        ) : (
          <button onClick={onGoNext}>Next</button>
        )}
      </div>
      <button type="button" className="ghost home-button" onClick={onHome}>
        Home
      </button>
    </div>
  );
}
