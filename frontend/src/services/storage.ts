import type { ApiRequest, Collection, KeyValue, RequestHistory, Theme } from '../types';
import { HTTP_METHODS, newRequest } from './request';

const COLLECTIONS_KEY = 'api-lab.collections';
const HISTORY_KEY = 'api-lab.history';
const THEME_KEY = 'api-lab.theme';
const HISTORY_LIMIT = 50;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or disabled; the app still works without it.
  }
}

function normalizeRow(raw: KeyValue): KeyValue {
  return {
    id: typeof raw?.id === 'string' ? raw.id : crypto.randomUUID(),
    key: typeof raw?.key === 'string' ? raw.key : '',
    value: typeof raw?.value === 'string' ? raw.value : '',
    enabled: raw?.enabled !== false,
  };
}

function normalizeRows(raw: unknown): KeyValue[] {
  return Array.isArray(raw) ? raw.filter((row): row is KeyValue => !!row && typeof row === 'object').map(normalizeRow) : [];
}

function normalizeRequest(raw: ApiRequest, collectionId: string | null): ApiRequest {
  const base = newRequest(collectionId);
  return {
    ...base,
    ...raw,
    id: typeof raw.id === 'string' ? raw.id : base.id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : base.name,
    method: HTTP_METHODS.includes(raw.method) ? raw.method : 'GET',
    url: typeof raw.url === 'string' ? raw.url : '',
    params: normalizeRows(raw.params),
    headers: normalizeRows(raw.headers),
    body: { ...base.body, ...raw.body, form: normalizeRows(raw.body?.form) },
    auth: { ...base.auth, ...raw.auth },
    collectionId,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : base.updatedAt,
  };
}

function normalizeCollection(raw: Collection): Collection {
  const id = typeof raw.id === 'string' ? raw.id : crypto.randomUUID();
  return {
    id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Untitled collection',
    requests: Array.isArray(raw.requests)
      ? raw.requests.filter((req): req is ApiRequest => !!req && typeof req === 'object').map((req) => normalizeRequest(req, id))
      : [],
  };
}

export function loadCollections(): Collection[] | null {
  const data = read<unknown>(COLLECTIONS_KEY);
  if (!Array.isArray(data)) return null;
  return data
    .filter((entry): entry is Collection => !!entry && typeof entry === 'object' && Array.isArray((entry as Collection).requests))
    .map(normalizeCollection);
}

export function saveCollections(collections: Collection[]): void {
  write(COLLECTIONS_KEY, collections);
}

export function loadHistory(): RequestHistory[] {
  const data = read<unknown>(HISTORY_KEY);
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (entry): entry is RequestHistory =>
        !!entry && typeof entry === 'object' && typeof (entry as RequestHistory).time === 'number' && !!(entry as RequestHistory).request,
    )
    .map((entry) => ({ ...entry, request: normalizeRequest(entry.request, entry.request.collectionId ?? null) }))
    .slice(0, HISTORY_LIMIT);
}

export function saveHistory(history: RequestHistory[]): void {
  write(HISTORY_KEY, history.slice(0, HISTORY_LIMIT));
}

export function loadTheme(): Theme | null {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'light' || theme === 'dark' ? theme : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage failures; the theme just will not persist.
  }
}

export function exportData(collections: Collection[]): string {
  return JSON.stringify({ app: 'api-lab', version: 1, collections }, null, 2);
}

export function downloadJson(filename: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Accepts either an exported workspace file or a single collection. */
export function parseImport(text: string): Collection[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const entries = extractEntries(data);
  if (!entries) return null;

  return entries.map((entry) => {
    const collectionId = crypto.randomUUID();
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name : 'Imported collection';
    const requests = Array.isArray(entry.requests)
      ? entry.requests.filter((req): req is ApiRequest => !!req && typeof req === 'object')
      : [];
    return {
      id: collectionId,
      name,
      requests: requests.map((req) => ({ ...normalizeRequest(req, collectionId), id: crypto.randomUUID() })),
    };
  });
}

function extractEntries(data: unknown): { name?: unknown; requests?: unknown }[] | null {
  if (Array.isArray(data)) return data as { name?: unknown; requests?: unknown }[];
  if (!data || typeof data !== 'object') return null;
  const file = data as Record<string, unknown>;
  if (Array.isArray(file.collections)) return file.collections as { name?: unknown; requests?: unknown }[];
  if (Array.isArray(file.requests)) return [{ name: file.name, requests: file.requests }];
  return null;
}

/** Collections shown the first time the app opens. */
export function exampleCollections(): Collection[] {
  const examples: Collection[] = [
    { id: crypto.randomUUID(), name: 'JSONPlaceholder', requests: [] },
    { id: crypto.randomUUID(), name: 'GitHub', requests: [] },
  ];

  const listUsers = newRequest(examples[0].id);
  examples[0].requests.push({
    ...listUsers,
    name: 'List users',
    url: 'https://jsonplaceholder.typicode.com/users',
  });

  const createPost = newRequest(examples[0].id);
  examples[0].requests.push({
    ...createPost,
    name: 'Create post',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    body: {
      type: 'json',
      text: '{\n  "title": "Hello from API Lab",\n  "body": "This request was sent from a local workspace.",\n  "userId": 1\n}',
      form: createPost.body.form,
    },
  });

  const zen = newRequest(examples[1].id);
  examples[1].requests.push({
    ...zen,
    name: 'Zen quote',
    url: 'https://api.github.com/zen',
  });

  return examples;
}
