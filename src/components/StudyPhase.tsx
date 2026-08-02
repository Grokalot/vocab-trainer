import type { DefinitionEditView, SessionWord, WordEditView } from '../types';
import DefinitionEditor from './DefinitionEditor';
import ProgressSquares from './ProgressSquares';
import TileWordHeader from './TileWordHeader';

interface StudyPhaseProps {
  words: SessionWord[];
  word: SessionWord;
  index: number;
  total: number;
  wordEdit: WordEditView;
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
  wordEdit,
  definitionEdit,
  canGoBack,
  isLast,
  onGoBack,
  onGoNext,
  onBeginRecall,
  onHome,
}: StudyPhaseProps) {
  const tileLocked = wordEdit.isEditing || definitionEdit.isEditing;

  return (
    <div className="phase-center">
      <p className="phase-label">
        Study · {index + 1} / {total}
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
          !wordEdit.isEditing && <p className="tile-definition">{word.definition}</p>
        )}
      </article>

      <ProgressSquares words={words} activeIndex={index} completedBefore={false} />

      <div className="nav-row">
        <button
          className="ghost"
          disabled={!canGoBack || tileLocked}
          onClick={onGoBack}
          aria-label="Previous word"
        >
          ←
        </button>
        {isLast ? (
          <button onClick={onBeginRecall} disabled={tileLocked}>
            Ready
          </button>
        ) : (
          <button onClick={onGoNext} disabled={tileLocked}>
            Next
          </button>
        )}
      </div>
      <button type="button" className="ghost home-button" onClick={onHome}>
        Home
      </button>
    </div>
  );
}
