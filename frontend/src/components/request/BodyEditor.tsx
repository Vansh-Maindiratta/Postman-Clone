import { useMemo } from 'react';
import type { BodyType, HttpMethod, KeyValue, RequestBody } from '../../types';
import KeyValueTable from './KeyValueTable';

interface BodyEditorProps {
  body: RequestBody;
  method: HttpMethod;
  onChange: (body: RequestBody) => void;
}

const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'json', label: 'JSON' },
  { id: 'text', label: 'Text' },
  { id: 'form', label: 'Form data' },
];

export default function BodyEditor({ body, method, onChange }: BodyEditorProps) {
  const jsonError = useMemo(() => {
    if (body.type !== 'json' || !body.text.trim()) return null;
    try {
      JSON.parse(body.text);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Check the syntax and try again.';
    }
  }, [body.type, body.text]);

  if (method === 'GET' || method === 'HEAD') {
    return <p className="hint">{method} requests cannot carry a body. Switch the method to POST, PUT, PATCH, or DELETE to send one.</p>;
  }

  return (
    <>
      <div className="body-types" role="group" aria-label="Body type">
        {BODY_TYPES.map((type) => (
          <button
            type="button"
            key={type.id}
            className={`seg-btn${body.type === type.id ? ' active' : ''}`}
            onClick={() => onChange({ ...body, type: type.id })}
            aria-pressed={body.type === type.id}
          >
            {type.label}
          </button>
        ))}
      </div>

      {(body.type === 'json' || body.type === 'text') && (
        <>
          <textarea
            className="body-textarea"
            value={body.text}
            onChange={(event) => onChange({ ...body, text: event.target.value })}
            placeholder={body.type === 'json' ? '{\n  "name": "Ada",\n  "email": "ada@example.com"\n}' : 'Request body text'}
            aria-label={`${body.type.toUpperCase()} request body`}
            spellCheck={false}
          />
          {jsonError && (
            <p className="field-error" role="alert">
              <strong>Invalid JSON</strong>
              <span>{jsonError}</span>
            </p>
          )}
        </>
      )}

      {body.type === 'form' && (
        <KeyValueTable
          title="Form fields"
          rows={body.form}
          onChange={(form: KeyValue[]) => onChange({ ...body, form })}
          keyPlaceholder="name"
          valuePlaceholder="value"
          addLabel="Add field"
          hint="Fields are sent as multipart/form-data. Content-Type is set automatically."
        />
      )}
    </>
  );
}
