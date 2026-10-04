import type { AuthConfig, AuthType } from '../../types';

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const AUTH_TYPES: { id: AuthType; label: string }[] = [
  { id: 'none', label: 'No Auth' },
  { id: 'bearer', label: 'Bearer Token' },
  { id: 'basic', label: 'Basic Auth' },
  { id: 'apikey', label: 'API Key' },
];

export default function AuthEditor({ auth, onChange }: AuthEditorProps) {
  function field(label: string, key: keyof AuthConfig, placeholder: string, masked = false) {
    return (
      <div className="field">
        <label className="field-label" htmlFor={`auth-${key}`}>
          {label}
        </label>
        <input
          id={`auth-${key}`}
          className="text-input"
          type={masked ? 'password' : 'text'}
          value={auth[key] as string}
          onChange={(event) => onChange({ ...auth, [key]: event.target.value })}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="field">
        <label className="field-label" htmlFor="auth-type">
          Auth type
        </label>
        <select id="auth-type" value={auth.type} onChange={(event) => onChange({ ...auth, type: event.target.value as AuthType })}>
          {AUTH_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {auth.type === 'bearer' && field('Token', 'token', 'eyJhbGciOi...')}
      {auth.type === 'basic' && (
        <>
          {field('Username', 'username', 'username')}
          {field('Password', 'password', 'password', true)}
        </>
      )}
      {auth.type === 'apikey' && (
        <>
          {field('Key name', 'keyName', 'X-API-Key')}
          {field('Key value', 'keyValue', 'value', true)}
        </>
      )}

      {auth.type === 'none' ? (
        <p className="hint">This request is sent without an Authorization header.</p>
      ) : (
        <p className="hint">Credentials are added to the request when you send it, and stored locally only if you save this request.</p>
      )}
    </div>
  );
}
