import { useMemo, useRef, useState } from 'react';
import type { ApiRequest, Collection, RequestHistory } from '../../types';
import { IconChevron, IconCopy, IconPencil, IconPlus, IconTrash } from '../ui/icons';

interface CollectionPanelProps {
  collections: Collection[];
  history: RequestHistory[];
  query: string;
  activeId: string | null;
  open: boolean;
  onOpenRequest: (request: ApiRequest) => void;
  onRestoreHistory: (request: ApiRequest) => void;
  onClearHistory: () => void;
  onNewRequest: (collectionId: string) => void;
  onNewCollection: (name: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (collection: Collection) => void;
  onRenameRequest: (id: string, name: string) => void;
  onDuplicateRequest: (id: string) => void;
  onDeleteRequest: (request: ApiRequest) => void;
}

type Editing = { type: 'collection' | 'request'; id: string; name: string };

export default function CollectionPanel(props: CollectionPanelProps) {
  const { collections, history, query, activeId, open, onOpenRequest } = props;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Editing | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const skipBlur = useRef(false);

  const trimmed = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmed) return null;
    const matches: { collection: Collection; request: ApiRequest }[] = [];
    for (const collection of collections) {
      const nameMatches = collection.name.toLowerCase().includes(trimmed);
      for (const request of collection.requests) {
        if (nameMatches || request.name.toLowerCase().includes(trimmed) || request.url.toLowerCase().includes(trimmed)) {
          matches.push({ collection, request });
        }
      }
    }
    return matches;
  }, [collections, trimmed]);

  function toggleCollapsed(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEditing(type: Editing['type'], id: string, name: string) {
    skipBlur.current = false;
    setEditing({ type, id, name });
  }

  function applyRename(value: string) {
    const trimmedValue = value.trim();
    if (!editing || !trimmedValue) return;
    if (editing.type === 'collection') props.onRenameCollection(editing.id, trimmedValue);
    else props.onRenameRequest(editing.id, trimmedValue);
  }

  function renameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      skipBlur.current = true;
      setEditing(null);
      return;
    }
    if (event.key !== 'Enter') return;
    applyRename(event.currentTarget.value);
    setEditing(null);
  }

  function renameBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (skipBlur.current) {
      skipBlur.current = false;
      return;
    }
    applyRename(event.currentTarget.value);
    setEditing(null);
  }

  function submitNewCollection(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    props.onNewCollection(name);
    setNewName('');
    setCreating(false);
  }

  return (
    <aside className={`panel${open ? ' open' : ''}`} aria-label="Collections">
      <div className="panel-head">
        <span className="panel-title">{trimmed ? 'Results' : 'Collections'}</span>
        {!trimmed && <span className="collection-count">{collections.reduce((total, c) => total + c.requests.length, 0)}</span>}
      </div>

      <div className="panel-body">
        {trimmed ? (
          results && results.length > 0 ? (
            <ul className="search-results">
              {results.map(({ collection, request }) => (
                <li key={request.id}>
                  <button type="button" className="result-row" onClick={() => onOpenRequest(request)}>
                    <span className="result-row-top">
                      <span className={`method-chip m-${request.method.toLowerCase()}`}>{request.method}</span>
                      <span className="result-name">{request.name}</span>
                    </span>
                    <span className="result-meta">
                      {collection.name} · {request.url || 'no url'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-empty">No requests match “{query.trim()}”.</p>
          )
        ) : (
          <>
            {collections.map((collection) => {
              const isCollapsed = collapsed.has(collection.id);
              const isRenaming = editing?.type === 'collection' && editing.id === collection.id;
              return (
                <div className={`collection${isCollapsed ? ' collapsed' : ''}`} key={collection.id}>
                  <div className="collection-head">
                    {isRenaming ? (
                      <input
                        className="rename-input"
                        defaultValue={editing.name}
                        autoFocus
                        aria-label="Collection name"
                        onKeyDown={renameKeyDown}
                        onBlur={renameBlur}
                      />
                    ) : (
                      <button
                        type="button"
                        className="collection-toggle"
                        onClick={() => toggleCollapsed(collection.id)}
                        aria-expanded={!isCollapsed}
                      >
                        <IconChevron />
                        <span className="collection-name">{collection.name}</span>
                        <span className="collection-count">{collection.requests.length}</span>
                      </button>
                    )}
                    {!isRenaming && (
                      <span className="row-actions">
                        <button
                          type="button"
                          className="icon-btn xs"
                          onClick={() => props.onNewRequest(collection.id)}
                          aria-label={`Add request to ${collection.name}`}
                          title="Add request"
                        >
                          <IconPlus />
                        </button>
                        <button
                          type="button"
                          className="icon-btn xs"
                          onClick={() => startEditing('collection', collection.id, collection.name)}
                          aria-label={`Rename ${collection.name}`}
                          title="Rename"
                        >
                          <IconPencil />
                        </button>
                        <button
                          type="button"
                          className="icon-btn xs"
                          onClick={() => props.onDeleteCollection(collection)}
                          aria-label={`Delete ${collection.name}`}
                          title="Delete"
                        >
                          <IconTrash />
                        </button>
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <ul className="collection-requests">
                      {collection.requests.length === 0 && <li className="req-empty">No requests yet</li>}
                      {collection.requests.map((request) => {
                        const isEditingRequest = editing?.type === 'request' && editing.id === request.id;
                        return (
                          <li className={`req-row${request.id === activeId ? ' active' : ''}`} key={request.id}>
                            {isEditingRequest ? (
                              <input
                                className="rename-input"
                                defaultValue={editing.name}
                                autoFocus
                                aria-label="Request name"
                                onKeyDown={renameKeyDown}
                                onBlur={renameBlur}
                              />
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="req-open"
                                  onClick={() => onOpenRequest(request)}
                                  title={request.url || 'No URL yet'}
                                >
                                  <span className={`method-chip m-${request.method.toLowerCase()}`}>{request.method}</span>
                                  <span className="req-name">{request.name}</span>
                                </button>
                                <span className="row-actions">
                                  <button
                                    type="button"
                                    className="icon-btn xs"
                                    onClick={() => startEditing('request', request.id, request.name)}
                                    aria-label={`Rename ${request.name}`}
                                    title="Rename"
                                  >
                                    <IconPencil />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-btn xs"
                                    onClick={() => props.onDuplicateRequest(request.id)}
                                    aria-label={`Duplicate ${request.name}`}
                                    title="Duplicate"
                                  >
                                    <IconCopy />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-btn xs"
                                    onClick={() => props.onDeleteRequest(request)}
                                    aria-label={`Delete ${request.name}`}
                                    title="Delete"
                                  >
                                    <IconTrash />
                                  </button>
                                </span>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}

            {collections.length === 0 && <p className="panel-empty">No collections yet. Create one to start saving requests.</p>}

            {history.length > 0 && (
              <section className="history">
                <div className="panel-head">
                  <span className="panel-title">Recent</span>
                  <button type="button" className="link-btn" onClick={props.onClearHistory}>
                    Clear
                  </button>
                </div>
                <ul className="history-list">
                  {history.slice(0, 12).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="history-row"
                        onClick={() => props.onRestoreHistory(item.request)}
                        title={item.request.url || 'No URL'}
                      >
                        <span className={`method-chip m-${item.request.method.toLowerCase()}`}>{item.request.method}</span>
                        <span className="history-path">{shortPath(item.request.url)}</span>
                        <span className="history-time">
                          {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {!trimmed && (
        <div className="panel-foot">
          {creating ? (
            <form className="new-collection" onSubmit={submitNewCollection}>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setCreating(false);
                }}
                placeholder="Collection name"
                aria-label="New collection name"
                autoFocus
              />
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </form>
          ) : (
            <button type="button" className="btn btn-dashed" onClick={() => setCreating(true)}>
              <IconPlus />
              New collection
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

function shortPath(url: string): string {
  if (!url) return '(no url)';
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}
