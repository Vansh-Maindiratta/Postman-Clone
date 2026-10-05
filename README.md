# API Lab

A lightweight, browser-based API client for building and testing HTTP requests. No accounts, no sync, no clutter — open it and send a request.

## Features

- GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS requests
- Query parameters, headers, JSON/text/form bodies, and auth (Bearer, Basic, API Key)
- Response status, timing, size, headers, and pretty-printed JSON
- Collections with save, rename, duplicate, and delete
- Request history and fast search across saved requests
- Import/export collections as JSON
- Light and dark themes, keyboard shortcuts, local storage persistence
- Small CORS proxy for APIs that block browser requests

## Architecture


Frontend — React + TypeScript + Vite
        │
        ▼  static assets
     Vercel
        │
        │  /proxy (only when a target API blocks the browser with CORS)
        ▼
Backend — Node.js + Express (CORS proxy)
        │
        ▼
     Render


- Frontend: React 19 + TypeScript + Vite 7, plain CSS, no router, no state library
- Backend: Node.js + Express 5 — one `/proxy` endpoint plus a health check
- The two apps deploy independently and know each other only through URLs

### Repository structure

.
├── frontend/            # React + Vite app (Vercel)
│   ├── src/
│   ├── package.json
│   ├── .env.example
│   ├── index.html
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/             # Express CORS proxy (Render)
│   ├── src/server.js
│   ├── package.json
│   └── .env.example
├── render.yaml          # Render Blueprint for the backend
├── package.json         # npm workspaces + concurrently dev script
├── README.md
└── .gitignore
```

## Local setup

Requires Node.js 22.9+ (the dev script uses `--env-file-if-exists`).

```bash
npm install        # installs both workspaces
npm run dev        # backend on :3001 + frontend on :5173, via concurrently
```

Or run each side separately:

```bash
cd frontend && npm run dev 
cd backend  && npm run dev   

No configuration is needed locally: the Vite dev server forwards `/proxy` to
the backend for you (see `frontend/vite.config.ts`).

Other scripts:

```bash
npm run build      
npm run typecheck  
npm start          
```

## Environment variables

Each workspace has its own `.env` file — copy the example and edit it.
`.env` files are gitignored; only the `.example` templates are committed.

### `frontend/.env` (build time, PUBLIC — baked into the bundle, no secrets)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | production only | Base URL of the deployed backend, e.g. `https://your-backend.onrender.com`. Leave unset locally. |

### `backend/.env` (runtime, backend only)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | no | `3001` | Proxy port. Render sets this automatically — do not set it on Render. |
| `CLIENT_URL` | production | `http://localhost:5173` | Browser origin(s) allowed to call the proxy (CORS). Comma-separated for several, e.g. `CLIENT_URL=https://your-frontend.vercel.app,https://preview-xyz.vercel.app`. |

## Deployment

The frontend and backend deploy independently.

### Frontend — Vercel

- Root Directory: `frontend`
- Framework Preset: Vite (auto-detected)
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: `VITE_API_URL=https://<your-render-service>`

No `vercel.json` is needed: the app is a single page with no client-side
routes, and Vercel serves the Vite `dist/` output as-is.

### Backend — Render

Either use the included `render.yaml` Blueprint (repo root), or create a Web
Service manually:

- Root Directory: `backend`
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Environment Variables: `CLIENT_URL=https://<your-vercel-frontend>`

The server binds to `0.0.0.0` and reads `PORT` from the environment, as
container platforms require. `GET /api/health` returns `{"status":"ok"}`.

Without `VITE_API_URL`, direct requests still work in the deployed frontend;
only the CORS-proxy fallback needs the deployed backend. Local defaults need
no configuration — see `frontend/.env.example` and `backend/.env.example`.

## Contributing

### Issue 1 — PUT and PATCH are not implemented

PUT and PATCH appear in the method selector and can be saved into collections,
but the request execution layer does not handle them: sending one fails with
*"not implemented yet"*. The fix is small and a good first contribution.

- Look at `HANDLED_METHODS` in `frontend/src/services/request.ts`.
- The UI and saved state already support these methods — only the send path is missing.

### Issue 2 — GET and DELETE are swapped

A GET request executes DELETE behavior, and a DELETE request executes GET
behavior. The selector keeps showing the method you chose, so the symptom only
appears in the response (for example, a GET to `https://httpbin.org/get` returns
`405 Method Not Allowed`, because a DELETE actually went out).

- Look at `swapMethod` in `frontend/src/services/request.ts`.
- Remove or fix the swap so the selected method reaches the network unchanged.

### Where to look

- `frontend/src/services/request.ts` — `sendRequest`, `HANDLED_METHODS`, `swapMethod`, `HTTP_METHODS`.
- `backend/src/server.js` — `/proxy` endpoint (CORS fallback for APIs that block browser requests).

Good first contributions: fix the GET/DELETE swap, implement PUT/PATCH, improve
response viewer details, polish empty states, add keyboard shortcuts, improve
accessibility, improve the mobile collection panel.
