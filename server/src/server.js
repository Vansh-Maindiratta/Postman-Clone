// Browsers block many cross-origin API calls (CORS). This endpoint forwards a
// request server-side and passes the target's response straight back.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT) || 3001;
const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

app.all('/proxy', async (req, res) => {
  const target = req.query.url;

  if (typeof target !== 'string' || !/^https?:\/\//i.test(target)) {
    res.status(400).json({ error: 'A valid http(s) url parameter is required.' });
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];
  delete headers['accept-encoding'];

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
  } catch {
    res.setHeader('x-api-lab-proxy-error', '1');
    res.status(502).json({ error: 'The target server could not be reached.' });
    return;
  }

  // The body we receive is already decoded, so the encoding/framing headers
  // from the target no longer describe it.
  const dropped = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'];
  for (const [key, value] of upstream.headers) {
    if (!dropped.includes(key)) res.setHeader(key, value);
  }
  const cookies = upstream.headers.getSetCookie();
  if (cookies.length > 0) res.setHeader('set-cookie', cookies);
  res.setHeader('x-api-lab-proxy', '1');

  const body = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status);
  res.end(body.length > 0 ? body : undefined);
});

app.use(express.static(distPath));

app.listen(port, () => {
  console.log(`API Lab proxy listening on http://localhost:${port}`);
});
