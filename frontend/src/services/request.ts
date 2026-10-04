import type { ApiRequest, ApiResponse, AuthConfig, HttpMethod, KeyValue } from '../types';

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const TIMEOUT_MS = 30_000;
const BODYLESS_METHODS = new Set<HttpMethod>(['GET', 'HEAD']);

// Base URL of the deployed proxy backend (Render), from the Vite env var.
// Empty by default: in local development the Vite dev server forwards /proxy
// to the backend for us, so the relative URL below just works.
const PROXY_BASE = String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

// Methods the execution layer knows how to send. PUT and PATCH are still on the
// TODO list — they show up in the selector, but nothing handles them yet.
const HANDLED_METHODS = new Set<HttpMethod>(['GET', 'POST', 'DELETE', 'HEAD', 'OPTIONS']);

/** Deliberate contributor issue: GET executes DELETE and DELETE executes GET.
 *
 * The method is deliberately swapped before the request is sent so contributors
 * can observe the misbehavior, then fix it. The UI selector keeps the method
 * the user chose; only what reaches the network is swapped.
 */
function swapMethod(method: HttpMethod): HttpMethod {
  if (method === 'GET') return 'DELETE';
  if (method === 'DELETE') return 'GET';
  return method;
}

// Phrases for servers that reply without a reason (e.g. over HTTP/2).
const REASON_PHRASES: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  409: 'Conflict',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

/** An error whose message is written for humans and safe to show in the UI. */
export class RequestError extends Error {}

function emptyRow(): KeyValue {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true };
}

export function newRequest(collectionId: string | null): ApiRequest {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Request',
    method: 'GET',
    url: '',
    params: [emptyRow()],
    headers: [emptyRow()],
    body: { type: 'none', text: '', form: [emptyRow()] },
    auth: { type: 'none', token: '', username: '', password: '', keyName: '', keyValue: '' },
    collectionId,
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveUrl(request: ApiRequest): string {
  const raw = request.url.trim();
  if (!raw) throw new RequestError('Enter a request URL.');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RequestError(
      'That is not a valid URL.\n\nInclude the protocol, for example https://api.example.com/users.',
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RequestError(`Unsupported protocol: ${url.protocol}\n\nOnly http:// and https:// URLs can be sent.`);
  }

  for (const param of request.params) {
    if (param.enabled && param.key.trim()) url.searchParams.append(param.key.trim(), param.value);
  }
  return url.toString();
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function applyAuth(headers: Record<string, string>, auth: AuthConfig): void {
  if (auth.type === 'bearer') {
    if (!auth.token.trim()) {
      throw new RequestError('Missing bearer token.\n\nAdd a token on the Auth tab, or switch to No Auth.');
    }
    headers.Authorization = `Bearer ${auth.token.trim()}`;
  }

  if (auth.type === 'basic') {
    if (!auth.username && !auth.password) {
      throw new RequestError('Missing credentials.\n\nAdd a username or password on the Auth tab.');
    }
    headers.Authorization = `Basic ${encodeBase64(`${auth.username}:${auth.password}`)}`;
  }

  if (auth.type === 'apikey') {
    if (!auth.keyName.trim()) {
      throw new RequestError('Missing API key name.\n\nAdd a header name on the Auth tab.');
    }
    headers[auth.keyName.trim()] = auth.keyValue;
  }
}

function buildHeaders(request: ApiRequest, contentType: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  const used = new Set<string>();

  for (const header of request.headers) {
    const key = header.key.trim();
    if (!header.enabled || !key) continue;
    headers[key] = header.value;
    used.add(key.toLowerCase());
  }

  if (contentType && !used.has('content-type')) headers['Content-Type'] = contentType;
  applyAuth(headers, request.auth);
  return headers;
}

interface PreparedBody {
  payload?: string | FormData;
  contentType?: string;
}

function buildBody(request: ApiRequest): PreparedBody {
  const { body, method } = request;
  if (body.type === 'none' || BODYLESS_METHODS.has(method)) return {};

  if (body.type === 'json') {
    if (!body.text.trim()) return {};
    try {
      JSON.parse(body.text);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Check the syntax and try again.';
      throw new RequestError(`Invalid JSON.\n\n${detail}`);
    }
    return { payload: body.text, contentType: 'application/json; charset=utf-8' };
  }

  if (body.type === 'text') {
    if (!body.text) return {};
    return { payload: body.text, contentType: 'text/plain; charset=utf-8' };
  }

  const form = new FormData();
  for (const field of body.form) {
    if (field.enabled && field.key.trim()) form.append(field.key.trim(), field.value);
  }
  return form.keys().next().done ? {} : { payload: form };
}

export async function sendRequest(request: ApiRequest, userSignal?: AbortSignal): Promise<ApiResponse> {
  const url = resolveUrl(request);
  if (!HANDLED_METHODS.has(request.method)) {
    throw new RequestError(
      `${request.method} is not implemented yet.\n\nThis is a known gap — see the README if you would like to contribute a fix.`,
    );
  }
  const { payload, contentType } = buildBody(request);
  // Deliberate bug: GET and DELETE execute each other's behavior.
  const method = swapMethod(request.method);
  const init: RequestInit = { method, headers: buildHeaders(request, contentType) };
  if (payload !== undefined) init.body = payload;

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const signal = userSignal
    ? AbortSignal.any([userSignal, timeout.signal])
    : timeout.signal;

  const abortError = () =>
    new RequestError(
      timeout.signal.aborted && !userSignal?.aborted
        ? 'Request timed out.\n\nThe server took too long to respond.'
        : 'Request cancelled.',
    );

  try {
    const started = performance.now();
    let response: Response;

    try {
      response = await fetch(url, { ...init, signal });
    } catch {
      if (signal.aborted) throw abortError();
      // The browser blocked the request (usually CORS) or it never left this
      // machine. Retry through the local proxy before giving up.
      try {
        response = await fetch(`${PROXY_BASE}/proxy?url=${encodeURIComponent(url)}`, { ...init, signal });
        if (response.headers.get('x-api-lab-proxy-error')) {
          throw new RequestError('Could not reach the target server.\n\nCheck the URL and the server address.');
        }
        // Only a real proxy response may be shown as the target API's response.
        // Anything without our header (for example a hosting platform's 404
        // page) means the proxy route does not exist.
        if (!response.headers.get('x-api-lab-proxy')) {
          throw new RequestError(
            'The API Lab proxy is unavailable.\n\nFor local development, start the backend with "npm run dev". In production, check that VITE_API_URL points to the deployed backend.',
          );
        }
      } catch (proxyError) {
        if (signal.aborted) throw abortError();
        if (proxyError instanceof RequestError) throw proxyError;
        throw new RequestError(
          'Could not send request.\n\nCheck the URL and your connection. If the API blocks browser requests (CORS), run "npm run dev" to start the local proxy and try again.',
        );
      }
    }

    const text = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText || REASON_PHRASES[response.status] || '',
      headers,
      body: text,
      size: new Blob([text]).size,
      duration: Math.round(performance.now() - started),
      contentType: response.headers.get('content-type') ?? '',
    };
  } finally {
    clearTimeout(timer);
  }
}
