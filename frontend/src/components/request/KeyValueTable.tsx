import type { KeyValue } from '../../types';
import { IconPlus, IconX } from '../ui/icons';

interface KeyValueTableProps {
  title: string;
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  addLabel: string;
  hint?: string;
}

export default function KeyValueTable({
  title,
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
  hint,
}: KeyValueTableProps) {
  function update(id: string, patch: Partial<KeyValue>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...rows, { id: crypto.randomUUID(), key: '', value: '', enabled: true }]);
  }

  return (
    <>
      <span className="section-label">{title}</span>
      <div className="kv-head" aria-hidden="true">
        <span />
        <span>Key</span>
        <span>Value</span>
        <span />
      </div>
      {rows.map((row, index) => (
        <div className={`kv-row${row.enabled ? '' : ' off'}`} key={row.id}>
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(event) => update(row.id, { enabled: event.target.checked })}
            aria-label={row.key ? `Enable ${row.key}` : `Enable row ${index + 1}`}
          />
          <input
            className="kv-input"
            type="text"
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(event) => update(row.id, { key: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addRow();
            }}
            aria-label="Key"
            spellCheck={false}
          />
          <input
            className="kv-input"
            type="text"
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(event) => update(row.id, { value: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addRow();
            }}
            aria-label="Value"
            spellCheck={false}
          />
          <button type="button" className="icon-btn xs" onClick={() => onChange(rows.filter((item) => item.id !== row.id))} aria-label={`Remove ${row.key || 'row'}`}>
            <IconX />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost kv-add" onClick={addRow}>
        <IconPlus />
        {addLabel}
      </button>
      {hint && <p className="hint">{hint}</p>}
    </>
  );
}
