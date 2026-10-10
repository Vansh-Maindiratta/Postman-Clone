# Contributing to API Lab

Welcome! This project is the Geekstober Postman Clone — a browser-based API client with a tiny stateless CORS-proxy backend. It ships with **intentionally introduced, fully documented bugs** so contributors of all experience levels can make meaningful, well-scoped pull requests. This document is the complete handbook: setup, the full issue catalogue, conventions, and what "done" means.

## A. Welcome and contribution goals

- **What the project does:** builds and sends HTTP requests from the browser (methods, params, headers, bodies, auth), shows responses, and stores collections/history in `localStorage`. A small Express proxy handles APIs that block browser requests with CORS. There is **no database, no accounts, and no server-side auth** — don't add them as part of an issue fix.
- **Why it exists:** to be a practical API-testing tool *and* a friendly on-ramp into open source during Geekstober.
- **How to participate:** pick a catalogued issue below, reproduce it, fix the narrow area described, add regression coverage where practical, and open a focused pull request.
- **Scope:** focus on **correctness, regression tests, and maintainability** within the issue you claim. Duplicated fixes, drive-by refactors, and new features belong in a separate, maintainer-approved PR.

## B. Prerequisites and setup

You need **Node.js ≥ 22.9** and npm. Then:

```bash
# 1. Fork the repository on GitHub, then clone YOUR fork
git clone https://github.com/<your-username>/api-lab.git
cd api-lab

# 2. Track the original repository (use its real URL; `OWNER` below is a placeholder)
git remote add upstream https://github.com/<OWNER>/api-lab.git
git fetch upstream

# 3. Install both workspaces (frontend + backend) from the root
npm install

# 4. Environment variables (optional locally; see the tables in README.md)
cp frontend/.env.example frontend/.env
cp backend/.env.example  backend/.env

# 5. Start everything (backend :3001, frontend :5173)
npm run dev
```

Open http://localhost:5173. The Vite dev server forwards `/proxy` to `http://localhost:3001`, so no env vars are needed locally.

Available checks (all exist in the repo — don't invent others):

```bash
npm run typecheck   # TypeScript check for the frontend
npm run build       # tsc + vite build (frontend)
npm start           # backend in production mode
```

There is **no test runner or linter configured**. If your fix would benefit from automated coverage, prefer a small, framework-free regression script or a candid note in the PR showing how you reproduced the bug before and verified the fix after — do not install a large testing framework just for this.

## C. Intentional issue catalogue

Every deliberately seeded defect in the codebase is documented here, exactly as it exists after being introduced. Nothing here is speculative, and ordinary pre-existing bugs are not listed as seeded issues.

> **Status:** all issues below are intentionally introduced and awaiting contributor fixes. They were verified against the code at the time of writing; if the code has changed, trust the code and note the discrepancy in your PR.

---

### GS-API-01 — PUT and PATCH requests are not implemented

**Difficulty:** Good first issue
**Category:** Request builder
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** `PUT` and `PATCH` are selectable in the method dropdown and can be saved into collections, but the execution layer refuses to send them: sending either fails with *"… is not implemented yet"*, even though the UI and storage already support them.

**Affected area:** `frontend/src/services/request.ts` — `HANDLED_METHODS` and the guard in `sendRequest`.

**Example input:** set the method to `PUT` with URL `https://jsonplaceholder.typicode.com/posts/1` and click **Send**.

**Steps to reproduce:**
1. Start the app (`npm run dev`), open http://localhost:5173.
2. Create a new request.
3. Set the method to `PUT` (or `PATCH`).
4. Enter any valid URL (e.g. `https://jsonplaceholder.typicode.com/posts/1`).
5. Click **Send** — an error card appears instead of a response.

**Expected behavior:** `PUT`/`PATCH` requests are sent with their method, headers, and (for PUT) body, exactly like `POST`.

**Actual behavior:** the `sendRequest` guard rejects both methods with "not implemented yet"; `HANDLED_METHODS` contains only `GET`, `POST`, `DELETE`, `HEAD`, `OPTIONS`.

**Acceptance criteria:**
- [ ] `PUT` and `PATCH` requests execute and their responses render.
- [ ] Bodies and auth still attach to `PUT`/`PATCH` requests.
- [ ] `GET`/`POST`/`DELETE`/`HEAD`/`OPTIONS` behavior is unchanged.
- [ ] Regression coverage covering both methods is added or described.

**Suggested test:** build a request with method `PUT` and assert `sendRequest` performs a `fetch` whose `init.method === 'PUT'` (mock `fetch`).

**Scope:** add the methods to the send path in `frontend/src/services/request.ts`. Do not redesign state, storage, or the method-selector UI.

---

### GS-API-02 — GET and DELETE execute each other's method

**Difficulty:** Good first issue
**Category:** Request builder
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** Before a request is sent, the method is swapped: a `GET` goes out as `DELETE` and a `DELETE` goes out as `GET`. The UI still shows the method the user chose, so the defect only surfaces in the response — e.g. `GET https://httpbin.org/get` returns `405 Method Not Allowed` because a DELETE actually went out. Real targets can be damaged by this (a stray `DELETE` against a real API).

**Affected area:** `frontend/src/services/request.ts` — `swapMethod` and its call site in `sendRequest`.

**Example input:** method `GET`, URL `https://httpbin.org/get`, click **Send**.

**Steps to reproduce:**
1. Start the app and open http://localhost:5173.
2. Create a request with method `GET` and URL `https://httpbin.org/get`.
3. Click **Send**.
4. The response shows `405 Method Not Allowed` (or other DELETE-side effects) even though the URL clearly supports GET.

**Expected behavior:** the method the user selected is sent unchanged.

**Actual behavior:** `swapMethod` maps `GET ⇄ DELETE` before `fetch` is called.

**Acceptance criteria:**
- [ ] `GET https://httpbin.org/get` returns `200` with the request's echo payload.
- [ ] `DELETE` requests reach their target as `DELETE`.
- [ ] No other method is altered.
- [ ] Regression coverage pins the selected method to the outbound `init.method`.

**Suggested test:** with `fetch` mocked, send a `GET` and assert `init.method === 'GET'`.

**Scope:** delete or correct `swapMethod` in `frontend/src/services/request.ts`. Touch nothing else.

---

### GS-API-03 — Query parameters with an empty value are silently dropped

**Difficulty:** Good first issue
**Category:** Request builder
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** `resolveUrl` skips enabled parameters whose value is empty or whitespace-only instead of appending them as `key=`. APIs that distinguish "flag present" from "flag absent" (or expect `?page=`) receive a different URL than the user built. Disabled parameters and blank *keys* are still handled correctly — only the empty-*value* case is wrong.

**Affected area:** `frontend/src/services/request.ts` — the parameter loop in `resolveUrl`.

**Example input:** URL `https://httpbin.org/get` with enabled params `debug` → `""` and `page=2`. Resolved URL today: `https://httpbin.org/get?page=2` — expected `https://httpbin.org/get?debug=&page=2`.

**Steps to reproduce:**
1. Start the app and open http://localhost:5173.
2. Create a request with URL `https://httpbin.org/get`.
3. In **Params**, add a row with key `debug` and an empty value, and a row `page` = `2`; leave both enabled.
4. Click **Send** (and watch the URL preview under the editor).
5. `debug` never reaches the request: it is missing from the resolved URL and from `args` in the response.

**Expected behavior:** `?debug=&page=2` — an enabled key with an empty value is appended as `key=`.

**Actual behavior:** empty-valued enabled rows are skipped entirely.

**Acceptance criteria:**
- [ ] Enabled empty-value params are appended as `key=`.
- [ ] Disabled rows and rows with blank keys are still excluded.
- [ ] Special characters in values remain properly encoded (`searchParams` behavior is preserved).
- [ ] Regression coverage for the empty-value case exists.

**Suggested test:** call `resolveUrl` with params `debug=''`, `page=2`, and a disabled row; assert the returned URL is `…?debug=&page=2` and includes nothing from the disabled row.

**Scope:** the parameter loop in `resolveUrl` (`frontend/src/services/request.ts`) only.

---

### GS-API-04 — JSON request bodies are re-serialized instead of sent as typed

**Difficulty:** Intermediate
**Category:** Request builder
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** For JSON bodies, the code parses the editor text and then re-serializes it with `JSON.stringify(JSON.parse(...))` instead of sending the raw text. Formatted bodies are minified (the "exact text you typed" is not what goes on the wire) and — the sharp edge — **numbers are re-written through IEEE-754 doubles**: `1.0000000000000001` reaches the target as `1`, which silently corrupts exact-decimal payloads (IDs, decimal amounts, optimistic-concurrency tokens). Duplicate keys are also silently merged. The editor-side "Invalid JSON" validation is unaffected; only the wire payload is wrong.

**Affected area:** `frontend/src/services/request.ts` — the `json` branch of `buildBody`.

**Example input:** body type **JSON** with the text

```json
{
  "price": 1.0000000000000001,
  "name": "Ada"
}
```

to `https://httpbin.org/post`.

**Steps to reproduce:**
1. Start the app and open http://localhost:5173.
2. Create a request, method `POST`, URL `https://httpbin.org/post`.
3. On the **Body** tab, select **JSON** and enter the example text above.
4. Click **Send**.
5. In the response, `json` shows `"price": 1` (precision destroyed) and the body is minified to `{"price":1,"name":"Ada"}` — not the spacing typed in the editor.

**Expected behavior:** the exact text typed in the editor is sent as the request body, so the target receives `{"price": 1.0000000000000001, "name": "Ada"}` byte-for-byte (the number's original digits and the user's spacing intact).

**Actual behavior:** the target receives the re-serialized form `{"price":1,"name":"Ada"}` — minified, with the number reduced to `1`.

**Acceptance criteria:**
- [ ] The body sent is exactly what the editor contains (modulo trailing whitespace) — formatting preserved, numbers unmodified.
- [ ] The live "Invalid JSON" validation still blocks genuinely invalid input.
- [ ] Empty JSON bodies still produce no payload, and headers/content-type are unchanged.
- [ ] Regression coverage pins the sent payload to the raw editor text (a numeric precision case is ideal).

**Suggested test:** build a JSON body request containing `1.0000000000000001`, mock `fetch`, and assert `init.body` includes that exact digit sequence.

**Scope:** the `json` branch of `buildBody` in `frontend/src/services/request.ts`. Don't touch text/form-body handling.

---

### GS-API-05 — Headers with an empty value are silently dropped

**Difficulty:** Good first issue
**Category:** Request builder
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** `buildHeaders` skips enabled headers whose value is empty or whitespace-only. Some APIs require headers that must be *present* with an empty value (or use an empty value as a marker), and a user who enters a header without a value expects it to be sent. Ordinary non-empty headers are unaffected.

**Affected area:** `frontend/src/services/request.ts` — `buildHeaders`.

**Example input:** headers `X-Sent-With=API Lab` and `X-Sent-At=` (empty); send `GET https://httpbin.org/headers`. The echo shows `X-Sent-With` but never `X-Sent-At`.

**Steps to reproduce:**
1. Start the app and open http://localhost:5173.
2. Create a request with URL `https://httpbin.org/headers`.
3. In **Headers**, add `X-Sent-With` = `API Lab` and `X-Sent-At` with an empty value; leave both enabled.
4. Click **Send**.
5. The echoed `headers` list contains `X-Sent-With` but not `X-Sent-At`.

**Expected behavior:** enabled headers with empty values are sent; only plain whitespace values might legitimately be trimmed — but the header must not disappear.

**Actual behavior:** the header row is skipped entirely.

**Acceptance criteria:**
- [ ] Enabled headers with empty values reach the target.
- [ ] Disabled rows and rows with blank keys are still dropped.
- [ ] Header-name case-insensitive dedup against `Content-Type` still works.
- [ ] Regression coverage pins the empty-value case.

**Suggested test:** call `buildHeaders` with an enabled empty-value header and assert it appears in the returned object.

**Scope:** `buildHeaders` in `frontend/src/services/request.ts` only.

---

### GS-API-06 — "Pretty" response view shows JSON on a single line

**Difficulty:** Good first issue
**Category:** Response viewer
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** In the response viewer, the parsed JSON is re-serialized *without* indentation, so the Pretty view collapses multi-line JSON into one physical line with no indentation. Line numbers in the gutter count one line; the syntax highlighter still runs, but the output is unreadable for large payloads. Raw view is unaffected, and non-JSON responses fall back to text as designed.

**Affected area:** `frontend/src/components/response/ResponseViewer.tsx` — the `try` branch of the `pretty` `useMemo`.

**Example input:** any JSON response, e.g. `GET https://jsonplaceholder.typicode.com/users`.

**Steps to reproduce:**
1. Start the app, open http://localhost:5173.
2. Send a GET to `https://jsonplaceholder.typicode.com/users`.
3. With the response viewer on **Pretty**, the body renders as one endless line instead of an indented tree; the Line numbers column shows `1` for everything.

**Expected behavior:** `JSON.stringify(value, null, 2)`-style formatting — indented, multi-line, numbered lines.

**Actual behavior:** the JSON is re-stringified with no indent argument, producing a single line.

**Acceptance criteria:**
- [ ] Pretty view indents nested structures across multiple lines.
- [ ] Raw view and non-JSON responses are unchanged.
- [ ] The "This response says it is JSON but could not be parsed" fallback still works.
- [ ] The syntax highlighter still highlights the reformatted output.

**Suggested test:** assert that for `{"a":1}` the pretty output contains at least one `\n` (or simulate the memo's logic in isolation).

**Scope:** the `JSON.stringify` call in `ResponseViewer.tsx`'s `pretty` memo only. Don't restructure the viewer.

---

### GS-API-07 — Restoring a request from history loses its body

**Difficulty:** Intermediate
**Category:** Request history
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** After a successful send, the `History`/Recent entry's stored request has its `body.text` wiped (`{...draft, body: {...draft.body, text: ''}}`). Restoring that entry opens the URL, method, params, headers, and auth correctly but the JSON/text body is empty — so re-running a saved history entry no longer reproduces the original request.

**Affected area:** `frontend/src/pages/Workspace.tsx` — the `send` callback's `setHistory` update.

**Example input:** send any POST with a JSON body (e.g. `{"title": "hello"}` to `https://jsonplaceholder.typicode.com/posts`), then click the newest Recent entry.

**Steps to reproduce:**
1. Start the app, open http://localhost:5173.
2. Create a POST to `https://jsonplaceholder.typicode.com/posts` with JSON body `{"title": "hello"}`.
3. Click **Send** — it succeeds.
4. Open the **Recent** list in the collections panel and click the newest entry.
5. The workspace opens the request but the Body textarea is blank.

**Expected behavior:** a history entry reproduces the request exactly, including its body text.

**Actual behavior:** `body.text` is cleared when the entry is recorded, so restoring loses the body.

**Acceptance criteria:**
- [ ] History entries store and restore the full body.
- [ ] Live draft editing still works; `structuredClone` isolation from the draft is preserved.
- [ ] The 50-entry history cap is unaffected.
- [ ] Regression coverage asserts the stored body matches the sent body.

**Suggested test:** after a mocked successful send, assert the history entry's `request.body.text` equals the draft's.

**Scope:** the `setHistory` update in `Workspace.tsx`'s `send` callback. Don't change collection save logic.

---

### GS-API-08 — Duplicating a request reuses the original id

**Difficulty:** Intermediate
**Category:** Collections / saved requests
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** `duplicateRequest` clones the source request but forgets to assign a fresh id, so the copy shares the original's `id`. Two entries with the same id exist in the same collection; opening the copy actually restores a view of one ambiguous shared identity, and later operations (delete, rename, "Active" highlighting, id-based upsert on re-save) can act on the wrong entry or delete both.

**Affected area:** `frontend/src/pages/Workspace.tsx` — `duplicateRequest`.

**Example input:** duplicate the "List users" request in any collection.

**Steps to reproduce:**
1. Start the app, open http://localhost:5173.
2. Save any request into a collection.
3. Click the duplicate (copy) icon on the request row.
4. A "… Copy" appears — but open it and edit; save; or delete one of the pair.
5. The unseen problems occur: duplicate ids mean deletes/highlights/upserts hit both.

**Expected behavior:** the duplicate gets a fresh `crypto.randomUUID()` id and behaves as an independent request.

**Actual behavior:** the copy keeps the source's `id` (`{...structuredClone(source), name, createdAt, updatedAt}` — no new id).

**Acceptance criteria:**
- [ ] Duplicates receive a new id equal to `crypto.randomUUID()`.
- [ ] Deleting one of a duplicated pair leaves the other intact.
- [ ] Renaming, active-state highlighting, and re-saving a duplicate no longer affect the original.
- [ ] Regression coverage asserts the duplicated id differs from the source id.

**Suggested test:** call `duplicateRequest` (or extract the copy logic) and assert `copy.id !== source.id`.

**Scope:** the copy assignment in `duplicateRequest` (`Workspace.tsx`). Don't change the list UI.

> The reproduction is mostly invisible until you interact with the pair — document what you observe in your PR (e.g. which operation misbehaved) since some symptoms only appear after a save or delete.

---

### GS-API-09 — The proxy strips the Authorization header before forwarding

**Difficulty:** Intermediate
**Category:** Backend / proxy
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** The proxy's header-filtering loop deletes `authorization` from the incoming request. Any request that needed browser→proxy→target authentication (Bearer, Basic, API-key-in-`Authorization`) reaches the target unauthenticated and gets `401`/`403`, even though the user supplied valid credentials and the code comment claims authorization should be preserved. Note: this only affects requests that go through `/proxy` (i.e. APIs that block browser CORS); direct browser requests still carry their own `Authorization` header.

**Affected area:** `backend/src/server.js` — the header-strip loop inside the `/proxy` handler.

**Example input:** `curl "http://localhost:3001/proxy?url=https%3A%2F%2Fhttpbin.org%2Fbearer" -H "Authorization: Bearer test-token-123"` → the target's `/bearer` endpoint answers "UNAUTHORIZED" (it echoes a *different* token; with the header forwarded it would echo `test-token-123`).

**Steps to reproduce:**
1. Start the backend (`npm run dev` from the root, or `npm start` in `backend/`).
2. Run the example `curl` above against `httpbin.org/bearer`.
3. The response shows the token did **not** reach the target.

**Expected behavior:** `Authorization` reaches the target unchanged; only hop-by-hop/identifying headers are stripped.

**Actual behavior:** `authorization` is explicitly deleted in the strip loop.

**Acceptance criteria:**
- [ ] `Authorization` is forwarded by `/proxy`.
- [ ] The other deliberate strips (host, connection, cookie, sec-fetch, x-forwarded, …) still work.
- [ ] Requests without an `Authorization` header are unaffected.
- [ ] A regression test (or a documented curl check) proves the header passes through.

**Suggested test:** start the server (or mock `fetch`/`http.IncomingMessage`), call `/proxy` with `-H "Authorization: Bearer t"`, and assert the upstream `fetch` received that header.

**Scope:** the header-strip loop in `backend/src/server.js`. Don't touch CORS middleware or the private-target guard.

---

### GS-API-10 — Importing a single-collection JSON file fails as "not a valid export"

**Difficulty:** Good first issue
**Category:** Storage / import-export
**Status:** Intentionally introduced — awaiting contributor fix

**Description:** `parseImport` used to accept two shapes: a workspace export (`{ app, version, collections: [...] }`), a bare array of collections, and a single-collection file (`{ name, requests: [...] }`). The single-collection branch was removed, so files matching the documented single-collection form (including the repo's own per-collection export format) now fail as invalid — the UI shows *"Import failed. That file is not a valid API Lab export."*

**Affected area:** `frontend/src/services/storage.ts` — `extractEntries`.

**Example input:** file containing:

```json
{
  "name": "My collection",
  "requests": [
    { "name": "Get users", "method": "GET", "url": "https://jsonplaceholder.typicode.com/users" }
  ]
}
```

**Steps to reproduce:**
1. Start the app and open http://localhost:5173.
2. Click **Import** in the topbar and choose a file with the JSON above.
3. The notice reports "Import failed. That file is not a valid API Lab export."

**Expected behavior:** the single-collection shape is recognized and imported as one new collection with a fresh collection id and per-request ids.

**Actual behavior:** `extractEntries` returns `null` for anything without a top-level `collections` array (or without being a bare array).

**Acceptance criteria:**
- [ ] `{ name, requests }` files import as a single collection.
- [ ] Workspace exports, arrays, and otherwise-invalid files behave exactly as before.
- [ ] Imported requests still get fresh ids (per the existing `parseImport` behavior).
- [ ] Regression coverage for all three accepted shapes.

**Suggested test:** feed `extractEntries` both shapes; assert the single-collection shape yields one entry with that name.

**Scope:** `extractEntries` in `frontend/src/services/storage.ts`. Don't change the export format or `parseImport`'s normalization.

---

## D. Issue selection and claiming

1. **Read the catalogue** above and pick an issue that matches your experience level (`good first issue` for a first contribution; `intermediate` if you've shipped a fix before).
2. **Search existing GitHub issues and PRs** for the issue ID or title before starting — someone may already be working on it.
3. **Claim it** by commenting on the corresponding GitHub issue (or opening one that references the ID) saying you're picking it up. If the repository doesn't yet have an issue tracker entry for it, open one using the catalogue description — don't assume an issue already exists.
4. **Wait for a maintainer's confirmation** only if an issue is explicitly marked as contested or you've been asked to coordinate.
5. **Work on one clearly scoped issue per pull request** unless a maintainer approves otherwise. If two issues share a root cause, say so explicitly in the PR instead of bundling silently.

## E. Branch naming

- Fixes: `fix/gs-api-03-query-params`, `fix/gs-api-09-proxy-auth`
- Documentation: `docs/readme-improvements`, `docs/contributing-typos`
- Tests/tooling: `test/mock-api-regression`, `chore/spelling`

Keep one concern per branch; if you fix more than one catalogued issue, use one branch (and PR) per issue.

## F. Coding guidelines

- Follow the existing style: TypeScript in `frontend/src/`, plain ESM JavaScript in `backend/src/`, no new lint/format tooling.
- Prefer small, focused diffs; reuse existing components and utilities.
- Avoid unrelated refactoring, reformatting, or renaming in the same PR.
- Don't add dependencies unless a maintainer agrees it's necessary.
- Never commit `.env` files, credentials, tokens, or personal data; secrets belong in your local `.env` (gitignored) or platform env vars.
- Don't remove or overwrite other contributors' work; rebase rather than force-push over shared files.
- Keep frontend/backend contracts consistent: if you change what `/proxy` sends or expects, reflect it in the frontend's proxy fallback path and in the README's API docs.
- Handle loading, success, and error states explicitly in UI changes.
- Preserve behavior outside your issue's scope — the rest of the app must keep working.

## G. Testing requirements

There is no test runner or linter configured, so verification is primarily manual plus described reproduction:

1. **Reproduce the bug first** using the issue's steps, before editing anything, and note the observed behavior in your PR.
2. **Fix the narrow area** described in the issue's scope.
3. **Verify the original failing case** now works (repeat the reproduction steps and confirm the expected behavior).
4. **Verify the neighbors**: for request-builder issues, check ordinary `GET`/`POST` requests, headers, params, bodies, and auth still behave; for history/collection issues, check save/rename/delete/import/export; for backend issues, run `curl` against `/api/health` and `/proxy` with and without the affected header.
5. **Add regression coverage where practical** — a small script, an assertion in a manual checklist, or (if you and a maintainer agree) a test runner introduction. Label clearly anything you had to set up.
6. **Run the available checks**: `npm run typecheck`, `npm run build`, start the app with `npm run dev`, and make sure it boots cleanly.
7. **Confirm no secrets** are in your diff before opening the PR.

## H. Commit message convention

Use Conventional Commits, and reference the issue ID:

```
fix(api): correct query parameter encoding (GS-API-03)
fix(response): format pretty JSON across multiple lines (GS-API-06)
fix(proxy): forward Authorization to the target (GS-API-09)
test(storage): cover all accepted import shapes (GS-API-10)
docs: improve contributor setup instructions
```

Type vocabulary: `fix`, `feat`, `docs`, `test`, `chore`, `refactor`. Keep the subject ≤ 72 characters, imperative mood.

## I. Pull request requirements

Every PR should include:

- The **issue ID** (`GS-API-…`) and, if an actual GitHub issue exists, a link to it.
- **Problem description** — the defect, in your own words.
- **Root cause** — what code actually caused it.
- **Summary of changes** — what you changed and why that shape.
- **Testing performed** — the exact reproduction steps you ran before and after the fix.
- **Screenshots or response examples** when the fix is visible in the UI.
- **Confirmation that no secrets** were added.
- The checklist below.

**PR checklist (copy into your PR description):**

```
- [ ] Reproduced the issue before fixing it (steps in the description).
- [ ] Fix addresses the documented root cause.
- [ ] Original failing case passes; related working functionality unaffected.
- [ ] Regression coverage added or justified.
- [ ] npm run typecheck and npm run build pass locally.
- [ ] Change is scoped to the issue; no unrelated refactoring or dependency changes.
- [ ] No secrets or personal data in the diff.
```

## J. Definition of done

A contribution is ready for review when:

- The documented issue was reproducible before the fix.
- The fix addresses the underlying cause, not just the symptom.
- The original failing case passes.
- Related functionality continues to work.
- Available checks pass (`typecheck`, `build`).
- The change follows project conventions (style, commit format, scope).
- Documentation is updated *if* the fix changes documented behavior (e.g. a fix to the proxy may touch the README's API section).
- No unrelated files or secrets are included.

## K. Maintainer guidance

- **Adding new issues:** follow the template above; use fresh `GS-API-##` IDs; describe *exactly* what was changed to introduce the defect, keeping the rest of the app working.
- **Keeping the catalogue honest:** whenever code changes, re-verify that each issue's reproduction steps still fail; update or retire entries that no longer match reality.
- **Reviewing and merging fixes:** confirm the reproduction-before-fix story, that the scope matches the issue, and that `typecheck`/`build` pass.
- **Closing GitHub issues:** when merging a fix, close the issue by referencing `Fixes GS-API-##` (or an actual issue number) in the merge commit or PR body so the tracker stays in sync.
- **Preventing regressions of fixed seeded issues:** keep the regression tests/examples in the codebase after each fix so a future change can't silently reintroduce a seeded bug (e.g. don't delete the body-drop that GS-API-07 pinned).
- Do not publish secret solutions, credentials, or private information anywhere in public documentation.
