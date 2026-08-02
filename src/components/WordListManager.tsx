import { useState } from 'react';
import { filterWords } from '../lib/words';
import { isCustomDefinition, saveDefinition } from '../lib/storage';
import { resolveStoredDefinition } from '../lib/definitions';
import type { RefreshProgress, RefreshResult } from '../types';
import DefinitionEditor from './DefinitionEditor';

interface WordListManagerProps {
  words: string[];
  onAddWord: (word: string) => void;
  onRenameWord: (oldWord: string, newWord: string) => void;
  onRefreshDefinitions: (
    words: string[],
    onProgress?: (progress: RefreshProgress) => void,
  ) => Promise<RefreshResult>;
  onFetchGptDefinition: (word: string) => Promise<string>;
  onStatisticsChange: () => void;
}

export default function WordListManager({
  words,
  onAddWord,
  onRenameWord,
  onRefreshDefinitions,
  onFetchGptDefinition,
  onStatisticsChange,
}: WordListManagerProps) {
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingDefinitionWord, setEditingDefinitionWord] = useState<string | null>(null);
  const [definitionValue, setDefinitionValue] = useState('');
  const [fetchingGpt, setFetchingGpt] = useState(false);
  const [localError, setLocalError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState('');

  const filtered = filterWords({ words }, search);

  function handleAdd() {
    setLocalError('');
    try {
      onAddWord(newWord);
      setNewWord('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not add word.');
    }
  }

  function startEdit(word: string) {
    setLocalError('');
    cancelDefinitionEdit();
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
      onRenameWord(editingWord, editValue);
      onStatisticsChange();
      if (editingDefinitionWord === editingWord) {
        setEditingDefinitionWord(editValue.trim());
      }
      cancelEdit();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not rename word.');
    }
  }

  function startDefinitionEdit(word: string) {
    setLocalError('');
    cancelEdit();
    setEditingDefinitionWord(word);
    setDefinitionValue(resolveStoredDefinition(word) ?? '');
  }

  function cancelDefinitionEdit() {
    setEditingDefinitionWord(null);
    setDefinitionValue('');
    setFetchingGpt(false);
    setLocalError('');
  }

  async function handleFetchGptDefinition() {
    if (!editingDefinitionWord || fetchingGpt) return;
    setLocalError('');
    setFetchingGpt(true);
    try {
      const definition = await onFetchGptDefinition(editingDefinitionWord);
      setDefinitionValue(definition);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not fetch definition from GPT.');
    } finally {
      setFetchingGpt(false);
    }
  }

  function handleDefinitionSave() {
    if (!editingDefinitionWord) return;
    setLocalError('');
    try {
      saveDefinition(editingDefinitionWord, definitionValue);
      onStatisticsChange();
      cancelDefinitionEdit();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not save definition.');
    }
  }

  async function handleRefreshDefinitions() {
    setLocalError('');
    setRefreshing(true);
    setRefreshStatus('Starting…');

    try {
      const result = await onRefreshDefinitions(words, (progress) => {
        setRefreshStatus(
          `${progress.done}/${progress.total} · ${progress.word} · updated ${progress.updated}`,
        );
      });

      onStatisticsChange();
      setRefreshStatus(
        `Done · ${result.updated} updated · ${result.skipped} custom kept · ${result.missed.length} not found on Dictionary.com`,
      );
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Refresh failed.');
      setRefreshStatus('');
    } finally {
      setRefreshing(false);
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
        {filtered.map((word) => {
          const storedDefinition = resolveStoredDefinition(word);
          const isCustom = isCustomDefinition(word);

          return (
            <li key={word} className="word-list-item stacked">
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
              ) : editingDefinitionWord === word ? (
                <DefinitionEditor
                  label={word}
                  draft={definitionValue}
                  fetchingGpt={fetchingGpt}
                  onDraftChange={setDefinitionValue}
                  onSave={handleDefinitionSave}
                  onCancel={cancelDefinitionEdit}
                  onFetchGpt={handleFetchGptDefinition}
                />
              ) : (
                <>
                  <div className="word-row">
                    <span>{word}</span>
                    <div className="word-actions">
                      <button type="button" className="compact ghost" onClick={() => startEdit(word)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="compact ghost"
                        onClick={() => startDefinitionEdit(word)}
                      >
                        Def
                      </button>
                    </div>
                  </div>
                  {storedDefinition && (
                    <p className="stored-definition">
                      {isCustom && <span className="custom-tag">Custom · </span>}
                      {storedDefinition}
                    </p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {search.trim() && filtered.length === 0 && (
        <p className="hint">No matches for &ldquo;{search.trim()}&rdquo;</p>
      )}

      {!search.trim() && words.length > filtered.length && (
        <p className="hint overflow-hint">
          Showing first {filtered.length} of {words.length} words · search to find more
        </p>
      )}

      <button
        type="button"
        className="tracked-start"
        onClick={handleRefreshDefinitions}
        disabled={refreshing || words.length === 0}
      >
        {refreshing ? 'Refreshing…' : 'Refresh definitions from Dictionary.com'}
      </button>

      {refreshStatus && <p className="hint">{refreshStatus}</p>}

      <p className="hint">
        Renaming keeps scores and history. Custom definitions (via Def) are kept during refresh.
      </p>
    </div>
  );
}
