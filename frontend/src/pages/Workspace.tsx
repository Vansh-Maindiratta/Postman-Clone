import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiRequest, ApiResponse, Collection, RequestHistory, Theme } from '../types';
import { RequestError, newRequest, sendRequest } from '../services/request';
import {
  downloadJson,
  exampleCollections,
  exportData,
  loadCollections,
  loadHistory,
  parseImport,
  saveCollections,
  saveHistory,
} from '../services/storage';
import Topbar from '../components/layout/Topbar';
import CollectionPanel from '../components/layout/CollectionPanel';
import StatusBar from '../components/layout/StatusBar';
import RequestEditor from '../components/request/RequestEditor';
import ResponseViewer from '../components/response/ResponseViewer';
import SaveDialog from '../components/request/SaveDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface WorkspaceProps {
  theme: Theme;
  onToggleTheme: () => void;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface Notice {
  text: string;
  tone: 'info' | 'error';
}

/** Inserts a request into its collection, replacing any previous copy. */
function upsertRequest(collections: Collection[], request: ApiRequest): Collection[] {
  const without = collections.map((collection) => ({
    ...collection,
    requests: collection.requests.filter((item) => item.id !== request.id),
  }));
  return without.map((collection) =>
    collection.id === request.collectionId ? { ...collection, requests: [...collection.requests, request] } : collection,
  );
}

export default function Workspace({ theme, onToggleTheme }: WorkspaceProps) {
  const [collections, setCollections] = useState<Collection[]>(() => loadCollections() ?? exampleCollections());
  const [history, setHistory] = useState<RequestHistory[]>(() => loadHistory());
  const [draft, setDraft] = useState<ApiRequest | null>(null);
  const [edited, setEdited] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [split, setSplit] = useState(50);

  const abortRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const isSaved = draft !== null && collections.some((c) => c.requests.some((r) => r.id === draft.id));
  const dirty = draft !== null && (edited || !isSaved);

  useEffect(() => saveCollections(collections), [collections]);
  useEffect(() => saveHistory(history), [history]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  function clearResponse() {
    setResponse(null);
    setSendError(null);
  }

  function replaceDraft(next: ApiRequest | null) {
    const apply = () => {
      setDraft(next);
      setEdited(false);
      clearResponse();
    };

    if (dirty && draft) {
      setConfirm({
        title: 'Discard unsaved changes?',
        message: `"${draft.name}" has changes that were never saved.`,
        confirmLabel: 'Discard',
        onConfirm: () => {
          apply();
          setConfirm(null);
        },
      });
      return;
    }
    apply();
  }

  const updateDraft = useCallback((patch: Partial<ApiRequest>) => {
    setDraft((current) => (current ? { ...current, ...patch, updatedAt: Date.now() } : current));
    setEdited(true);
  }, []);

  const send = useCallback(async () => {
    if (!draft || sending) return;
    setSending(true);
    setResponse(null);
    setSendError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await sendRequest(draft, controller.signal);
      setResponse(result);
      setHistory((current) =>
        [{ id: crypto.randomUUID(), time: Date.now(), request: structuredClone(draft) }, ...current].slice(0, 50),
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setSendError(error instanceof RequestError ? error.message : 'Could not send request.');
      }
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }, [draft, sending]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        void send();
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (draft) setSaveOpen(true);
      } else if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [send, draft]);

  // Requests

  function openRequest(request: ApiRequest) {
    if (draft && request.id === draft.id) return;
    replaceDraft(structuredClone(request));
    setSidebarOpen(false);
  }

  function newDraft() {
    replaceDraft(newRequest(null));
    setSidebarOpen(false);
  }

  function commitSave(name: string, collectionId: string) {
    if (!draft) return;
    const saved: ApiRequest = { ...structuredClone(draft), name, collectionId, updatedAt: Date.now() };
    setCollections((current) => upsertRequest(current, saved));
    setDraft(saved);
    setEdited(false);
    setSaveOpen(false);
  }

  function addRequestToCollection(collectionId: string) {
    const request = newRequest(collectionId);
    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId ? { ...collection, requests: [...collection.requests, request] } : collection,
      ),
    );
    replaceDraft(structuredClone(request));
    setSidebarOpen(false);
  }

  function renameRequest(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCollections((current) =>
      current.map((collection) => ({
        ...collection,
        requests: collection.requests.map((item) =>
          item.id === id ? { ...item, name: trimmed, updatedAt: Date.now() } : item,
        ),
      })),
    );
    setDraft((current) => (current && current.id === id ? { ...current, name: trimmed } : current));
  }

  function duplicateRequest(id: string) {
    setCollections((current) =>
      current.map((collection) => {
        const index = collection.requests.findIndex((item) => item.id === id);
        if (index === -1) return collection;
        const source = collection.requests[index];
        const copy: ApiRequest = {
          ...structuredClone(source),
          id: crypto.randomUUID(),
          name: `${source.name} Copy`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const requests = [...collection.requests];
        requests.splice(index + 1, 0, copy);
        return { ...collection, requests };
      }),
    );
  }

  function deleteRequest(request: ApiRequest) {
    setConfirm({
      title: `Delete "${request.name}"?`,
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        setCollections((current) =>
          current.map((collection) => ({ ...collection, requests: collection.requests.filter((r) => r.id !== request.id) })),
        );
        setConfirm(null);
      },
    });
  }

  // Collections

  function createCollection(name: string): string {
    const collection: Collection = { id: crypto.randomUUID(), name: name.trim() || 'New collection', requests: [] };
    setCollections((current) => [...current, collection]);
    return collection.id;
  }

  function renameCollection(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCollections((current) =>
      current.map((collection) => (collection.id === id ? { ...collection, name: trimmed } : collection)),
    );
  }

  function deleteCollection(collection: Collection) {
    const count = collection.requests.length;
    setConfirm({
      title: `Delete "${collection.name}"?`,
      message: `This removes the collection and its ${count} saved request${count === 1 ? '' : 's'}. This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        setCollections((current) => current.filter((item) => item.id !== collection.id));
        setDraft((current) => (current && current.collectionId === collection.id ? { ...current, collectionId: null } : current));
        setConfirm(null);
      },
    });
  }

  // Import / export

  async function importFile(file: File) {
    try {
      const imported = parseImport(await file.text());
      if (!imported || imported.length === 0) {
        setNotice({ text: 'Import failed. That file is not a valid API Lab export.', tone: 'error' });
        return;
      }
      setCollections((current) => [...current, ...imported]);
      setNotice({
        text: `Imported ${imported.length} collection${imported.length === 1 ? '' : 's'}.`,
        tone: 'info',
      });
    } catch {
      setNotice({ text: 'Import failed. The file could not be read.', tone: 'error' });
    }
  }

  function exportAll() {
    downloadJson('api-lab-collections.json', exportData(collections));
    setNotice({ text: `Exported ${collections.length} collection${collections.length === 1 ? '' : 's'}.`, tone: 'info' });
  }

  // Editor / response divider

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();

    function onMove(moveEvent: PointerEvent) {
      const rect = mainRef.current?.getBoundingClientRect();
      if (!rect) return;
      const percent = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      setSplit(Math.min(80, Math.max(20, percent)));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function resizeByKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSplit((current) => Math.max(20, current - 2));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSplit((current) => Math.min(80, current + 2));
    }
  }

  return (
    <div className="app">
      <Topbar
        query={query}
        onQueryChange={setQuery}
        searchRef={searchRef}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onNewRequest={newDraft}
        onImport={importFile}
        onExport={exportAll}
      />

      <div className="workspace">
        {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

        <CollectionPanel
          collections={collections}
          history={history}
          query={query}
          activeId={draft?.id ?? null}
          open={sidebarOpen}
          onOpenRequest={openRequest}
          onRestoreHistory={openRequest}
          onClearHistory={() => setHistory([])}
          onNewRequest={addRequestToCollection}
          onNewCollection={createCollection}
          onRenameCollection={renameCollection}
          onDeleteCollection={deleteCollection}
          onRenameRequest={renameRequest}
          onDuplicateRequest={duplicateRequest}
          onDeleteRequest={deleteRequest}
        />

        <main className="main" ref={mainRef}>
          {draft ? (
            <>
              <div className="editor-zone" style={{ flexBasis: `${split}%` }}>
                <RequestEditor request={draft} sending={sending} onChange={updateDraft} onSend={send} onSave={() => setSaveOpen(true)} />
              </div>

              <div
                className="divider"
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize editor and response"
                aria-valuenow={Math.round(split)}
                tabIndex={0}
                onPointerDown={startResize}
                onKeyDown={resizeByKey}
              />

              <div className="response-zone">
                <ResponseViewer response={response} error={sendError} sending={sending} onCancel={cancel} />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h1>Ready to test an API?</h1>
              <p>Create a request or choose one from your collections.</p>
              <button type="button" className="btn btn-primary" onClick={newDraft}>
                New Request
              </button>
            </div>
          )}
        </main>
      </div>

      <StatusBar request={draft} dirty={dirty} notice={notice} />

      {saveOpen && draft && (
        <SaveDialog
          collections={collections}
          defaultName={draft.name}
          defaultCollectionId={draft.collectionId}
          onSave={commitSave}
          onCreateCollection={createCollection}
          onClose={() => setSaveOpen(false)}
        />
      )}

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
