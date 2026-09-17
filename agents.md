# MMRMS — Agent Instruction Manual

> This file governs how the AI agent implements each phase.
> When the user says **"complete next phase"**, follow this document exactly — every step, in order.

---

## Current Phase: 1

*(Update this line when a phase completes — e.g. change to `1` after Phase 0 is done)*

---

## Core Principles (Never Violate These)

1. **Zero regression** — Every previously-passing endpoint must still pass after your changes. Run the baseline before starting and after finishing every phase.
2. **One phase at a time** — Complete the current phase fully before touching the next.
3. **Test before declaring done** — Run every test listed in `phases.md` for the current phase. Fix all failures before reporting completion.
4. **Write real tests** — No stubs, no TODOs. Every test case from the spec must be a real, executable test.
5. **No silent failures** — If a dependency (Redis, Azure, SMTP) is not configured, detect it early and implement the documented fallback. Never let the server crash or an endpoint return 500.
6. **Preserve existing code structure** — Do not reorganise files, rename exports, or change import paths unless explicitly listed in the phase's "Modified Files" section.
7. **Async correctness** — After Phase 1 (Prisma), every store function returns a Promise. Every call site must `await` it. Missing awaits cause silent `undefined` bugs that are hard to diagnose.
8. **Envelope everywhere** — After Phase 0, every response (including errors) uses the `{ success, data, meta }` envelope. Routes still call `res.json(data)` — the middleware transforms it automatically. Never double-wrap.
9. **Commit at checkpoints** — `git commit` after: baseline passes at start, each major step completes, all phase tests pass.

---

## Startup Ritual (Run at the Beginning of Every Session)

```bash
# 1. Check which phase to implement
head -5 d:/MMRMS/agents.md
# Look for: Current Phase: N

# 2. Start the backend server
cd d:/MMRMS/backend
node server.js
# (keep this running in a separate terminal)

# 3. Run baseline verification (in another terminal)
node d:/MMRMS/backend/tests/baseline.js
# Must print: 29 passed, 0 failed

# 4. Read the full phase spec in phases.md before writing any code
```

---

## Phase Execution Workflow

When the user says "complete next phase":

### Step 1 — Read the Phase Spec
- Open `d:/MMRMS/phases.md`
- Find the section for the current phase number
- Read **every subsection**: Problem, New Files, Modified Files, Steps, Tests, Verification Checklist
- **Do NOT start coding until you have read the entire phase spec**

### Step 2 — Run Baseline
```bash
node d:/MMRMS/backend/tests/baseline.js
```
- Record the number of passing tests (should be 29 at start, more after later phases)
- If any tests fail before you start → **STOP** and report to user before proceeding
- Commit this as your checkpoint: `git commit -m "chore: baseline before phase N"`

### Step 3 — Install New Dependencies
For each package listed in the phase spec:
```bash
cd d:/MMRMS/backend && npm install <package>
# or
cd d:/MMRMS/frontend && npm install <package>
```
Verify the package appears in `package.json` after installation.

### Step 4 — Create New Files
For each file listed under "New Files":
- Write **complete implementation** — not stubs or placeholders
- Add JSDoc comments for all exported functions
- Handle all errors with `try/catch` and `next(new HttpError(...))`
- Use `async/await` consistently (never mix `.then()` callbacks with `async` functions in the same module)
- Import from existing modules using correct relative paths
- After writing: `node --check <filename>` to catch syntax errors immediately

### Step 5 — Modify Existing Files
For each file listed under "Modified Files":
1. Read the **entire existing file** first using `view_file`
2. Make only the changes described in the phase spec
3. Do NOT remove existing functionality unless the spec explicitly says to
4. Do NOT change function signatures that are imported by other modules
5. After modifying: `node --check <filename>` to verify syntax

### Step 6 — Write Tests
Create test files at the paths specified in the phase's "Tests" section.

**Use Node.js built-in test runner:**
```javascript
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../../src/app.js';

describe('Phase N — Feature Name', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = createApp();
    server = createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    baseUrl = 'http://localhost:' + server.address().port;
  });

  after(() => server.close());

  test('description of what is being tested', async () => {
    const res = await fetch(baseUrl + '/api/some/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ field: 'value' }),
      credentials: 'include',
    });
    const body = await res.json();

    // Assert envelope shape (mandatory after Phase 0)
    assert.equal(typeof body.success, 'boolean');
    assert.ok(body.meta?.requestId);

    // Assert business data
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.someField);
  });
});
```

**Getting a token in tests (works pre- and post-Phase 0):**
```javascript
async function login(baseUrl, email = 'bharathi.priya@kct.ac.in', password = 'mmrms@2026') {
  const res = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const body = await res.json();
  // Works before and after Phase 0 envelope
  return body.token ?? body?.data?.accessToken ?? null;
}
```

### Step 7 — Run Phase Tests
```bash
node --test d:/MMRMS/backend/tests/phaseN/*.test.js 2>&1
```
- All tests must be green
- If any fail:
  1. Read the full error message and stack trace
  2. Fix the root cause in source code
  3. Re-run the tests
  4. **Do NOT proceed to Step 8 until all tests pass**

### Step 8 — Run Full Regression Suite
```bash
node d:/MMRMS/backend/tests/baseline.js
node --test d:/MMRMS/backend/tests/**/*.test.js 2>&1
```
- Passing test count must equal or **exceed** the count from Step 2
- If any previously-passing test now fails:
  1. Identify exactly what your changes broke
  2. Fix it without removing or weakening the test
  3. Re-run the full suite
  4. **Do NOT proceed until the regression is fixed**

### Step 9 — Manual Verification
For each item in the phase's "Verification Checklist":
- Actually perform the check (start server, make the request, inspect the response)
- Do not mark an item done without actually verifying it

### Step 10 — Update agents.md
After all tests pass and the checklist is complete:
1. Change `Current Phase: N` to `Current Phase: N+1` at the top of this file
2. Update the Completion Log table below with the phase's status, date, and notes
3. `git commit -m "feat: complete phase N — <brief description>"`

---

## Endpoint Testing Protocol

Standard pattern for testing any endpoint:

```javascript
// Step 1: Get a valid token
const token = await login(baseUrl, 'bharathi.priya@kct.ac.in', 'mmrms@2026');

// Step 2: Call the endpoint
const res = await fetch(baseUrl + '/api/mentor/me/overview', {
  headers: { 'Authorization': 'Bearer ' + token },
  credentials: 'include',
});
const body = await res.json();

// Step 3: Assert envelope shape (Phase 0+)
assert.equal(typeof body.success, 'boolean');
assert.ok(body.meta?.timestamp);
assert.ok(body.meta?.requestId);

// Step 4: Assert business data
assert.equal(res.status, 200);
assert.equal(body.success, true);
assert.ok(body.data.mentor);
assert.ok(Array.isArray(body.data.attention));
```

**Testing error responses:**
```javascript
// 401 — no token
const r1 = await fetch(baseUrl + '/api/mentor/me/overview');
assert.equal(r1.status, 401);
const b1 = await r1.json();
assert.equal(b1.success, false);
assert.ok(b1.error?.code);
assert.ok(b1.error?.message);
assert.ok(b1.meta?.requestId);

// 403 — wrong role
const studentToken = await login(baseUrl, 'abhinav.dinesh@kct.ac.in', 'mmrms@2026');
const r2 = await fetch(baseUrl + '/api/mentor/me/overview', {
  headers: { 'Authorization': 'Bearer ' + studentToken },
});
assert.equal(r2.status, 403);
```

---

## Phase-Specific Preconditions

### Phase 0 Preconditions
- `backend/src/middleware/error.js` exists with `HttpError` class
- `backend/src/middleware/auth.js` exists with `requireAuth`, `requireRole`
- In-memory `store.js` still in use — no database required

### Phase 1 Preconditions
- Phase 0 complete, all tests passing
- PostgreSQL accessible: `psql postgresql://mmrms:mmrms@localhost:5432/mmrms` connects
- Can run `npx prisma migrate dev --name init` without errors

### Phase 2 Preconditions
- Phase 1 complete (Prisma DB working, all data persisted)
- `frontend/src/auth/RequireRole.jsx` — verify it handles `'admin'` and `'hod'` roles before starting

### Phase 3 Preconditions
- Phase 1 complete
- Redis accessible: `redis-cli -u redis://localhost:6379 ping` returns `PONG`
- SMTP not required for tests (mock the transporter) but needed for manual verification

### Phase 4 Preconditions
- Phase 1 complete
- Phase 3 partially complete: `queues.js` and `notify.js` must exist (even if SMTP not configured)

### Phase 5 Preconditions
- Phase 1 complete
- Phase 3 `notify.js` exists (for goal assignment notification hook)

### Phase 6 Preconditions
- Phase 1 complete (WeeklySnapshot table in DB)
- Phase 3 complete (BullMQ + Redis working)
- `node-cron` installed: `npm install node-cron --prefix backend`

### Phase 7 Preconditions
- Phase 1 complete (Evidence table in DB)
- Azure Storage accessible (if not: upload endpoint returns 503 with clear error, does not crash)

### Phase 8 Preconditions
- Phase 1 complete
- Phase 6 complete (for trend data in reports)
- Phase 7 complete (for evidence bundles in accreditation report)

### Phase 9 Preconditions
- Phase 1 complete
- Phase 2 complete (HOD role and endpoints)
- Phase 6 complete (`snapshot_taken` events in timeline)

### Phase 10 Preconditions
- Phase 1 complete
- Azure App Registration credentials in `.env` (if absent: graph.js logs error, returns null, meeting still created)

### Phase 11 Preconditions
- All Phase 0–10 tests passing
- Docker Desktop running: `docker info` succeeds
- Azure CLI configured (for deployment step)

### Phase 12 Preconditions
- All Phase 0–11 complete
- k6 installed: `k6 version` succeeds
- Staging environment running and accessible

---

## Common Pitfalls to Avoid

### Pitfall 1 — Missing `await` on Prisma calls
```js
// ❌ WRONG — returns Promise, not the user
const user = prisma.user.findUnique({ where: { email } });

// ✅ CORRECT
const user = await prisma.user.findUnique({ where: { email } });
```
After Phase 1, audit every file that imports from `store.js` and add `await` to all calls.

### Pitfall 2 — Envelope double-wrapping
```js
// ❌ WRONG — middleware will wrap this, creating data.success inside data
res.json({ success: true, data: user });

// ✅ CORRECT — middleware wraps automatically
res.json(user);
```
After Phase 0, routes just call `res.json(payload)`. The envelope middleware handles wrapping.

### Pitfall 3 — Middleware order in app.js
```js
// ✅ CORRECT ORDER (critical)
app.use(helmet());
app.use(cors({ ... credentials: true }));
app.use(cookieParser());              // must be before routes that read cookies
app.use(requestIdMiddleware);
app.use(envelopeMiddleware);          // must be before routes so it can intercept res.json
app.use('/api/auth', authRoutes);     // routes come after all middleware
app.use('/api/mentor', mentorRoutes);
// ...
app.use(notFound);
app.use(errorHandler);               // must be last
```

### Pitfall 4 — Cookie not sent in Node.js fetch tests
Node.js `fetch` does not automatically send/store cookies like a browser does.
In tests, after login, extract the `Set-Cookie` header and pass it as `Cookie` in subsequent requests:
```js
const loginRes = await fetch(baseUrl + '/api/auth/login', { ... });
const setCookie = loginRes.headers.get('set-cookie');
// In next request:
const res = await fetch(baseUrl + '/api/auth/refresh', {
  headers: { 'Cookie': setCookie },
});
```

### Pitfall 5 — Prisma schema drift
After editing `schema.prisma`, always run BOTH:
```bash
npx prisma generate          # regenerate client types
npx prisma migrate dev       # apply migration to DB
```
Never edit migration SQL files manually. If seed data breaks after a migration, update `prisma/seed.js`.

### Pitfall 6 — BullMQ in API process
The API process (server.js) **adds jobs** to queues via `notify.js`.
The Worker process (worker.js) **processes jobs** from queues.
They share the same Redis URL. Never start a Worker processor inside the API process — it creates duplicate processing.

### Pitfall 7 — Azure Blob SAS token TTL
SAS tokens expire. Never cache a SAS URL in the frontend or DB.
Always call `generateSasToken()` fresh when serving an evidence URL.
Store `sasExpiry` in the Evidence row so the frontend knows when to refresh.

### Pitfall 8 — Token in localStorage after Phase 0
After Phase 0: check DevTools → Application → Local Storage → no `mmrms.token` key.
The refresh token lives in the `httpOnly` cookie (`mmrms_refresh`).
The access token lives in React state only (lost on page refresh, restored via `/api/auth/refresh`).

### Pitfall 9 — CORS credentials mismatch
For `credentials: 'include'` (frontend) to work with `httpOnly` cookies, the backend needs:
```js
cors({ origin: ['http://localhost:5173'], credentials: true })
// NOT:
cors({ origin: true, credentials: true }) // ← browser blocks this
```

### Pitfall 10 — Zod schema for request body
Use `z.string().trim()` for all user-input string fields to handle leading/trailing whitespace.
Use `.min(1)` to reject empty strings.
Zod strips unknown fields by default (`.strict()` throws on extras, `.passthrough()` keeps them).
For optional fields with defaults: `z.number().int().min(0).max(100).default(0)`.

### Pitfall 11 — Route ordering in Express
More specific routes must come before less specific ones:
```js
// ✅ CORRECT
router.get('/me/mentees', handler);          // specific
router.get('/me/mentees/:menteeId', handler); // less specific

// ❌ WRONG ORDER — :menteeId would match 'me' as the ID
router.get('/me/mentees/:menteeId', handler);
router.get('/me/mentees', handler);
```

### Pitfall 12 — Prisma transactions for bulk operations
For bulk upload (Phase 2), use `prisma.$transaction([...])` or the interactive transaction API.
If any operation throws inside a transaction, Prisma automatically rolls back all operations.
```js
await prisma.$transaction(async (tx) => {
  for (const row of rows) {
    await tx.mentee.create({ data: row }); // if this throws, all prior creates roll back
  }
});
```

---

## Baseline Test Quick Reference

```bash
# Full baseline (30+ endpoints)
node d:/MMRMS/backend/tests/baseline.js

# Run a specific phase's tests
node --test d:/MMRMS/backend/tests/phase0/*.test.js
node --test d:/MMRMS/backend/tests/phase1/*.test.js
# etc.

# Run all phase tests
node --test d:/MMRMS/backend/tests/**/*.test.js

# Check a file for syntax errors without running it
node --check d:/MMRMS/backend/src/middleware/validate.js
```

---

## What to Report When a Phase is Complete

After finishing a phase, tell the user:

1. **Phase completed**: Phase N — [Phase Name]
2. **Tests passing**: N/N phase tests + 29/29 baseline
3. **New endpoints added**: list them
4. **Files created**: list new files
5. **Files modified**: list modified files
6. **Any deviations from spec**: document any decisions made differently from phases.md and why
7. **Prerequisites for next phase**: what the user needs to set up before the next phase can start (e.g. "Phase 3 requires Redis running on port 6379")

---

## Completion Log

| Phase | Status | Completed At | Notes |
|---|---|---|---|
| Phase 0 — Security Hardening | ✅ Complete | 2026-09-17 17:24 | helmet, cookie-parser, zod, envelope, httpOnly refresh token, bcrypt cost 12. 18/18 tests pass, 29/29 baseline. |
| Phase 1 — PostgreSQL + Prisma | ⏳ Pending | — | Requires Phase 0 |
| Phase 2 — Admin + HOD Roles | ⏳ Pending | — | Requires Phase 1 |
| Phase 3 — Notifications | ⏳ Pending | — | Requires Phase 1 + Redis |
| Phase 4 — Tickets | ⏳ Pending | — | Requires Phase 1 + 3 |
| Phase 5 — Goals API | ⏳ Pending | — | Requires Phase 1 |
| Phase 6 — Snapshot Engine | ⏳ Pending | — | Requires Phase 1 + 3 |
| Phase 7 — Evidence + Blob | ⏳ Pending | — | Requires Phase 1 + Azure |
| Phase 8 — Reports + PDF/Excel | ⏳ Pending | — | Requires Phase 1 + 6 + 7 |
| Phase 9 — Timeline + HOD UI | ⏳ Pending | — | Requires Phase 1 + 2 + 6 |
| Phase 10 — Teams Integration | ⏳ Pending | — | Requires Phase 1 + Azure App Reg |
| Phase 11 — Docker + Deploy | ⏳ Pending | — | Requires all prior phases |
| Phase 12 — Swagger + Load Test | ⏳ Pending | — | Requires Phase 11 |
