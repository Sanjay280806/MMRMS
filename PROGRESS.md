# MMRMS - Mentor–Mentee Relationship Management System
## Comprehensive Project Progress & Implementation Documentation

**Institution:** Kumaraguru College of Technology (KCT)  
**Department:** Computer Science and Engineering  
**Batch:** 2024–2028 (2024 BCS - III Year)  
**System Version:** 1.0.0 (Full-Stack ESM Architecture)

---

## 1. Executive Summary

The **Mentor–Mentee Relationship Management System (MMRMS)** is a full-stack, enterprise-grade academic platform built for higher education institutions. The platform digitizes and unifies the institution’s printed **Mentor–Mentee Record Book**, serving as a single source of truth for tracking student academic performance, attendance, co-curricular achievements, personal well-being, placement readiness, and institutional oversight.

The system supports four distinct role-based perspectives:
1. **Student** — Manages their personal 12-section record book, tracks SMART goals, logs achievements, and submits support requests.
2. **Mentor** — Manages assigned mentees, conducts and records mentoring sessions, monitors risk indicators, sets SMART goals, and logs parent interactions.
3. **Class Advisor** — Oversees class-wide academic health, monitors attendance & discipline watchlists, conducts class meetings, and manages student grievances.
4. **Year Coordinator** — Monitors year-level compliance, tracks mentor meeting completion rates, approves On-Duty (OD) requests, schedules department events, and exports NAAC/NBA audit evidence.

---

## 2. Technical Architecture & Stack

### Frontend Architecture
- **Framework:** React 18+ (Vite ESM bundler)
- **Styling:** Vanilla CSS with custom Tailwind CSS Design Tokens matching institutional color palettes (Indigo/Brand, Ink, Canvas, Good, Warning, Rose).
- **State & Data Fetching:** Custom `useResource` hook providing reactive data loading, refetching, mutation handlers, and error boundaries.
- **Layout & Components:** Modular component hierarchy (`ConsoleLayout`, `Sidebar`, `Topbar`, `ProfileHeader`, `StatTile`, `DataTable`, `SectionCard`, `HealthBadge`).

### Backend Architecture
- **Runtime:** Node.js (Native ES Modules / ESM)
- **API Framework:** Express.js REST API
- **Authentication & Security:** 
  - Token-based Bearer authentication (`mmrms.token` in `localStorage`).
  - Security Rate Limiter: Account lockout after 5 consecutive failed login attempts with a 15-minute cooldown window.
  - Role-Based Access Control (RBAC) middleware verifying permissions per route.
- **Data Persistence:** In-memory reactive institutional data store (`store.js`) populated by seed data (`seed.js`) containing 40 student records of the 2024 BCS batch.

---

## 3. Step-by-Step Implementation Breakdown

### Phase 1: Institutional Schema & Seed Data Initialization
- **What was done:** Designed the database schema mapping directly to the physical 12-section Mentor–Mentee Record Book.
- **How it was done:**
  - Created `seed.js` featuring 40 real student records for the 2024 BCS batch (Computer Science and Engineering).
  - Configured staff assignment mapping:
    - **Bharathi Priya** (`bharathi.priya@kct.ac.in`) — Mentor (33 Mentees, Section A).
    - **Asmitha Shree** (`asmitha.shree@kct.ac.in`) — Mentor (7 Mentees, Section B).
    - **Suganthi** (`suganthi@kct.ac.in`) — Class Advisor (2024 BCS).
    - **Anitha P** (`anitha.p@kct.ac.in`) — Year Coordinator (2024 BCS).
  - Initialized student records with SGPA/CGPA history, attendance logs, arrear history, skill self-assessments, certifications, and well-being indicators.

---

### Phase 2: Authentication & Security Subsystem
- **What was done:** Built authentication routes, password hashing, session management, and login UI customization.
- **How it was done:**
  - Configured `auth.routes.js` and `auth.js` middleware supporting login, session verification (`/api/auth/me`), and logout.
  - Implemented failed attempt tracking to lock accounts for 15 minutes after 5 bad password attempts.
  - Designed `Login.jsx` featuring glassmorphism design, institutional branding, quick-fill demo account buttons for active roles (Mentor & Student), and time-aware session initialization.
  - Cleaned login interface by removing advisory password rule clutter and streamlining role choices.

---

### Phase 3: The 12-Section Student Record Book Engine
- **What was done:** Digitized all 12 core sections of the institutional Record Book.
- **How it was done:**
  - **Section 1: Profile & Academic Background** — First-meeting interview data, entry mode (Regular/Lateral), family details, skill self-assessment matrix (Programming, Communication, Problem Solving), and career aspirations.
  - **Section 2: Academic Performance Tracker** — Semester-wise SGPA/CGPA progression charts, earned credits, target CGPA setting.
  - **Section 3: Attendance Monitoring** — Monthly attendance tracking, overall percentage calculation, and automated shortfall alerts (<75%).
  - **Section 4: Course Performance** — Internal assessment (IAT-1, IAT-2) marks, assignment scores, and course-wise grade logs.
  - **Section 5: Arrear & Backlog Tracking** — Standing arrears, cleared arrear history, attempt counts, and remediation plans.
  - **Section 6: Participation Record** — Technical symposiums, hackathons, sports, cultural events, and paper presentations.
  - **Section 7: Certification Tracker** — NPTEL, Coursera, Value-Added Courses (VAC), and industry certifications.
  - **Section 8: Placement Readiness** — Aptitude practice scores, LeetCode/CodeChef ratings, resume status, and mock interview performance.
  - **Section 9: Internship & Project Details** — Mini-projects, capstone projects, industrial visits, and company internships.
  - **Section 10: Student Well-being & Counseling** — Health indicators, stress assessment, mentor observation notes, and referral logs.
  - **Section 11: Parent-Institute Interaction** — Detailed logs of parent calls, in-person meetings, discussed topics, and parent feedback.
  - **Section 12: Mentor Meeting History & SMART Goals** — One-on-one session records, assigned action items with deadlines, and SMART goal progress tracking.

---

### Phase 4: Mentor Management Console
- **What was done:** Developed the Mentor workstation for monitoring assigned mentees, logging meetings, and reviewing health indicators.
- **How it was done:**
  - **Overview Dashboard (`MentorDashboard.jsx`):** Stat tiles displaying total mentees, attendance shortfalls (<75%), standing arrears, well-being concerns, overdue meetings, and open action items.
  - **Mentee Roster (`Roster.jsx`):** Filterable, searchable list of mentees with instant health badges and direct access to full record books.
  - **Meeting Recorder:** Form allowing mentors to log 1-on-1, group, or emergency mentoring sessions, attach action items, and schedule follow-ups.
  - **Parent Interaction Log (`ParentLog.jsx`):** Dedicated workflow for recording parent communication.
  - **Action Item Queue & SMART Goals:** Workflows to track pending tasks and evaluate goal completion.
  - **Term Reports & Timeline:** Automated generation of term mentoring summaries and chronological activity timelines.

---

### Phase 5: Oversight Console (Class Advisor & Year Coordinator)
- **What was done:** Integrated institutional oversight for class care, department administration, and accreditation compliance.
- **How it was done:**
  - **Class Advisor View (`AdvisorConsole`):**
    - Class statistics & paginated directory of students across sections.
    - Attendance & academic watchlists for proactive intervention.
    - Class meetings management.
    - Student Grievance Lifecycle (Raise -> Refer to Coordinator -> Resolve -> Close).
  - **Year Coordinator View (`CoordinatorConsole`):**
    - Year-wide overview & program-level health analytics.
    - Mentor Compliance Tracker monitoring meeting completion percentages for all department mentors.
    - Institutional Events Calendar (Parent-Teacher Meetings, Reviews, Orientations).
    - On-Duty (OD) Leave Request approval/rejection engine.
    - NAAC/NBA Audit Evidence Panel aggregating system logs and documentation readiness metrics.

---

### Phase 6: Institutional Branding, UX Refinement & Personalization
- **What was done:** Enhanced topbar navigation, personalized user greetings, and cleaned login UI.
- **How it was done:**
  - Implemented dynamic, time-aware greetings in `Topbar.jsx` (e.g., `"Good morning, Bharathi Priya"`, `"Good evening, Suganthi"`) across all role consoles.
  - Configured institutional details for **Kumaraguru College of Technology (KCT)**.
  - Updated Year Coordinator references to **Anitha P** (`anitha.p@kct.ac.in`).
  - Optimized layout components (`ConsoleLayout`, `Sidebar`, `ProfileHeader`) for responsive desktop and mobile displays.

---

## 4. Key API Endpoints Implemented

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/login` | `POST` | Public | Authenticates user credentials & returns Bearer token. |
| `/api/auth/me` | `GET` | Authenticated | Fetches current user session profile. |
| `/api/mentor/me/overview` | `GET` | Mentor | Fetches mentor dashboard metrics, watchlists, & mentee roster. |
| `/api/mentor/mentees/:id/record-book` | `GET` | Mentor | Retrieves full 12-section record book for a specific mentee. |
| `/api/mentor/meetings` | `POST` | Mentor | Logs a new mentoring session and generates action items. |
| `/api/student/me/record-book` | `GET` | Student | Fetches current student's complete record book. |
| `/api/student/me/entries` | `POST` | Student | Adds student self-reported participation or certification. |
| `/api/advisor/me/overview` | `GET` | Advisor | Fetches class advisor statistics, directory, & watchlists. |
| `/api/advisor/grievances/:id/status` | `PATCH` | Advisor | Updates status of student grievance. |
| `/api/coordinator/me/overview` | `GET` | Coordinator | Fetches year-level metrics, mentor compliance, & audit summary. |
| `/api/coordinator/od-requests/:id` | `PATCH` | Coordinator | Approves or rejects student On-Duty leave request. |

---

## 5. Verification & Operational Status

- **Backend API Server:** Node.js Express server running on `http://localhost:4000`.
- **Frontend Development Server:** Vite React application running on `http://localhost:5173`.
- **Test Coverage & Integrity:** Verified API routes, data mutations, RBAC access control, session persistence, and responsive UI components.

---
*Documentation compiled automatically for MMRMS Workspace.*
