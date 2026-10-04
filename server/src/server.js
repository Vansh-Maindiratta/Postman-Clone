// Browsers block many cross-origin API calls (CORS). This endpoint forwards a
// request server-side and passes the target's response straight back.
import express from 'express';
import { isIPv4, isIPv6 } from 'node:net';

const app = express();
const port = Number(process.env.PORT) || 3001;
// Browser origin allowed to call the proxy: the local Vite server by default,
// the deployed Vercel frontend in production (CLIENT_URL).
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 10 * 1024 * 1024;

app.disable('x-powered-by');

// CORS so the frontend, which is a different origin in production, can use the
// proxy. Preflights are answered here; a plain OPTIONS request (the user picked
// OPTIONS as the request method) is still forwarded to the target.
app.use((req, res, next) => {
  res.setHeader('access-control-allow-origin', clientUrl);
  res.setHeader('vary', 'Origin');
  res.setHeader('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
  res.setHeader(
    'access-control-allow-headers',
    req.headers['access-control-request-headers'] || 'Content-Type, Authorization, Accept',
  );
  // The frontend reads these two headers to tell a real proxy response from
  // anything else (for example a hosting platform's 404 page).
  res.setHeader('access-control-expose-headers', 'x-api-lab-proxy, x-api-lab-proxy-error');

  if (req.method === 'OPTIONS' && req.headers['access-control-request-method']) {
    res.status(204).end();
    return;
  }
  next();
});

// Health check. The React app is built and served separately (Vercel).
app.get('/', (req, res) => {
  res.type('text/plain').send('API Lab proxy is running.');
});

// Lightweight guard: obviously private or local targets are refused.
function isPrivateTarget(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (isIPv4(host)) {
    const [a, b] = host.split('.').map(Number);
    return (
      a === 0 || // "this network"
      a === 10 || // 10.0.0.0/8
      a === 127 || // loopback
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) // 192.168.0.0/16
    );
  }
  if (isIPv6(host)) {
    return (
      host === '::1' ||
      host === '::' ||
      host.startsWith('fe80') || // link-local
      host.startsWith('fc') ||
      host.startsWith('fd') || // unique local
      host.startsWith('::ffff:') // IPv4-mapped, e.g. ::ffff:127.0.0.1
    );
  }
  return false;
}

function proxyError(res, status, message) {
  res.setHeader('x-api-lab-proxy', '1');
  res.status(status).json({ error: message });
}

app.all('/proxy', async (req, res) => {
  const target = req.query.url;

  if (typeof target !== 'string' || !/^https?:\/\//i.test(target)) {
    proxyError(res, 400, 'A valid http(s) url parameter is required.');
    return;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(target);
  } catch {
    proxyError(res, 400, 'A valid http(s) url parameter is required.');
    return;
  }

  if (isPrivateTarget(parsedTarget.hostname)) {
    proxyError(res, 403, 'That target is not allowed. Private and local addresses are blocked.');
    return;
  }

  // Body cap: check the declared length first, then the bytes as they stream in.
  const declaredLength = Number(req.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    proxyError(res, 413, `Request body exceeds the ${MAX_BODY_BYTES} byte limit.`);
    return;
  }

  const chunks = [];
  let received = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > MAX_BODY_BYTES) {
      tooLarge = true; // keep draining the request, but buffer no more of it
      continue;
    }
    chunks.push(chunk);
  }
  if (tooLarge) {
    proxyError(res, 413, `Request body exceeds the ${MAX_BODY_BYTES} byte limit.`);
    return;
  }

  // Forward the caller's headers minus hop-by-hop and browser-identifying
  // ones. authorization, content-type and accept are intentionally preserved.
  const headers = { ...req.headers };
  for (const key of Object.keys(headers)) {
    if (
      key === 'host' ||
      key === 'connection' ||
      key === 'content-length' ||
      key === 'accept-encoding' ||
      key === 'origin' ||
      key === 'referer' ||
      key === 'cookie' ||
      key.startsWith('sec-fetch-') ||
      key.startsWith('x-forwarded-')
    ) {
      delete headers[key];
    }
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    res.setHeader('x-api-lab-proxy', '1');
    res.setHeader('x-api-lab-proxy-error', '1');
    if (error && error.name === 'TimeoutError') {
      res.status(504).json({ error: 'The target server did not respond in time.' });
    } else {
      res.status(502).json({ error: 'The target server could not be reached.' });
    }
    return;
  }

  // The body we receive is already decoded, so the encoding/framing headers
  // from the target no longer describe it. CORS headers are ours, not the
  // target's — forwarding them would override the ones set above.
  const dropped = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'];
  for (const [key, value] of upstream.headers) {
    if (dropped.includes(key) || key.startsWith('access-control-')) continue;
    res.setHeader(key, value);
  }
  const cookies = upstream.headers.getSetCookie();
  if (cookies.length > 0) res.setHeader('set-cookie', cookies);
  res.setHeader('x-api-lab-proxy', '1');

  const body = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status);
  res.end(body.length > 0 ? body : undefined);
});

app.listen(port, () => {
  console.log(`API Lab proxy listening on http://localhost:${port}`);
});
