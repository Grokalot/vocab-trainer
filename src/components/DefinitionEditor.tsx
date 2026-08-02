interface DefinitionEditorProps {
  draft: string;
  fetchingGpt: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onFetchGpt: () => void;
  label?: string;
  rows?: number;
}

export default function DefinitionEditor({
  draft,
  fetchingGpt,
  onDraftChange,
  onSave,
  onCancel,
  onFetchGpt,
  label,
  rows = 3,
}: DefinitionEditorProps) {
  return (
    <div className="definition-editor">
      {label && <p className="definition-label">{label}</p>}
      <textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Enter definition…"
        rows={rows}
        autoFocus
      />
      <div className="inline-form">
        <button type="button" className="compact" onClick={onSave} disabled={fetchingGpt}>
          Save
        </button>
        <button
          type="button"
          className="compact ghost"
          onClick={onFetchGpt}
          disabled={fetchingGpt}
        >
          {fetchingGpt ? 'Fetching…' : 'GPT'}
        </button>
        <button type="button" className="compact ghost" onClick={onCancel} disabled={fetchingGpt}>
          Cancel
        </button>
      </div>
    </div>
  );
}
