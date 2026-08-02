import { useState } from 'react';
import { addWord, filterWords, renameWord } from '../lib/words';

interface WordListManagerProps {
  words: string[];
  onWordsChange: (words: string[]) => void;
  onProgressChange: () => void;
}

export default function WordListManager({
  words,
  onWordsChange,
  onProgressChange,
}: WordListManagerProps) {
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localError, setLocalError] = useState('');

  const filtered = filterWords(words, search);

  function handleAdd() {
    setLocalError('');
    try {
      const updated = addWord(words, newWord);
      onWordsChange(updated);
      setNewWord('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not add word.');
    }
  }

  function startEdit(word: string) {
    setLocalError('');
    setEditingWord(word);
    setEditValue(word);
  }

  function cancelEdit() {
    setEditingWord(null);
    setEditValue('');
    setLocalError('');
  }

  function handleRename() {
    if (!editingWord) return;
    setLocalError('');
    try {
      const updated = renameWord(words, editingWord, editValue);
      onWordsChange(updated);
      onProgressChange();
      cancelEdit();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not rename word.');
    }
  }

  return (
    <div className="word-manager">
      <label>
        Add word
        <div className="inline-form">
          <input
            type="text"
            placeholder="Enter word"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" className="compact" onClick={handleAdd}>
            Add
          </button>
        </div>
      </label>

      <label>
        Find word
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      {localError && <p className="hint error-hint">{localError}</p>}

      <ul className="word-list capped">
        {filtered.map((word) => (
          <li key={word} className="word-list-item">
            {editingWord === word ? (
              <div className="inline-form">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
                <button type="button" className="compact" onClick={handleRename}>
                  Save
                </button>
                <button type="button" className="compact ghost" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span>{word}</span>
                <button
                  type="button"
                  className="compact ghost"
                  onClick={() => startEdit(word)}
                >
                  Edit
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {search.trim() && filtered.length === 0 && (
        <p className="hint">No matches for &ldquo;{search.trim()}&rdquo;</p>
      )}

      {!search.trim() && words.length > filtered.length && (
        <p className="hint overflow-hint">
          Showing first {filtered.length} of {words.length} words · search to find more
        </p>
      )}

      <p className="hint">
        Renaming keeps scores and history. Other words are unaffected.
      </p>
    </div>
  );
}
