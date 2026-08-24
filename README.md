# MMRMS — Mentor–Mentee Relationship Management System

Kumaraguru College of Technology. The institution's **Mentor–Mentee Record
Book**, built as a web application: the cover page, Section 1's first-meeting
profile, and Sections 2–12.

```
MMRMS/
├── backend/     Express REST API (Node 18+, ESM)
└── frontend/    React 18 + Vite + Tailwind CSS
```

## Running it

Two terminals.

```bash
# 1 — API on http://localhost:4000
cd backend
cp .env.example .env      # first time only
npm install
npm run dev

# 2 — web client on http://localhost:5173
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to the backend, so the browser only ever talks to one
origin. If 5173 is busy: `npm run dev -- --port 5180`.

## Demo accounts

Password for all of them: `mmrms@2026`

| Role | Email | Lands on |
| --- | --- | --- |
| Student | `abhinav.dinesh@kct.ac.in` | Their own record book |
| Mentor | `bharathi.priya@kct.ac.in` | Mentor console + every mentee's record book |
| Mentor | `asmitha.shree@kct.ac.in` | Mentor console for the KCT01765 group |
| Class Advisor | `suganthi@kct.ac.in` | Class advisor console |
| Year Coordinator | `anitha.p@kct.ac.in` | Year coordinator console |

Five consecutive failed sign-ins lock an email for 15 minutes, with a live
countdown from the API.

## How the record book maps onto the app

Every signed-in view opens with the person's **profile header** — the record
book's cover page — and the sidebar lists every section, grouped in book order.

### Student · "My Record Book"

| Sidebar item | Record book |
| --- | --- |
| Profile & Background | Cover page + Section 1A (Academic Background) + 1B (Career Aspirations) |
| Skills & Assessment | Section 1C (Skill Assessment, 1–5) + 1E (Self Assessment) + 1F (Mentor Initial Assessment) |
| Performance Tracker | Section 2 — GPA, CGPA, standing/new/cleared arrears per semester |
| Attendance Monitoring | Section 3 — review date, %, shortage, action taken |
| Course Performance | Section 4 — CIA 1, CIA 2, Model (+ per-subject attendance) |
| Arrear Tracking | Section 5 — subject, semester, status, action plan, target |
| Participation Record | Section 6 — technical / co-curricular / extra-curricular |
| Certifications | Section 7 — certification, platform, status, completion date |
| Placement Readiness | Section 8 — all seven checklist items |
| Internship & Project | Section 9 — company, project, faculty guide, progress |
| Well-being | Section 10 — all six aspects |
| Parent Interactions | Section 11 — date, mode, discussion, action |
| Meeting Log | Section 12 — full minutes (below) |
| SMART Goals | Section 12's goal-progress table, tracked across meetings |
| Contact Mentor | Concerns raised *between* meetings |

### Section 12 renders as the printed minutes

Meeting number, date, duration, mode · the six-item **agenda checklist** ·
topics discussed, student concerns, mentor suggestions, support required ·
the **action items table** (task / responsible / target date / status) ·
progress since last meeting (achievements, pending, improvement) · SMART goal
progress · mentor and student remarks · next review date · **both signature
lines**.

### Mentor console

Own profile header, then: Dashboard · My Mentees · four watch lists
(**Attendance** §3, **Arrears** §5, **Well-being** §10, **Overdue Meetings**
§12) · Action Items §12 · SMART Goals · Parent Log §11 · Term Reports ·
Activity Timeline.

Opening a mentee shows **their complete record book**, rendered by the same
components the student sees — so the mentor's copy and the student's own can
never disagree.

The **Record a Meeting** action writes a structured Section 12 session with
date, discussion, action item, due date, and next review date.

### Class advisor console

The class advisor has a consolidated 2024 BCS dashboard with a server-paginated
student directory, attendance and academic watch lists, a transparent discipline
register, mentor coordination tracker, class committee/feedback meeting log, and
grievance workflow (raise, refer, resolve, close).

### Year coordinator console

The year coordinator has a year-wide dashboard for student risk, mentor
compliance, attendance, academic tracker, PTM/orientation/review calendar,
external-event OD approvals, and audit/accreditation-ready evidence coverage.

## The health index

The one derived number in the system. It exists to triage the 40-student initial
roster, and
**every dimension is computed from record-book fields** — nothing is invented:

| Dimension | Weight | Computed from |
| --- | --- | --- |
| Academic | 0.25 | Section 2 — CGPA, minus 8 points per standing arrear |
| Attendance | 0.20 | Section 3 — the latest review |
| Interaction | 0.20 | Section 12 — meetings held vs due, and action items closed |
| Career | 0.15 | Sections 7 & 8 — certification progress and readiness checklist |
| Well-being | 0.20 | Section 10 — flagged aspects, over a 60-point band |

The panel shows the source line under each bar. Change a record-book field and
the index moves: marking one readiness item complete took the demo student from
75 → 77; closing one action item took it to 78.

Shared thresholds everywhere a score is coloured: `< 50` red, `< 70` amber,
otherwise green. Attendance below the 75% requirement is always red.

## API

Under `/api`; everything but `/auth/*` needs `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/auth/context` | Institution details and the role matrix |
| POST | `/auth/login` | Sign in |
| GET | `/auth/me` | Restore a session |
| GET | `/student/me/record-book` | The complete record book |
| PATCH | `/student/me/skills/:skill` | §1C — set a 1–5 rating |
| PATCH | `/student/me/self-assessment` | §1E |
| POST | `/student/me/participation/:group` | §6 — technical / co-curricular / extra-curricular |
| POST | `/student/me/certifications` | §7 |
| PATCH | `/student/me/placement-readiness/:item` | §8 |
| PATCH | `/student/me/action-items/:id` | §12 — close an action item |
| POST | `/student/me/goals/:id/acknowledge` | Accept an assigned goal |
| POST | `/student/me/support-requests` | Raise a concern |
| POST | `/student/me/messages` | Message the mentor |
| GET | `/mentor/me/overview` | Stats, flagged students, watch lists, cohort radar |
| GET | `/mentor/me/mentees?sort=risk\|attendance\|meetings\|name` | Roster |
| GET | `/mentor/me/mentees/:id` | One mentee's full record book |
| GET | `/mentor/me/goals` | SMART goals across the roster |
| GET | `/mentor/me/action-items` | Open action items across the roster |
| GET | `/mentor/me/parent-log` | §11 across the roster |
| GET | `/mentor/me/reports` | Eight term-report tiles |
| GET | `/mentor/me/timeline` | Activity feed |
| POST | `/mentor/me/mentees/:id/meetings` | Record a structured mentoring session |
| GET | `/advisor/me/overview` | Class dashboard, watches, grievances and meetings |
| GET | `/advisor/me/students?page&limit&student&class&year` | Filtered, paginated class directory |
| POST | `/advisor/me/class-meetings` | Schedule a class committee/feedback meeting |
| POST/PATCH | `/advisor/me/grievances` | Create or update a grievance workflow item |
| GET | `/coordinator/me/overview` | Year dashboard, mentor tracker, events, OD and audit data |
| GET | `/coordinator/me/students?page&limit&student&class&year` | Filtered, paginated year directory |
| POST | `/coordinator/me/events` | Add PTM, orientation or review event |
| PATCH | `/coordinator/me/od-requests/:id` | Approve or reject an OD request |

Responses carry the presentation decisions the server owns — status labels and
tone names (`green`, `amber`, `rose`, `indigo`, `slate`) — so the two consoles
can't disagree about what "at risk" means.

### Data

`backend/src/data/seed.js` holds every fixture in record-book shape, including
the provided 40-student 2024 BCS roster: KCT01763 is assigned to **Bharathi
Priya** and KCT01765 to **Asmitha Shree**. **Suganthi** is the class advisor and
**Anitha P** is the year coordinator.
`store.js` clones it into memory at boot; writes persist for the life of the
process. A mentee's record book is *derived* from a dozen roster facts by
`services/mentee.js`, then passed through the **same builder** the signed-in
student uses — one derivation path, so no drift.

## Frontend structure

```
src/
├── api/client.js            fetch wrapper: bearer token, ApiError
├── auth/                    AuthContext, RequireRole route guard
├── lib/tone.js              the one tone → Tailwind class map
├── lib/chart.js             SVG geometry
├── hooks/                   useResource, useCountUp
├── components/
│   ├── ui/                  Card, SectionCard, Badge, Button, Field, StatTile,
│   │                        DataTable, DefinitionList, RatingMeter, Tabs,
│   │                        ProgressBar, Avatar, EmptyState, Skeleton,
│   │                        ErrorBoundary, Logo
│   ├── charts/              RadarChart, DonutChart, BarSeries, TrendChart,
│   │                        Sparkline, GaugeRing
│   ├── profile/             ProfileHeader, HealthDial
│   ├── record/              THE RECORD BOOK — SectionOne, Academics, Growth,
│   │                        MeetingLog, Goals, HealthPanel
│   ├── auth/                BrandPanel, PasswordRules, AlertBanner, DemoAccounts
│   └── layout/              Sidebar (grouped), Topbar, ConsoleLayout
└── pages/
    ├── Login.jsx
    ├── student/StudentRecordBook.jsx + AddEntry + ContactMentor
    └── mentor/MentorConsole.jsx + MenteeRecordBook + sections/
```

`components/record/` is the heart of it: those components render both the
student's own book and the mentor's copy of a mentee's.

### Design tokens

No hex values in JSX. Colours, fonts, radii and shadows live in
`tailwind.config.js`; semantic colour lives in `lib/tone.js`. A component asks
for a tone name, never a colour. Type: **Fraunces** display, **Inter** UI.

## What was removed, and what was added

Removed as not in the record book:

- The five-stage IT ticket pipeline (Raised → Assigned → Escalated → Resolved →
  Acknowledged). Concerns are now a simple log; the record book tracks student
  concerns and support required inside Section 12.
- The invented "engagement score" tile — replaced by Section 12's real
  meeting-and-action-item figures.
- The generic "achievements" list — replaced by Section 6's three specific
  groups.
- Free-standing "recommendations" — folded into Section 1F's Recommendations
  and Section 12's Mentor Suggestions.

Added, each supporting a field the book already asks for:

- **Register Number, Date of Birth, Parent/Guardian, Parent Contact, Address,
  Year Coordinator** — cover-page fields the earlier build omitted.
- **Per-subject attendance** in Section 4, because Section 3's "Shortage" field
  has to name a subject.
- **Running CGPA** in Section 2, derived from the GPA column rather than typed.
- **Blood group, day scholar/hosteller** — routinely on the printed cover page.
- Roster **watch lists** — Sections 3, 5, 10 and 12 pivoted across all mentees,
  since a mentor holds 12 books at once.

Everything the book specifies is present; nothing invented is presented as if
it came from the book.
