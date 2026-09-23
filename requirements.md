# System Requirements & Data Dependencies for MMRMS

To: Head of Department (HOD)
From: MMRMS Development Team

To successfully launch and integrate the Mentor-Mentee Relationship Management System (MMRMS) with the college's existing infrastructure, we require specific data access and licenses. Please find the detailed dependencies below:

## 1. Microsoft Ecosystem Integration (For Automated Meetings)
To automate the "Record a Meeting" process (auto-generating minutes, extracting action items, and reducing mentor workload), we need access to the college's Microsoft infrastructure.
*   **Microsoft A3/A5 Licenses:** Required for mentors to utilize advanced Teams features (like transcripts/recording).
*   **Azure App Registration (Admin Consent):** The IT department must approve an Azure Active Directory (AAD) App Registration for MMRMS. This allows our backend to communicate securely with the Microsoft Graph API to create Teams meetings and fetch post-meeting transcripts.

## 2. ERP / MyCamu Data Dependencies
To provide an automated, single pane of glass for mentors and students without manual data entry, we need API access or regular data dumps (CSV/SQL views) from the college ERP (MyCamu):
*   **Student Master Data:** Basic profile information (Name, Roll Number, DOB, Contact Info, Parent details, Admission Year). 
*   **MyCamu Attendance Data:** Subject-wise attendance records (Theory and Lab). We need `Course ID`, `Total Hours Conducted`, and `Total Hours Present` to aggregate and display accurate percentages dynamically.
*   **Academic / Arrear Data:** Continuous Assessment (internal) marks for the current/previous semester, final semester grades, and historical standing arrear data. 
*   **Course Data:** Mapping of `Course IDs` to `Course Names` and identifying which courses have combined Theory/Lab components.

## 3. Faculty & Role Mapping Data
To ensure access control and correct dashboard views:
*   **Faculty Master Data:** Names, Emails, and Staff IDs of all department faculty.
*   **Role Mapping Registry:** A mapping sheet identifying who acts as a Mentor and who acts as a Year Coordinator (YC) for specific batches (e.g., 24BCS). This is crucial for configuring the RBAC (Role-Based Access Control) correctly at launch.

## 4. Infrastructure / Database
*   **Database Hosting:** A provisioned PostgreSQL database (cloud or on-premise) to serve as the primary data store for MMRMS (managing meeting logs, concerns, and action items not stored in MyCamu).
*   **Cloud Storage:** Azure Blob Storage (or equivalent AWS/GCP) for storing uploaded evidence (e.g., file attachments for placement readiness, internship certificates, or concern resolution evidence).

*Approval and provisioning of these dependencies will allow us to fully automate the portal and significantly reduce the administrative burden on our faculty.*
