import { useMemo, useState } from 'react';
import type { ApiRequest, AuthConfig, KeyValue, RequestBody } from '../../types';
import { HTTP_METHODS, resolveUrl } from '../../services/request';
import { IconCaret } from '../ui/icons';
import KeyValueTable from './KeyValueTable';
import BodyEditor from './BodyEditor';
import AuthEditor from './AuthEditor';

interface RequestEditorProps {
  request: ApiRequest;
  sending: boolean;
  onChange: (patch: Partial<ApiRequest>) => void;
  onSend: () => void;
  onSave: () => void;
}

type Section = 'params' | 'headers' | 'body' | 'auth';

function activeCount(rows: KeyValue[]): number {
  return rows.filter((row) => row.enabled && row.key.trim()).length;
}

export default function RequestEditor({ request, sending, onChange, onSend, onSave }: RequestEditorProps) {
  const [section, setSection] = useState<Section>('params');

  // Show what will actually be sent once query params change the URL.
  const urlPreview = useMemo(() => {
    try {
      const resolved = resolveUrl(request);
      return resolved === request.url.trim() ? null : resolved;
    } catch {
      return null;
    }
  }, [request]);

  const paramCount = activeCount(request.params);
  const headerCount = activeCount(request.headers);
  const hasBody = request.body.type !== 'none';
  const hasAuth = request.auth.type !== 'none';

  const tab = (id: Section, label: string, count?: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={section === id}
      className={`tab${section === id ? ' active' : ''}`}
      onClick={() => setSection(id)}
    >
      {label}
      {count !== undefined && count > 0 && <span className="tab-count">{count}</span>}
    </button>
  );

  return (
    <section className="request-editor" aria-label="Request editor">
      <div className="url-row">
        <span className={`method-wrap m-${request.method.toLowerCase()}`}>
          <select
            value={request.method}
            onChange={(event) => onChange({ method: event.target.value as ApiRequest['method'] })}
            aria-label="HTTP method"
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <span className="method-caret">
            <IconCaret />
          </span>
        </span>

        <input
          className="url-input"
          type="text"
          value={request.url}
          onChange={(event) => onChange({ url: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSend();
          }}
          placeholder="https://api.example.com/users"
          aria-label="Request URL"
          spellCheck={false}
          autoComplete="off"
        />

        <button type="button" className="btn btn-secondary" onClick={onSave}>
          Save
        </button>
        <button type="button" className="btn btn-primary btn-send" onClick={onSend} disabled={sending}>
          {sending ? (
            <>
              <span className="spinner" />
              Sending...
            </>
          ) : (
            'Send'
          )}
        </button>
      </div>

      {urlPreview && <div className="url-hint">{urlPreview}</div>}

      <div className="editor-tabs" role="tablist" aria-label="Request configuration">
        {tab('params', 'Params', paramCount)}
        {tab('headers', 'Headers', headerCount)}
        {tab('body', 'Body', hasBody ? 1 : undefined)}
        {tab('auth', 'Auth', hasAuth ? 1 : undefined)}
      </div>

      <div className="editor-panel" role="tabpanel">
        {section === 'params' && (
          <KeyValueTable
            title="Query parameters"
            rows={request.params}
            onChange={(params: KeyValue[]) => onChange({ params })}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
            addLabel="Add parameter"
            hint="Enabled parameters are appended to the URL when the request is sent."
          />
        )}

        {section === 'headers' && (
          <KeyValueTable
            title="Request headers"
            rows={request.headers}
            onChange={(headers: KeyValue[]) => onChange({ headers })}
            keyPlaceholder="Content-Type"
            valuePlaceholder="application/json"
            addLabel="Add header"
            hint="Unchecked headers are kept here but not sent."
          />
        )}

        {section === 'body' && (
          <BodyEditor body={request.body} onChange={(body: RequestBody) => onChange({ body })} method={request.method} />
        )}

        {section === 'auth' && <AuthEditor auth={request.auth} onChange={(auth: AuthConfig) => onChange({ auth })} />}
      </div>
    </section>
  );
}
