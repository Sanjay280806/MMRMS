# MMRMS Implementation Plan & FAQ

This document outlines the implementation strategies for the new requirements and answers the specific architectural and process questions raised.

## 1. Role Consolidation and Access Adjustments
**Current State:** 4 roles (Student, Mentor, Class Advisor, Year Coordinator), with some overlap/incorrect implementation.
**New State:** 4 defined roles: Student, Mentor, Year Coordinator (YC), and HOD.

*   **Year Coordinator (YC) Access:** The YC will have dashboard access mapped to a specific cohort/batch (e.g., all 2nd-year students). They will have read-only access to all student profiles and mentor dashboards within their assigned cohort. The database schema will map YC `userId` to a `CohortId` (e.g., "24BCS").
*   **HOD Access:** HOD has super-access across the entire department. The HOD dashboard will aggregate data across all cohorts (all YCs, Mentors, and Students), allowing them to oversee YC activity and overall departmental performance.

---

## 2. Answers to Specific Questions

### Q1: What happens when a Year Coordinator (YC) or Mentor leaves the college? How is the migration process handled and who does it?
**Answer:** 
The migration process will be handled by the **HOD** directly from the UI.
*   **For Year Coordinators:** The HOD dashboard will have a "Cohort Management" tab. When a YC leaves, the HOD clicks "Reassign YC". A dropdown will allow them to select a new faculty member. The old YC's account is then marked as `Archived` (soft-deleted). All historical records created by the old YC remain intact for auditing, but the new YC instantly gains access to the cohort.
*   **For Mentors:** Similarly, the HOD or YC can access a "Mentor Reassignment" tool. They can bulk-select mentees assigned to the departing mentor and reassign them to a new mentor. The departing mentor's account is then archived.

### Q2: For passed out batches (e.g., 2024 batch graduating in 2028), how do we represent them so new data isn't mixed with old data? How is separation done automatically based on roll numbers (e.g., 24BCS)?
**Answer:**
*   **Automatic Cohort Assignment:** During student onboarding, the backend will parse the first two digits of the roll number (e.g., "24" from "24BCS") to determine the admission year. It will automatically assign a `CohortId` (e.g., `BATCH_2024_2028`).
*   **Graduation Archiving:** The system will use a cron job or background scheduled task that runs annually. When the current year exceeds the batch's expected graduation year, the entire cohort status is flipped from `ACTIVE` to `ALUMNI`.
*   **Data Separation:** YC and HOD dashboards will default to filtering queries by `status = 'ACTIVE'`. This automatically hides passed-out batches from daily metrics, preventing a mess. If an HOD wants to view older data, they simply use a UI toggle: "View Alumni Data", which queries the archived cohorts.

### Q3: How do we aggregate subject-wise attendance (Theory and Lab) from MyCamu if the course has the same Course ID?
**Answer:**
The `IntegrationService` will pull raw attendance logs from MyCamu.
*   The backend will group these records by `CourseId`.
*   For a given `CourseId`, if records exist for both Theory and Lab, the aggregator will sum the `Total Hours Conducted` (Theory + Lab) and `Total Hours Present` (Theory + Lab).
*   The unified percentage `(Total Present / Total Conducted) * 100` is then calculated and stored in our database against that `CourseId` for the current semester, providing a clean, single subject-wise attendance view in the UI.

### Q4: How do we handle deletion of older marks, keeping only the last sem marks and arrears without making it hectic?
**Answer:**
We will implement an automated **Data Retention Policy**.
*   The database schema for academic performance will tag records with a `Semester` identifier.
*   The frontend will only actively fetch and display `Current Semester` and `Previous Semester` detailed marks.
*   **Automated Archiving:** Older continuous assessment marks will be automatically purged or moved to cold storage (archived JSON blob) upon the start of a new academic year, retaining only the final CGPA and any uncleared/standing arrears. This ensures the portal remains lightweight and the UI uncluttered without requiring any manual deletion effort from students or mentors.

### Q5: How can we automate "Record a Meeting" using MS Teams and Read.ai integration to track action items without the mentor manually typing everything?
**Answer:**
*   **Teams + Read.ai Integration:** The HOD will authorize MMRMS as an Enterprise App in Azure/Teams. When a mentor schedules an online meeting via the portal, it generates a Teams link.
*   **Auto-filling the Form:** Read.ai (or Teams Premium Recap API) processes the meeting transcript. We will set up a Webhook in our backend. Once the meeting ends, Read.ai sends the summary payload to our Webhook. An internal LLM prompt extracts specific sections: *Student Concerns*, *Mentor Suggestions*, and *Action Items*.
*   **Workflow:** The mentor opens the "Record a Meeting" form, which is now prepopulated with the AI-extracted data. The mentor simply reviews it, makes minor edits if needed, and clicks submit.
*   **Tracking Action Items:** The extracted action items are saved to the `ActionItem` table with a status of `PENDING`. They instantly appear on the student's dashboard.

### Q6: How should the "Raise a Concern" feature work so mentors can address it, add evidence, and acknowledge it?
**Answer:**
1.  **Raise:** Student clicks "Raise a Concern", selects a category, and submits. It enters the `Grievances/Concerns` table as `OPEN`.
2.  **Address:** The mentor receives a notification and sees it in their "Action Item Queue". They click "Address Concern", which opens a modal.
3.  **Evidence:** The modal provides a text box for the resolution and a file upload button (connected to Azure Blob Storage) to attach evidence (e.g., email approvals, fee receipts). The mentor submits, changing the status to `RESOLVED`.
4.  **Acknowledge:** The student dashboard flags the concern as "Pending Acknowledgment". The student reviews the mentor's resolution, clicks "Acknowledge", and the concern is formally closed.
