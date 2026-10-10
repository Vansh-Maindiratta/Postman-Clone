# API Lab — Geekstober Postman Clone

A lightweight, browser-based API client for building and testing HTTP requests — no accounts, no sync, no clutter. Open it and send a request.

API Lab is also the project for the **Geekstober** open-source contribution event. It ships with **intentionally introduced, fully documented bugs** (catalogued in [CONTRIBUTING.md](CONTRIBUTING.md)) so newcomers can make meaningful first pull requests. Some functionality is therefore knowingly imperfect — see [Known limitations](#known-limitations-and-intentional-issues).

> **Note:** the backend is a small CORS proxy, not a full API platform. It does not store data on a server; collections, history, and theme live in your browser's `localStorage`. There is no database, no user accounts, and no server-side authentication.

## Features

All features below are implemented and verified in the current codebase.

Request construction & execution (`frontend/src/services/request.ts`):

- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` selectable in the UI. ⚠️ `GET`/`DELETE` execution is currently swapped and `PUT`/`PATCH` are not implemented in the send path (both are deliberate contribution issues — see the issue catalogue).
- Query parameters and request headers as editable key/value rows, each with an enable/disable checkbox.
- Request bodies: JSON (with live syntax validation), raw text, or form data (`multipart/form-data`, Content-Type set automatically); GET/HEAD correctly refuse bodies.
- Auth helpers: Bearer token, Basic auth, or a named API key header.
- Response display: status line, duration, payload size, Content-Type preview; Body/Headers tabs; a syntax-highlighted JSON viewer; copy-to-clipboard.
- Timeout (30 s) and cancel-in-progress support via `AbortController`.
- Collections with save, rename, duplicate, and delete; request history with restore and a fast search across saved and historical requests.
- Import/export of collections as JSON files.
- Small backend CORS proxy used automatically when an API blocks direct browser requests.
- Light/dark themes, keyboard shortcuts (⌘/Ctrl+Enter send, ⌘/Ctrl+S save, ⌘/Ctrl+K search), `localStorage` persistence.

## Technology stack

- **Frontend:** React 19 + TypeScript 5 + Vite 7, plain CSS, no router, no state-management library.
- **Backend:** Node.js (>= 22.9, required by `--env-file-if-exists` in the dev script) + Express 5.
- **Tooling:** npm workspaces + `concurrently` for a single `npm run dev`.
- **No database. No authentication provider. No state library.** Don't assume otherwise.

## Project structure

```
.
├── backend/                          # Express CORS proxy (deploys to Render)
│   ├── src/server.js                 # /proxy endpoint, /api/health, CORS handling
│   ├── .env.example
│   └── package.json
├── frontend/                         # React + Vite app (deploys to Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/               # Topbar, CollectionPanel, StatusBar
│   │   │   ├── request/              # RequestEditor, BodyEditor, AuthEditor, KeyValueTable, SaveDialog
│   │   │   ├── response/             # ResponseViewer
│   │   │   └── ui/                   # Modal, ConfirmDialog, icons
│   │   ├── pages/Workspace.tsx       # main workspace (state, collections, history, send flow)
│   │   ├── services/
│   │   │   ├── request.ts            # request building and execution
│   │   │   └── storage.ts            # localStorage persistence + import/export
│   │   ├── styles.css
│   │   └── types/index.ts
│   ├── index.html
│   ├── tsconfig.json
│   ├── vite.config.ts                # dev-server proxy: /proxy -> http://localhost:3001
│   └── .env.example
├── render.yaml                       # Render Blueprint for the backend
├── package.json                      # npm workspaces + concurrently dev script
├── CONTRIBUTING.md                   # contributor handbook + full issue catalogue
└── README.md
```

The frontend and backend know each other only through URLs: in development the Vite dev server forwards `/proxy` to the local backend; in production the built frontend calls the deployed backend URL configured via `VITE_API_URL`.

## Prerequisites

- **Node.js ≥ 22.9** (enforced by `engines` in `backend/package.json`; the dev script uses `node --env-file-if-exists`, available from 22.9) and a matching npm.
- No database, no API keys, nothing else required.

## Installation and local development

Workspaces are wired up — a single install and a single dev command cover both apps:

```bash
git clone <your-fork-url> api-lab
cd api-lab
npm install          # installs frontend + backend workspaces together
npm run dev          # backend on :3001, frontend on :5173 via concurrently
```

Or run each side separately:

```bash
cd frontend && npm run dev
cd backend  && npm run dev
```

Open http://localhost:5173 — the Vite dev server forwards `/proxy` to http://localhost:3001 automatically (see `frontend/vite.config.ts`), so no environment configuration is needed locally.

Other scripts:

```bash
npm run build       # typechecks and builds the frontend (output in frontend/dist)
npm run typecheck   # tsc --noEmit for the frontend
npm start           # starts the backend in production mode
```

## Environment variables

Each workspace has its own `.env` file. Only the `.env.example` templates are committed — **never commit real `.env` files.**

### `frontend/.env` (build-time; Vite bakes these into the browser bundle — no secrets)

| Variable | Used by | Purpose | Required | Example |
| --- | --- | --- | --- | --- |
| `VITE_API_URL` | frontend | Base URL of the deployed backend (Render). Leave unset locally; Vite dev-server proxying handles it. | Optional (needed in production for the proxy fallback) | `https://api-lab-backend.onrender.com` |

### `backend/.env` (runtime; server-only)

| Variable | Used by | Purpose | Required | Example |
| --- | --- | --- | --- | --- |
| `PORT` | backend | Port the proxy listens on. | No — defaults to `3001`. Render sets it automatically; don't set it there. | `3001` |
| `CLIENT_URL` | backend | Browser origin(s) allowed to call the proxy (CORS). Comma-separated for several. | No locally — defaults to `http://localhost:5173`. Required in production. | `https://your-frontend.vercel.app` |

## API documentation

The backend exposes exactly two application routes — nothing else is implemented, so nothing else is documented.

### `GET /api/health`

Health check for deployment monitors.

**Request**

```bash
curl http://localhost:3001/api/health
```

**Response** `200 OK`

```json
{ "status": "ok" }
```

### `GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS /proxy?url=<target>`

Forwards the request server-side to `url` and returns the target's response (status, headers, body). Used automatically by the frontend whenever a direct browser request fails (usually CORS).

**Request** (query body forwarded as-is; your request's `Content-Type` and `Authorization` are forwarded)

```bash
curl "http://localhost:3001/proxy?url=https%3A%2F%2Fapi.github.com%2Fzen" \
  -H "Authorization: Bearer <token>" \
  -X POST ...          # POST examples below
```

**Response** — the target's status code, headers, and body, plus `x-api-lab-proxy: 1` (always) so the frontend can tell a real proxy response from a hosting platform's error page.

| Error case | Status | Body |
| --- | --- | --- |
| Missing/invalid `url` parameter | `400` | `{"error": "A valid http(s) url parameter is required."}` |
| Target is private/localhost | `403` | `{"error": "That target is not allowed. Private and local addresses are blocked."}` |
| Body over 10 MB | `413` | `{"error": "Request body exceeds the 10485760 byte limit."}` |
| Target unreachable | `502` | `{"error": "The target server could not be reached."}` |
| Target times out | `504` | `{"error": "The target server did not respond in time."}` |

CORS: only origins listed in `CLIENT_URL` get an `access-control-allow-origin`; preflighted `OPTIONS` requests are answered directly (`204`), while an actual `OPTIONS` *request method* chosen by the user is forwarded to the target.

> There are no mock-API endpoints in this project — mock endpoints are not a feature of the codebase.

## Deployment

Frontend and backend deploy independently.

### Frontend — Vercel

- **Root Directory:** `frontend`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** `VITE_API_URL=https://<your-render-backend-url>`

No `vercel.json` is needed — the app is a single page with no client-side routes.

### Backend — Render

Either apply the included `render.yaml` Blueprint, or create a Web Service manually:

- **Root Directory:** `backend`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Environment Variables:** `CLIENT_URL=https://<your-vercel-frontend-url>` (the only variable you must set; `PORT` comes from the platform)

The server binds `0.0.0.0` and reads `PORT` from the environment, as container platforms require. Do not hardcode `localhost` in production.

**Verify the deploy:** `curl https://<your-render-url>/api/health` should return `{"status":"ok"}`, and the deployed frontend should be able to send at least one request through the proxy. We do not claim any deployment has actually been made in this repository.

## Known limitations and intentional issues

This is a **contribution-focused project with deliberately seeded defects**. Some functionality is knowingly imperfect so Geekstober contributors have real, well-scoped bugs to fix. The complete, up-to-date catalogue (IDs, reproduction steps, acceptance criteria, difficulty labels) lives in **[CONTRIBUTING.md](CONTRIBUTING.md)**. Do not assume any feature listed above is bug-free.

Pre-existing gaps beyond the seeded issues: none known — but if you find an undocumented defect, please report it in a new GitHub issue rather than describing it as a seeded one.

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full contributor handbook: setup, the complete intentional-issue catalogue, branch naming, commit conventions, PR requirements, and the definition of done. In short: pick a catalogued issue, claim it in a GitHub issue, branch as `fix/<issue-id>-<slug>`, submit one focused PR, link the issue ID, and include reproduction/verification notes.

## License

No LICENSE file exists in this repository. Until one is added, all rights are reserved by the author; contributors retain rights to their own contributions. Adding an appropriate open-source license would be a welcome documentation improvement. Until then, do not claim this project is already licensed.

## Troubleshooting

**Dependencies fail to install.** Confirm Node ≥ 22.9 (`node -v`) then rerun `npm install` from the repo root (it handles both workspaces). Delete `node_modules` and `package-lock.json`-only issues are rare — prefer `npm ci` when supported.

**Frontend can't reach the backend / proxy errors.** Locally, make sure you started with `npm run dev` at the root — the Vite dev server must be forwarding `/proxy` to `:3001`. In production, confirm the frontend's `VITE_API_URL` is set to the Render URL (no trailing slash).

**CORS errors in the browser console.** The backend only allows origins listed in `CLIENT_URL` (comma-separated). Add your Vercel/preview domain to the Render env vars and redeploy. `localhost` origins won't work against the deployed backend, and vice versa.

**Missing environment variables.** Compare your `.env` files against `.env.example` in each workspace. Remember `VITE_API_URL` is build-time — changing it requires a rebuild.

**Backend port.** The backend defaults to `3001`; `PORT` is read from the environment, and Render injects its own. If `:3001` is taken locally, free it or override `PORT` in `backend/.env` (then restart).

**Invalid mock API requests.** There are no mock APIs here — if a request fails, check the URL, the method, and CORS as covered above.

**Deployment build failures.** The frontend build runs `tsc` first: fix type errors, don't skip the check. The backend has no build step — a failure there is usually a Node version mismatch or a missing `package.json` script.
