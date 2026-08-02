import type { DefinitionEditView, WordEditView } from '../types';
import AutoFitWord from './AutoFitWord';

interface TileWordHeaderProps {
  word: string;
  wordEdit: WordEditView;
  definitionEdit: DefinitionEditView;
}

export default function TileWordHeader({
  word,
  wordEdit,
  definitionEdit,
}: TileWordHeaderProps) {
  if (wordEdit.isEditing) {
    return (
      <div className="tile-header tile-header-editing">
        <input
          type="text"
          className="tile-word-input"
          value={wordEdit.draft}
          onChange={(e) => wordEdit.setDraft(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') wordEdit.save();
            if (e.key === 'Escape') wordEdit.cancel();
          }}
        />
        <div className="tile-header-actions">
          <button type="button" className="compact" onClick={wordEdit.save}>
            Save
          </button>
          <button type="button" className="compact ghost" onClick={wordEdit.cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tile-header">
      <AutoFitWord word={word} className="tile-word" />
      {!definitionEdit.isEditing && (
        <div className="tile-header-actions">
          <button type="button" className="compact ghost" onClick={wordEdit.start}>
            Edit
          </button>
          <button type="button" className="compact ghost" onClick={definitionEdit.start}>
            Def
          </button>
        </div>
      )}
    </div>
  );
}
