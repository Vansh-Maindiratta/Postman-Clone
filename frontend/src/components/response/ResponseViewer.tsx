import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiResponse } from '../../types';
import { IconCopy } from '../ui/icons';

interface ResponseViewerProps {
  response: ApiResponse | null;
  error: string | null;
  sending: boolean;
  onCancel: () => void;
}

type BodyView = 'pretty' | 'raw';
type ResponseTab = 'body' | 'headers';

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

export default function ResponseViewer({ response, error, sending, onCancel }: ResponseViewerProps) {
  const [tab, setTab] = useState<ResponseTab>('body');
  const [view, setView] = useState<BodyView>('pretty');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(copyTimer.current);
  }, []);

  const pretty = useMemo(() => {
    if (!response) return null;
    const jsonType = response.contentType.includes('json');
    const trimmed = response.body.trim();
    if (!jsonType && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { text: response.body, json: false, invalid: false };
    }
    try {
      return { text: JSON.stringify(JSON.parse(response.body), null, 2), json: true, invalid: false };
    } catch {
      return { text: response.body, json: jsonType, invalid: jsonType };
    }
  }, [response]);

  if (sending) {
    return (
      <div className="response" aria-busy="true">
        <div className="response-center">
          <span className="spinner" />
          Sending request...
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    const [title, ...details] = error.split('\n\n');
    return (
      <div className="response">
        <div className="error-card" role="alert">
          <p className="error-title">{title}</p>
          {details.length > 0 && <p className="error-message">{details.join('\n\n')}</p>}
        </div>
      </div>
    );
  }

  if (!response || !pretty) {
    return (
      <div className="response">
        <div className="response-center">The response will appear here.</div>
      </div>
    );
  }

  const statusClass = `s-${Math.floor(response.status / 100)}xx`;
  const lines = pretty.text.split('\n');

  async function copyBody() {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response.body);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; nothing to do.
    }
  }

  return (
    <div className="response" aria-busy="false">
      <div className="response-head">
        <span className={`status ${statusClass}`}>
          {response.status} {response.statusText}
        </span>
        <span className="meta-item">{formatDuration(response.duration)}</span>
        <span className="meta-item">{formatSize(response.size)}</span>
        {response.contentType && <span className="meta-type meta-item">{response.contentType}</span>}
        <div className="response-tabs" role="tablist" aria-label="Response views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'body'}
            className={`tab${tab === 'body' ? ' active' : ''}`}
            onClick={() => setTab('body')}
          >
            Body
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'headers'}
            className={`tab${tab === 'headers' ? ' active' : ''}`}
            onClick={() => setTab('headers')}
          >
            Headers
          </button>
        </div>
      </div>

      {tab === 'body' && (
        <div className="response-tools">
          <div className="pretty-toggle body-types" role="group" aria-label="Body formatting">
            <button
              type="button"
              className={`seg-btn${view === 'pretty' ? ' active' : ''}`}
              onClick={() => setView('pretty')}
              aria-pressed={view === 'pretty'}
            >
              Pretty
            </button>
            <button
              type="button"
              className={`seg-btn${view === 'raw' ? ' active' : ''}`}
              onClick={() => setView('raw')}
              aria-pressed={view === 'raw'}
            >
              Raw
            </button>
          </div>
          <button type="button" className="btn btn-ghost" onClick={copyBody}>
            <IconCopy />
            {copied ? <span className="copied-flag">Copied</span> : 'Copy'}
          </button>
        </div>
      )}

      {tab === 'body' ? (
        <div className="response-body">
          {pretty.invalid && <p className="parsed-note">This response says it is JSON but could not be parsed. Showing it as received.</p>}

          {pretty.text.length === 0 ? (
            <p className="empty-body">The response body is empty.</p>
          ) : view === 'raw' ? (
            <pre className="code">{pretty.text}</pre>
          ) : (
            <pre className="code">
              <code>
                {lines.map((line, index) => (
                  <span className="code-line" key={index}>
                    <span className="ln">{index + 1}</span>
                    <span>{line === '' ? '\u00a0' : pretty.json ? highlight(line) : line}</span>
                  </span>
                ))}
              </code>
            </pre>
          )}
        </div>
      ) : (
        <div className="response-body">
          <div className="resp-headers">
            {Object.entries(response.headers)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
                <div className="resp-header-row" key={key}>
                  <span className="resp-key">{key}</span>
                  <span className="resp-value">{value}</span>
                </div>
              ))}
            {Object.keys(response.headers).length === 0 && <p className="empty-body">No response headers.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function highlight(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let index = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(line)) !== null) {
    if (match.index > index) nodes.push(line.slice(index, match.index));

    if (match[1] !== undefined) {
      nodes.push(
        <span className={match[2] !== undefined ? 'tok-key' : 'tok-string'} key={key++}>
          {match[1]}
        </span>,
      );
      if (match[2]) nodes.push(match[2]);
    } else if (match[3] !== undefined) {
      nodes.push(
        <span className="tok-number" key={key++}>
          {match[3]}
        </span>,
      );
    } else {
      nodes.push(
        <span className="tok-literal" key={key++}>
          {match[4]}
        </span>,
      );
    }
    index = match.index + match[0].length;
  }

  if (index < line.length) nodes.push(line.slice(index));
  return nodes;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
