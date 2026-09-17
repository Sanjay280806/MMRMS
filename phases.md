# MMRMS — Phase-by-Phase Implementation Roadmap

> **Rule**: Every phase must leave the system in a fully working state. No phase may break any previously passing test or working API endpoint. Each phase ends with a verification checklist that must pass before the next phase begins.

---

## Current Baseline (What Already Works)

Run this before touching anything:

```bash
node d:/MMRMS/backend/tests/baseline.js
# Must print: 29 passed, 0 failed
```

**Known working endpoints (MUST NOT BREAK):**
- `GET  /api/health`
- `POST /api/auth/login` + `GET /api/auth/me`
- `GET  /api/mentor/me/overview`
- `GET  /api/mentor/me/mentees` + `GET /api/mentor/me/mentees/:menteeId`
- `POST /api/mentor/me/mentees/:menteeId/meetings`
- `GET  /api/mentor/me/goals` + `/action-items` + `/parent-log` + `/reports` + `/timeline`
- `GET  /api/student/me/record-book`
- `PATCH /api/student/me/skills/:skill` + `/self-assessment`
- `POST /api/student/me/participation/:group` + `/certifications` + `/internship-projects`
- `POST /api/student/me/evidence/:area` + `/support-requests` + `/messages`
- `PATCH /api/student/me/placement-readiness/:item` + `/action-items/:actionId`
- `POST /api/student/me/goals/:goalId/acknowledge`
- `GET  /api/advisor/me/overview` + `/students` + `/students/:id`
- `POST /api/advisor/me/class-meetings` + `/grievances`
- `PATCH /api/advisor/me/grievances/:grievanceId`
- `GET  /api/coordinator/me/overview` + `/students` + `/students/:id`
- `POST /api/coordinator/me/events`
- `PATCH /api/coordinator/me/od-requests/:requestId`

---

## Phase 0 — Security Hardening & API Standardisation
**Sprint 1 prerequisite | Effort: 1–2 days | Risk: LOW (additive only)**

### Problems Being Fixed
1. JWT stored in `localStorage` (XSS-accessible); TTL is 8 h instead of 15 min
2. bcrypt cost factor is 10 — HLSD requires ≥ 12
3. No `Helmet.js` — security headers missing
4. No API response envelope — all routes return raw objects
5. No Zod input validation on any endpoint
6. CORS is wide open (`true`) — needs explicit origin whitelist

### New Files
```
backend/src/middleware/validate.js      ← Zod validation middleware factory
backend/src/middleware/envelope.js      ← Wraps res.json() with standard envelope
backend/src/lib/token.js               ← signAccessToken(), signRefreshToken(), verifyRefreshToken()
backend/src/routes/refresh.routes.js   ← POST /api/auth/refresh, POST /api/auth/logout
```

### Modified Files
```
backend/src/middleware/auth.js          ← use lib/token.js (ACCESS_SECRET, 15-min verify)
backend/src/routes/auth.routes.js      ← issue 15-min access token + httpOnly refresh cookie
backend/src/data/store.js              ← bcrypt cost factor 10 → 12
backend/src/app.js                     ← helmet, cookie-parser, envelope, CORS whitelist, refresh routes
backend/package.json                   ← add: helmet, cookie-parser, zod, uuid
frontend/src/auth/AuthContext.jsx      ← token in React state (not localStorage), refresh interceptor
```

### Step-by-Step

**Step 1 — Install**
```bash
cd backend && npm install helmet cookie-parser zod uuid
```

**Step 2 — backend/src/lib/token.js**
- `signAccessToken(user)` → JWT signed with `ACCESS_SECRET` (env), TTL = `ACCESS_TTL` (default `15m`)
- `signRefreshToken(user)` → JWT signed with `REFRESH_SECRET` (env), TTL = `REFRESH_TTL` (default `7d`)
- `verifyRefreshToken(token)` → returns decoded payload or `null`
- Payload: `{ sub: user.id, role: user.role }`

**Step 3 — backend/src/middleware/validate.js**
- Export `validate(zodSchema)` → Express middleware
- On failure: `next(new HttpError(400, 'Validation failed', { issues }))`
- On success: `req.body = zodSchema.parse(req.body)`

**Step 4 — backend/src/middleware/envelope.js**
- Monkey-patch `res.json` so every response becomes:
  `{ success: true, data: <payload>, message: '', meta: { timestamp, requestId } }`
- Update `middleware/error.js` errorHandler to emit:
  `{ success: false, error: { code, message, details }, meta: { timestamp, requestId } }`
- Add `req.requestId = uuidv4()` at the top of `app.js`

**Step 5 — backend/src/routes/auth.routes.js changes**
- On login success: issue `accessToken` (15 min) in response body
- Set `Set-Cookie: mmrms_refresh=<refreshToken>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth`

**Step 6 — backend/src/routes/refresh.routes.js**
- `POST /api/auth/refresh`: read `req.cookies.mmrms_refresh` → verify → issue new accessToken + rotate cookie
- `POST /api/auth/logout`: `res.clearCookie('mmrms_refresh')` → return `{ success: true, data: null }`

**Step 7 — backend/src/data/store.js**
- Change `bcrypt.hashSync(password, 10)` → `bcrypt.hashSync(password, 12)`

**Step 8 — backend/src/app.js**
```js
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import refreshRoutes from './routes/refresh.routes.js';
import { envelopeMiddleware } from './middleware/envelope.js';

// inside createApp():
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'], credentials: true }));
app.use(cookieParser());
app.use((req, _res, next) => { req.requestId = uuidv4(); next(); });
app.use(envelopeMiddleware);
app.use('/api/auth', refreshRoutes);   // add alongside existing authRoutes
```

**Step 9 — frontend/src/auth/AuthContext.jsx**
- Remove all `localStorage.setItem/getItem` for token
- Store `accessToken` in `useState(null)` (memory only)
- On mount: call `POST /api/auth/refresh` with `credentials: 'include'` to restore session from cookie
- Add a fetch wrapper that on 401 → calls refresh → retries once
- On logout: call `POST /api/auth/logout`, clear state
- All API calls: `credentials: 'include'`

### Tests — `backend/tests/phase0/`

**auth.test.js**
- `POST /api/auth/login` → 200, `body.data.accessToken` exists
- `POST /api/auth/login` → `Set-Cookie` header contains `mmrms_refresh; HttpOnly`
- Wrong password → 401, `body.success === false`, `body.error.code` exists
- 5 consecutive wrong passwords → 423
- `POST /api/auth/refresh` with valid cookie → 200, new `accessToken`
- `POST /api/auth/refresh` with no cookie → 401
- `POST /api/auth/logout` → 200, `Set-Cookie` clears `mmrms_refresh`
- All success responses match `{ success: true, data: ..., meta: { timestamp, requestId } }`
- All error responses match `{ success: false, error: { code, message } }`

**security.test.js**
- `GET /api/health` response has `X-Frame-Options` header
- `GET /api/health` response has `X-Content-Type-Options` header
- `GET /api/mentor/me/overview` without token → 401, envelope shape
- `GET /api/mentor/me/overview` with student token → 403, envelope shape

### Verification Checklist
- [ ] `node d:/MMRMS/backend/tests/baseline.js` → 29 passed (all wrapped in envelope now)
- [ ] Frontend login works end-to-end
- [ ] DevTools → Application → localStorage: **no** `mmrms.token` key
- [ ] DevTools → Network → Set-Cookie: `mmrms_refresh; HttpOnly`
- [ ] Page refresh restores session via `/api/auth/refresh`
- [ ] `npm test` phase0 tests all green

---

## Phase 1 — PostgreSQL + Prisma Database Migration
**Sprint 1 | Effort: 3–4 days | Risk: HIGH (replaces data layer)**

### Problem
Every restart loses all data. This phase replaces `store.js` with PostgreSQL via Prisma. All API URLs and response shapes are preserved exactly — only the data access layer changes.

### Prerequisites
```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=mmrms -e POSTGRES_DB=mmrms -e POSTGRES_USER=mmrms \
  postgres:15-alpine
# Set in backend/.env:
# DATABASE_URL=postgresql://mmrms:mmrms@localhost:5432/mmrms
```

### New Files
```
backend/prisma/schema.prisma           ← Full schema for all entities
backend/prisma/seed.js                 ← Prisma seed script
backend/src/lib/prisma.js             ← PrismaClient singleton
```

### Modified Files
```
backend/package.json                   ← add @prisma/client; devDep: prisma
backend/src/data/store.js              ← Replace all functions with async Prisma queries
backend/src/services/*.js              ← Add await to all store function calls
backend/src/routes/*.js               ← Make handlers async where needed
```

### Prisma Schema (schema.prisma) — All Models

```prisma
generator client { provider = "prisma-client-js" }
datasource db   { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { admin hod coordinator advisor mentor student }
enum MeetingMode { Online Offline Hybrid }
enum ActionStatus { Pending InProgress Completed }
enum GoalStatus { OnTrack AtRisk Completed }
enum Priority { Low Medium High Critical }
enum TicketStatus { Raised Assigned Escalated Resolved Closed }
enum NotificationType {
  MeetingScheduled MeetingReminder GoalAssigned
  TicketRaised TicketEscalated SnapshotComplete
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  role          Role
  name          String
  department    String
  designation   String
  mentorId      String?
  studentId     String?
  advisorId     String?
  coordinatorId String?
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Mentor {
  id          String   @id @default(uuid())
  staffCode   String   @unique
  name        String
  email       String   @unique
  mobile      String
  department  String
  designation String
  cabin       String
  mentees     Mentee[]
}

model Mentee {
  id             String    @id @default(uuid())
  rollNumber     String    @unique
  name           String
  year           Int
  section        String
  attendance     Float
  meetingsHeld   Int       @default(0)
  meetingsDue    Int       @default(0)
  lastMeeting    DateTime?
  flagReason     String?
  suggestedAction String?
  mentorId       String
  mentor         Mentor    @relation(fields: [mentorId], references: [id])
  meetings       Meeting[]
  goals          Goal[]
  tickets        Ticket[]
  snapshots      WeeklySnapshot[]
}

model Meeting {
  id              String      @id @default(uuid())
  number          Int
  date            DateTime
  durationMinutes Int
  mode            MeetingMode
  category        String
  agenda          String[]
  topicsDiscussed String
  agendaNotes     String      @default("")
  studentConcerns String      @default("")
  mentorSuggestions String    @default("")
  supportRequired String      @default("")
  mentorRemarks   String      @default("")
  studentRemarks  String      @default("")
  nextReviewDate  DateTime?
  mentorSigned    Boolean     @default(false)
  studentSigned   Boolean     @default(false)
  isLocked        Boolean     @default(true)
  teamsJoinUrl    String?
  menteeId        String
  mentee          Mentee      @relation(fields: [menteeId], references: [id])
  actionItems     ActionItem[]
  evidence        Evidence[]
  createdAt       DateTime    @default(now())
}

model ActionItem {
  id          String       @id @default(uuid())
  task        String
  responsible String
  targetDate  String?
  status      ActionStatus @default(Pending)
  meetingId   String
  meeting     Meeting      @relation(fields: [meetingId], references: [id])
}

model Goal {
  id           String     @id @default(uuid())
  title        String
  target       String
  deadline     DateTime
  progressPct  Int        @default(0)
  status       GoalStatus @default(OnTrack)
  acknowledged Boolean    @default(false)
  menteeId     String
  mentee       Mentee     @relation(fields: [menteeId], references: [id])
  createdAt    DateTime   @default(now())
}

model Ticket {
  id           String       @id @default(uuid())
  subject      String
  category     String
  priority     Priority
  status       TicketStatus @default(Raised)
  raisedById   String
  assignedToId String?
  menteeId     String
  mentee       Mentee       @relation(fields: [menteeId], references: [id])
  history      TicketEvent[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model TicketEvent {
  id        String   @id @default(uuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  actorId   String
  action    String
  note      String?
  createdAt DateTime @default(now())
}

model Evidence {
  id          String    @id @default(uuid())
  name        String
  contentType String
  sizeBytes   Int
  blobUrl     String
  sasExpiry   DateTime?
  meetingId   String?
  meeting     Meeting?  @relation(fields: [meetingId], references: [id])
  isLocked    Boolean   @default(true)
  uploadedAt  DateTime  @default(now())
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  type      NotificationType
  title     String
  body      String
  isRead    Boolean          @default(false)
  deepLink  String?
  createdAt DateTime         @default(now())
}

model WeeklySnapshot {
  id          String   @id @default(uuid())
  menteeId    String
  weekStart   DateTime
  academic    Int
  attendance  Int
  interaction Int
  career      Int
  wellbeing   Int
  healthIndex Int
  engagement  Int
  capturedAt  DateTime @default(now())
  @@unique([menteeId, weekStart])
}

model AuditLog {
  id         String   @id @default(uuid())
  actorId    String
  actorRole  String
  action     String
  entityType String
  entityId   String
  diff       Json?
  ip         String?
  requestId  String?
  createdAt  DateTime @default(now())
}

model ClassAdvisor {
  id          String   @id @default(uuid())
  staffCode   String   @unique
  name        String
  email       String   @unique
  mobile      String
  department  String
  designation String
  className   String
  year        String
  room        String
  meetings    ClassMeeting[]
  grievances  Grievance[]
}

model YearCoordinator {
  id          String   @id @default(uuid())
  staffCode   String   @unique
  name        String
  email       String   @unique
  mobile      String
  department  String
  designation String
  events      CoordinatorEvent[]
  odRequests  OdRequest[]
}

model ClassMeeting {
  id       String   @id @default(uuid())
  title    String
  date     DateTime
  agenda   String
  status   String   @default("Scheduled")
  minutes  String   @default("")
  advisorId String
  advisor  ClassAdvisor @relation(fields: [advisorId], references: [id])
}

model Grievance {
  id        String   @id @default(uuid())
  studentId String
  category  String
  subject   String
  priority  String
  status    String   @default("Raised")
  owner     String
  raisedOn  String
  advisorId String
  advisor   ClassAdvisor @relation(fields: [advisorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CoordinatorEvent {
  id            String   @id @default(uuid())
  type          String
  title         String
  date          DateTime
  status        String   @default("Planned")
  notes         String   @default("")
  owner         String
  coordinatorId String
  coordinator   YearCoordinator @relation(fields: [coordinatorId], references: [id])
}

model OdRequest {
  id            String   @id @default(uuid())
  studentId     String
  purpose       String
  date          DateTime
  status        String   @default("Pending")
  approvedBy    String?
  coordinatorId String
  coordinator   YearCoordinator @relation(fields: [coordinatorId], references: [id])
  createdAt     DateTime @default(now())
}
```

### Migration Steps (in order)
1. `npm install @prisma/client && npm install -D prisma` in backend/
2. Create `prisma/schema.prisma` with all models above
3. `npx prisma migrate dev --name init`
4. Write `prisma/seed.js` inserting all data from current `seed.js`
5. `npx prisma db seed`
6. Create `src/lib/prisma.js` (PrismaClient singleton)
7. **Replace store.js functions ONE AT A TIME, verifying endpoints after each:**
   - `findUserByEmail`, `findUserById` → test `POST /api/auth/login` ✓
   - `findMentorById`, `listMentees`, `findMenteeById` → test `GET /api/mentor/me/overview` ✓
   - `addMentorMeeting` → test POST meeting + restart server + data still there ✓
   - All student write functions
   - Advisor/coordinator functions
8. Make all store functions `async`, add `await` everywhere they are called
9. Add AuditLog helper: `auditLog(actorId, actorRole, action, entityType, entityId, diff?)` — call on every write route

### Tests — `backend/tests/phase1/`
- PrismaClient connects without throwing
- `findUserByEmail('bharathi.priya@kct.ac.in')` returns user with `role: 'mentor'`
- `listMentees('m-1')` returns array with `mentorId === 'm-1'` on each entry
- `addMentorMeeting` persists → disconnect → reconnect → record still exists
- All 30+ API endpoints return same top-level field names as Phase 0
- AuditLog row created after `POST /api/mentor/me/mentees/:id/meetings`

### Verification Checklist
- [ ] `npx prisma studio` opens, all tables populated with seed data
- [ ] Server restart does NOT lose a meeting added via API
- [ ] All 30+ endpoints return same JSON shapes as Phase 0
- [ ] AuditLog table has entries after write operations
- [ ] `node d:/MMRMS/backend/tests/baseline.js` → 29 passed

---

## Phase 2 — Admin & HOD Roles
**Sprint 1 | Effort: 2–3 days | Risk: LOW (additive)**

### Problem
Admin and HOD roles are absent. Existing 4 roles are completely unaffected.

### New Files
```
backend/src/routes/admin.routes.js
backend/src/routes/hod.routes.js
backend/src/services/admin.js
backend/src/services/hod.js
backend/src/lib/csvParser.js             ← npm install xlsx multer
frontend/src/pages/admin/AdminConsole.jsx
frontend/src/pages/admin/sections/UserManagement.jsx
frontend/src/pages/admin/sections/BulkUpload.jsx
frontend/src/pages/admin/sections/AuditLogViewer.jsx
frontend/src/pages/hod/HodConsole.jsx
frontend/src/pages/hod/sections/DeptOverview.jsx
frontend/src/pages/hod/sections/ComplianceMatrix.jsx
frontend/src/pages/hod/sections/AtRiskPanel.jsx
```

### Seed 2 new users (add to prisma/seed.js)
- `admin@kct.ac.in` / `mmrms@2026` / role: admin / name: System Administrator
- `hod.cse@kct.ac.in` / `mmrms@2026` / role: hod / name: HOD CSE

### Admin Endpoints
```
GET    /api/admin/users?page=1&limit=20       List all users (paginated)
POST   /api/admin/users                       Create user (Zod validated)
GET    /api/admin/users/:id                   Get single user
PATCH  /api/admin/users/:id                   Update user
DELETE /api/admin/users/:id                   Soft-delete (set deletedAt)
POST   /api/admin/students/bulk-upload        CSV/XLSX import (?dry_run=true)
GET    /api/admin/students/bulk-upload/template  Download CSV template
PATCH  /api/admin/students/:id/mentor         Reassign mentor
GET    /api/admin/audit-log?page=1&limit=50   Paginated AuditLog
GET    /api/admin/system/config               Institution config
PATCH  /api/admin/system/config               Update term name etc.
```

### HOD Endpoints
```
GET /api/hod/me/overview        { avgHealth, mentorCount, atRiskCount, compliancePct }
GET /api/hod/me/mentors         All mentors with: compliancePct, assignedMentees, avgHealth
GET /api/hod/me/mentors/:id     Single mentor detail + mentee summary list
GET /api/hod/me/at-risk         All students with healthIndex < 50
GET /api/hod/me/compliance      Compliance matrix: { mentors: [{ name, weeks: [...] }] }
```

### Bulk Upload Rules
- Accept `.csv` or `.xlsx` via `multipart/form-data`
- Required columns: `roll_number, name, year, section, mentor_email, email, date_of_birth`
- `?dry_run=true` → validate only, return errors, do NOT write to DB
- Commit → Prisma `$transaction`: if any row fails, rollback ALL
- Response: `{ success, imported: N, skipped: M, errors: [{ row, field, message }] }`

### Tests — `backend/tests/phase2/`
- `POST /api/admin/users` creates user → 201 envelope
- Duplicate email → 409
- Bulk upload dry_run with valid CSV → `{ imported: N, errors: [] }`
- Bulk upload dry_run with bad rows → per-row errors
- Bulk upload commit inserts rows, count increases in DB
- Bulk upload commit with 1 bad row → 0 rows inserted (full rollback)
- Non-admin `GET /api/admin/users` → 403
- `GET /api/hod/me/overview` returns `{ avgHealth, mentorCount, atRiskCount }`
- Non-HOD `GET /api/hod/me/overview` → 403

### Verification Checklist
- [ ] Login as `admin@kct.ac.in` → redirected to `/admin`
- [ ] Login as `hod.cse@kct.ac.in` → redirected to `/hod`
- [ ] Admin can create student; student visible in mentor roster
- [ ] All Phase 0+1 tests still pass

---

## Phase 3 — Notifications (BullMQ + Email)
**Sprint 3 | Effort: 3–4 days | Risk: MEDIUM**

### Prerequisites
```bash
docker run -d -p 6379:6379 redis:7-alpine
# backend/.env: REDIS_URL=redis://localhost:6379
# SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
npm install bullmq ioredis nodemailer node-cron --prefix backend
```

### New Files
```
backend/src/worker/queues.js
backend/src/worker/processors/email.processor.js
backend/src/worker/processors/notification.processor.js
backend/src/services/notify.js
backend/src/routes/notifications.routes.js
backend/src/templates/email/meeting-scheduled.html
backend/src/templates/email/meeting-reminder.html
backend/src/templates/email/goal-assigned.html
backend/src/templates/email/ticket-raised.html
backend/src/templates/email/ticket-sla-breach.html
backend/src/templates/email/snapshot-summary.html
backend/worker.js                          ← separate process (node worker.js)
```

### queues.js
```js
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
export const emailQueue = new Queue('email', { connection });
export const notificationQueue = new Queue('notification', { connection });
export const snapshotQueue = new Queue('snapshot', { connection });
```

### notify.js exports
- `addToEmailQueue(to, templateId, vars)` — retries: 3, backoff: exponential 5 s
- `createInAppNotification(userId, type, title, body, deepLink?)` — inserts Notification row via queue

### Notification Triggers (hook into existing routes)
| Where | Event | Recipients |
|---|---|---|
| After `addMentorMeeting` | MeetingScheduled | Student + Mentor |
| After `POST /api/admin/users` (student) | Welcome | New student |
| After goal created (Phase 5) | GoalAssigned | Student |
| After ticket raised (Phase 4) | TicketRaised | Assignee |
| Worker cron — SLA breach check | TicketEscalated | Mentor + Coordinator |
| After weekly snapshot | SnapshotComplete | Admin |

### Notification API Endpoints (add to `app.js`)
```
GET    /api/notifications?page=1&limit=20   Current user's notifications
GET    /api/notifications/unread-count      { count: N }
PATCH  /api/notifications/:id/read         Mark one read
PATCH  /api/notifications/read-all         Mark all read for user
```

### Email Template Format
HTML files with `{{variableName}}` placeholders replaced via `String.prototype.replace()`.

### Tests — `backend/tests/phase3/`
- `GET /api/notifications` returns empty array for new user
- `PATCH /api/notifications/:id/read` → `isRead: true` in DB
- `PATCH /api/notifications/read-all` → all rows `isRead: true`
- `GET /api/notifications/unread-count` returns correct integer
- `POST /api/mentor/me/mentees/:id/meetings` → spy verifies `notificationQueue.add` called
- `emailQueue.add()` adds job (mock Redis with `ioredis-mock`)
- Email processor calls `nodemailer.sendMail` with correct template vars (mock transporter)

### Verification Checklist
- [ ] `node worker.js` starts without error
- [ ] Schedule a meeting → `GET /api/notifications` shows entry
- [ ] SMTP configured → email received
- [ ] All Phase 0+1+2 tests still pass

---

## Phase 4 — Ticket / Issue Management
**Sprint 3 | Effort: 2 days | Risk: LOW (additive)**

### New Files
```
backend/src/routes/tickets.routes.js
backend/src/services/ticket.js
frontend/src/pages/shared/TicketModule.jsx
```
Add to `app.js`: `app.use('/api/tickets', ticketRoutes)`

### Endpoints
```
POST   /api/tickets                     Raise ticket
GET    /api/tickets?status=&priority=   List (scoped by caller role)
GET    /api/tickets/:id                 Single ticket + full event history
PATCH  /api/tickets/:id/assign          Admin / Coordinator only
PATCH  /api/tickets/:id/escalate        Admin, HOD, Coordinator, Advisor
PATCH  /api/tickets/:id/resolve         Admin, Coordinator, Advisor, Mentor
PATCH  /api/tickets/:id/acknowledge     Student only
PATCH  /api/tickets/:id/close           Admin / Coordinator
GET    /api/tickets/:id/history         Chronological TicketEvent array
```

### Permission Matrix
| Action | Admin | HOD | Coord | Advisor | Mentor | Student |
|---|---|---|---|---|---|---|
| Raise | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Assign | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Escalate | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Resolve | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Acknowledge | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Close | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

### SLA Breach Thresholds
Low: 5 days | Medium: 3 days | High: 1 day | Critical: 4 hours
Worker cron checks every hour → SLA breach → `emailQueue.add('ticket-sla-breach', ...)`

### Tests — `backend/tests/phase4/`
- `POST /api/tickets` → status `'Raised'`, TicketEvent logged
- `PATCH /api/tickets/:id/assign` by advisor → 403
- `PATCH /api/tickets/:id/escalate` by student → 403
- `PATCH /api/tickets/:id/resolve` → status `'Resolved'`
- `PATCH /api/tickets/:id/acknowledge` by mentor → 403
- `PATCH /api/tickets/:id/acknowledge` by student → status `'Closed'`
- `GET /api/tickets/:id/history` → ordered TicketEvent array
- Mentor `GET /api/tickets` only returns own mentees' tickets

---

## Phase 5 — Goal Management Completion
**Sprint 2 | Effort: 1 day | Risk: LOW**

### New Endpoints (add to `mentor.routes.js`)
```
POST   /api/mentor/me/mentees/:menteeId/goals          Create SMART goal
GET    /api/mentor/me/mentees/:menteeId/goals           List goals for mentee
PATCH  /api/mentor/me/mentees/:menteeId/goals/:goalId  Update progressPct/status/deadline
DELETE /api/mentor/me/mentees/:menteeId/goals/:goalId  Delete (only if not acknowledged)
```

### Zod Schema
```js
const GoalCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  target: z.string().trim().min(3).max(500),
  deadline: z.string().datetime(),
  progressPct: z.number().int().min(0).max(100).default(0),
});
```

After creating → `notify.createInAppNotification(student.userId, 'GoalAssigned', title, target)`

### Tests — `backend/tests/phase5/`
- `POST` goal → 201, goal in DB with correct `menteeId`
- `POST` with missing `title` → 400 validation error from Zod
- `PATCH` goal → `progressPct` updated in DB
- `DELETE` acknowledged goal → 409 Conflict
- Creating goal → spy verifies `notificationQueue.add` called
- Student sees new goal in `GET /api/student/me/record-book`

---

## Phase 6 — Weekly Snapshot Engine
**Sprint 4 | Effort: 2–3 days | Risk: MEDIUM**

### New Files
```
backend/src/worker/processors/snapshot.processor.js
backend/src/worker/jobs/snapshot.job.js
backend/src/routes/snapshot.routes.js
```

### Cron Schedule
In `worker.js`: `node-cron` fires every Sunday at 23:00 (`'0 23 * * 0'`)
→ `snapshotQueue.add('weekly-batch', { weekStart })` for each mentee

### Snapshot Processor
For each mentee job:
1. Fetch mentee with all relations from Prisma
2. Compute 5 health dimensions using existing `health.js` functions
3. Compute `engagementScore`:
   - `meetingAttendanceRate = meetingsHeld / max(meetingsDue, 1)`
   - `goalCompletionRate = completedGoals / max(totalGoals, 1)`
   - `actionItemCloseRate = closedItems / max(totalItems, 1)`
   - `supportActivity = hasRaisedRequestThisWeek ? 1 : 0`
   - `score = round((rate*0.35 + goalRate*0.30 + aiRate*0.20 + support*0.15) * 100)`
4. `prisma.weeklySnapshot.upsert({ where: { menteeId_weekStart }, create, update })`
5. On error: log to AuditLog, add to dead-letter queue, continue other mentees

### Admin Endpoints
```
GET  /api/admin/snapshots?menteeId=&weekStart=   Query historical snapshots
POST /api/admin/snapshots/trigger                 Manual trigger (admin only)
GET  /api/admin/snapshots/status                  { lastRun, processed, failed, dlqCount }
GET  /api/mentor/me/mentees/:id/health-history    Trend for charts
GET  /api/student/me/health-history               Student's own trend
```

### Tests — `backend/tests/phase6/`
- `snapshot.processor` inserts `WeeklySnapshot` row with correct dimensions
- Re-running same week → upsert, no duplicate rows
- `GET /api/mentor/me/mentees/:id/health-history` → array ordered `weekStart ASC`
- `POST /api/admin/snapshots/trigger` by non-admin → 403
- Failed snapshot job → logged to AuditLog, not silently dropped

---

## Phase 7 — Evidence Repository & Azure Blob Storage
**Sprint 3 | Effort: 2 days | Risk: MEDIUM**

### Prerequisites
```bash
npm install @azure/storage-blob multer --prefix backend
# backend/.env:
# AZURE_STORAGE_CONNECTION_STRING=...
# AZURE_STORAGE_ACCOUNT_NAME=mmrmsstorage
```

### New Files
```
backend/src/lib/blob.js
backend/src/routes/evidence.routes.js
```

### blob.js exports
- `uploadBlob(containerName, blobName, buffer, contentType)` → `blobUrl`
- `generateSasToken(containerName, blobName, expiryHours=1)` → `{ sasUrl, sasExpiry }`
- `deleteBlob(containerName, blobName)`

### Endpoints
```
POST /api/evidence/upload               multipart/form-data → Azure Blob → { id, sasUrl, sasExpiry }
GET  /api/evidence/:id/url             Fresh SAS URL (1-hour TTL)
GET  /api/meetings/:meetingId/evidence  List evidence for a meeting
```

### Upload Rules
- Max 10 MB, allowed: `image/jpeg image/png image/webp application/pdf`
- After upload: insert `Evidence` row, `isLocked: true`
- Frontend NEVER holds permanent storage credentials

### Frontend: Camera-Only Enforcement
```html
<input type="file" accept="image/*" capture="environment" />
```
Add note: "Photos must be taken live at the time of the meeting."
Remove any file-picker fallback for meeting photos.

### Tests — `backend/tests/phase7/`
- Upload valid image → blob stored (mock Azure SDK), returns `sasUrl`
- Upload > 10 MB → 413
- `GET /api/evidence/:id/url` → returns `sasUrl` with future `sasExpiry`
- Evidence row `isLocked: true` → PATCH returns 403
- Meeting evidence listed via `GET /api/meetings/:meetingId/evidence`

---

## Phase 8 — Reports, Analytics & PDF/Excel Export
**Sprint 4 | Effort: 3 days | Risk: LOW**

### Prerequisites
```bash
npm install pdfkit exceljs archiver --prefix backend
```

### New Files
```
backend/src/lib/pdf.js
backend/src/lib/excel.js
backend/src/routes/reports.routes.js
backend/src/services/reports.js
frontend/src/pages/shared/ReportsDashboard.jsx
frontend/src/components/charts/HealthTrendChart.jsx
frontend/src/components/charts/ComplianceBarChart.jsx
```

### Endpoints
```
GET /api/reports/student/:menteeId          Student term report (JSON)
GET /api/reports/student/:menteeId/pdf      PDF download
GET /api/reports/mentor/:mentorId           Mentor term report (JSON)
GET /api/reports/mentor/:mentorId/excel     Excel download
GET /api/reports/department                 Dept report (hod|coordinator|admin)
GET /api/reports/department/excel           Dept report Excel
GET /api/reports/semester-review            Auto-generated semester summary
GET /api/reports/accreditation/:meetingId   Evidence bundle ZIP (NAAC/NBA)
```

### Student PDF Contents (in order)
1. Institution header + report title + generated date
2. Student identity block (name, roll, department, batch, mentor)
3. CGPA progression table
4. Attendance summary (month-wise)
5. Subject performance (CIA-1, CIA-2, Model, Grade)
6. Arrear history (standing + cleared)
7. SMART Goals summary table
8. Meeting log (all sessions in current term)
9. Action items status table
10. Placement readiness checklist
11. Certifications list
12. Health Index dimension breakdown

### Tests — `backend/tests/phase8/`
- `GET /api/reports/student/:id` → JSON with fields: `identity, academics, attendance, meetings`
- `GET /api/reports/student/:id/pdf` → 200, `Content-Type: application/pdf`
- `GET /api/reports/mentor/:id/excel` → correct xlsx Content-Type
- `GET /api/reports/department` by student → 403
- `GET /api/reports/accreditation/:meetingId` → `Content-Type: application/zip`

---

## Phase 9 — Student Timeline & HOD Dashboard
**Sprint 4 | Effort: 2 days | Risk: LOW**

### New Endpoints
```
GET /api/student/me/timeline?type=&from=&to=&page=1&limit=30
GET /api/mentor/me/mentees/:id/timeline?type=&from=&to=
```

Timeline event types: `meeting | goal_assigned | goal_completed | ticket_raised | ticket_resolved | certification_added | participation_added | snapshot_taken`
Sort: newest first. Filter: type (comma-sep), date range. Paginate.

### HOD Dashboard Sections (frontend)
1. **DeptHealthSummary** — % of students in each health band
2. **MentorComplianceGrid** — compliance % per mentor with colour coding
3. **AtRiskStudentList** — healthIndex < 50, sortable, with mentor name
4. **AttendanceAlertPanel** — students below 75% attendance
5. **TicketEscalationFeed** — active escalated/critical tickets
6. **QuickActions** — Export dept report, Send bulk reminder

### Tests — `backend/tests/phase9/`
- `GET /api/student/me/timeline` returns events ordered newest-first
- `?type=meeting` returns only meeting events
- `?from=&to=` date range filter works
- `page=2&limit=5` returns correct slice
- HOD login → `/hod` loads without error (frontend integration)

---

## Phase 10 — Microsoft Teams Integration
**Sprint 2 | Effort: 2 days | Risk: HIGH (Azure App Reg required)**

### Prerequisites
```bash
npm install @microsoft/microsoft-graph-client @azure/identity --prefix backend
# .env: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
# Azure App Registration: OnlineMeetings.ReadWrite (admin consent granted)
```

### New File
```
backend/src/lib/graph.js
```

### graph.js exports
- `getGraphToken()` → access token via `ClientSecretCredential`
- `createTeamsMeeting({ subject, startDateTime, endDateTime })` → `{ joinWebUrl, meetingId }`

### Integration in `mentor.routes.js`
After validation in `POST /api/mentor/me/mentees/:menteeId/meetings`:
```js
if (mode === 'Online') {
  try {
    const teams = await graph.createTeamsMeeting({ subject: topicsDiscussed, startDateTime: date, endDateTime: date });
    entry.teamsJoinUrl = teams.joinWebUrl;
  } catch (err) {
    await auditLog(req.user.id, req.user.role, 'TEAMS_LINK_FAILED', 'Meeting', 'pending', { error: err.message });
    entry.teamsJoinUrl = null;
    res.locals.warning = 'Teams link could not be generated. Please share a link manually.';
  }
}
```
Include `teamsJoinUrl` in MeetingScheduled email template.

### Tests — `backend/tests/phase10/`
- Offline meeting → `graph.createTeamsMeeting` NOT called (jest spy)
- Online meeting → `graph.createTeamsMeeting` called with correct args (mocked)
- Graph API mock throws → meeting still created with `teamsJoinUrl: null`
- `teamsJoinUrl` stored in Meeting DB row
- MeetingScheduled email includes `teamsJoinUrl` when present

---

## Phase 11 — Docker, Nginx & Deployment
**Sprint 6 | Effort: 2 days | Risk: LOW**

### New Files
```
/docker-compose.yml
/docker-compose.override.yml   ← Dev overrides (volume mounts, hot reload)
/.env.example
/nginx/nginx.conf
/backend/Dockerfile
/frontend/Dockerfile
/.github/workflows/deploy.yml
```

### docker-compose.yml Services
```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    depends_on: [api]
  api:
    build: ./backend
    env_file: .env
    depends_on: [postgres, redis]
    deploy:
      replicas: 2
  worker:
    build: ./backend
    command: node worker.js
    env_file: .env
    depends_on: [postgres, redis]
  postgres:
    image: postgres:15-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    env_file: .env
  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
volumes:
  pgdata:
  redisdata:
```

### nginx.conf Key Rules
- HTTP → HTTPS redirect (301)
- Rate limit `/api/`: 100 req/min per IP
- Rate limit `/api/auth/login`: 5 req/min per IP (stricter zone)
- Proxy `/api/` → upstream `api:3000` (load balanced across 2 replicas)
- Serve frontend: `root /app/dist; try_files $uri /index.html`
- Headers: `Strict-Transport-Security`, `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`

### CI/CD (`.github/workflows/deploy.yml`, trigger: push to main)
1. Checkout
2. `npm ci` backend + frontend
3. `npx prisma generate`
4. Run all tests phase0–phase10
5. `npm run build` frontend
6. `npx prisma migrate deploy` (staging DB)
7. `docker build` api + worker images
8. Push to Azure Container Registry
9. `az webapp config container set`
10. Smoke tests against staging URL
11. Notify team

### Tests
```bash
# infrastructure.test.sh
docker compose up --build -d
curl http://localhost/api/health     # → 200
curl http://localhost/               # → 200
# Send 101 requests, 101st → 429
```

---

## Phase 12 — Swagger Docs & Load Testing
**Sprint 5–6 | Effort: 2 days | Risk: NONE**

### Swagger
```bash
npm install swagger-jsdoc swagger-ui-express --prefix backend
```
Mount at `/api/docs`. Annotate EVERY route with `@openapi` JSDoc.
All schemas in `#/components/schemas/`. Auth: `BearerAuth` (http, bearer, JWT).

### k6 Load Tests (`tests/load/`)
| Scenario | VUs | Duration | p95 target | Error rate |
|---|---|---|---|---|
| Mentor dashboard | 500 | 30 s | < 500 ms | < 0.1% |
| Meeting create | 200 | 60 s | < 1000 ms | < 0.5% |
| Concurrent login | 300 | 30 s | < 500 ms | < 0.1% |
| Full system | 5000 | 120 s | < 2000 ms | < 1% |

---

## Phase Dependency Order

```
Phase 0 (Security)
  └─ Phase 1 (Database)
       ├─ Phase 2 (Admin + HOD)
       │    └─ Phase 9 (HOD Dashboard)
       ├─ Phase 3 (Notifications — Redis + BullMQ)
       │    ├─ Phase 4 (Tickets)
       │    └─ Phase 6 (Snapshot Engine)
       ├─ Phase 5 (Goals API)
       ├─ Phase 7 (Evidence + Blob)
       ├─ Phase 8 (Reports) ← needs Phase 6 + 7
       ├─ Phase 9 (Timeline) ← needs Phase 6
       ├─ Phase 10 (Teams)
       └─ Phase 11 (Docker)
            └─ Phase 12 (Swagger + Load Test)
```

---

## Environment Variables (.env.example)

```env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:5173
ACCESS_SECRET=change-me-access-secret-32-chars
REFRESH_SECRET=change-me-refresh-secret-32-chars
ACCESS_TTL=15m
REFRESH_TTL=7d
DATABASE_URL=postgresql://mmrms:mmrms@localhost:5432/mmrms
REDIS_URL=redis://localhost:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mmrms@institution.ac.in
SMTP_PASS=app-specific-password
SMTP_FROM=MMRMS <mmrms@institution.ac.in>
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_ACCOUNT_NAME=mmrmsstorage
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_TOKEN=your-bearer-token
```
