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

## Tech Stack

- React + TypeScript + Vite
- Express (local CORS proxy only)
- No UI framework, no state library — plain CSS and React state

## Getting Started

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173; the optional proxy runs at http://localhost:3001.

```bash
npm run build      # production build
npm run typecheck  # TypeScript check
npm start          # start the CORS proxy (proxy-only; the frontend is served separately)
```

## Usage

Pick an example request from the left panel or create a new one, fill in the URL, add params/headers/body as needed, and hit **Send** (`Ctrl/Cmd + Enter`). Save requests into collections with `Ctrl/Cmd + S`.

Some APIs block requests made from the browser (CORS). API Lab automatically retries those through the proxy: locally that is the backend started by `npm run dev`, and in production it is the deployed Render backend (`VITE_API_URL`).

## Deployment

The frontend and backend deploy independently.

**Frontend — Vercel**

- Root Directory: `frontend/`
- Build: `npm run build`
- Output: `dist`
- Environment variable: `VITE_API_URL=https://<render-service>`

**Backend — Render**

- Root Directory: `server/`
- Build: `npm install`
- Start: `npm start`
- Environment variable: `CLIENT_URL=https://<vercel-frontend>`

Without `VITE_API_URL` direct requests still work; only the CORS proxy fallback needs the deployed backend. Local defaults (no configuration needed) are `http://localhost:3001` for the proxy and `http://localhost:5173` for the allowed origin — see `.env.example`.

## Contributing

### Issue 1 — PUT and PATCH are not implemented

PUT and PATCH appear in the method selector and can be saved into collections, but the request execution layer does not handle them: sending one fails with *"not implemented yet"*. The fix is small and a good first contribution.

- Look at `HANDLED_METHODS` in `frontend/src/services/request.ts`.
- The UI and saved state already support these methods — only the send path is missing.

### Issue 2 — GET and DELETE are swapped

A GET request executes DELETE behavior, and a DELETE request executes GET behavior. The selector keeps showing the method you chose, so the symptom only appears in the response (for example, a GET to `https://httpbin.org/get` returns `405 Method Not Allowed`, because a DELETE actually went out).

- Look at `swapMethod` in `frontend/src/services/request.ts`.
- Remove or fix the swap so the selected method reaches the network unchanged.

### Where to look

- `frontend/src/services/request.ts` — `sendRequest`, `HANDLED_METHODS`, `swapMethod`, `HTTP_METHODS`.
- `server/src/server.js` — `/proxy` endpoint (CORS fallback for APIs that block browser requests).

Good first contributions: fix the GET/DELETE swap, implement PUT/PATCH, improve response viewer details, polish empty states, add keyboard shortcuts, improve accessibility, improve the mobile collection panel.
