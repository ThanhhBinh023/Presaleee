"""
Data Definitions for 10 Enterprise Presale Scenarios:
1. Retail Omnichannel OMS & WMS (NovaRetail)
2. FinTech Digital Banking & Micro-Lending (ApexCredit)
3. HealthTech Hospital Information System & EHR (MediCare Network)
4. Hospitality Boutique Hotel Chain PMS (Coastal Stay Hotels)
5. Logistics Fleet Telematics & Route Optimization (TransOcean Freight)
6. EdTech Interactive Learning & AI Proctoring (EduVantage Academy)
7. PropTech Commercial Real Estate & Smart Tenant Portal (Horizon Towers)
8. On-Demand Multi-Vendor Grocery & Food Delivery Super-App (QuickDrop Express)
9. Enterprise Cloud HRM, Payroll & OKRs (TalentoHR Global)
10. Industrial IoT Predictive Maintenance & Energy Telemetry (PrecisionSteel)
"""

# Standard Rate Card Template (shared across projects, customized slightly if needed)
DEFAULT_RATE_CARD = [
    ("Solution Architect", "Principal", 87.50, 700.00, 3500.00, "12+ yrs enterprise architecture, cloud certified"),
    ("Project Manager / Scrum Master", "Senior", 68.75, 550.00, 2750.00, "8+ yrs Agile management, PMP / PMI-ACP"),
    ("Technical Lead", "Lead", 75.00, 600.00, 3000.00, "10+ yrs distributed systems, code quality governance"),
    ("Senior Backend Engineer", "Senior", 60.00, 480.00, 2400.00, "6+ yrs microservices, database performance, APIs"),
    ("Senior Frontend Engineer", "Senior", 57.50, 460.00, 2300.00, "6+ yrs modern React, SSR, UI/UX implementation"),
    ("Senior Mobile Engineer", "Senior", 60.00, 480.00, 2400.00, "6+ yrs native & Flutter, offline sync, hardware APIs"),
    ("QA / Automation Test Lead", "Senior", 50.00, 400.00, 2000.00, "7+ yrs test automation, Cypress, load testing"),
    ("UI/UX Product Designer", "Senior", 52.50, 420.00, 2100.00, "7+ yrs enterprise design systems, usability testing"),
    ("DevOps / Cloud Engineer", "Senior", 65.00, 520.00, 2600.00, "6+ yrs AWS/GCP, Kubernetes, Terraform IaC"),
    ("Business Analyst", "Senior", 55.00, 440.00, 2200.00, "6+ yrs domain workflows, specification sign-off"),
    ("Security & Compliance Specialist", "Lead", 85.00, 680.00, 3400.00, "10+ yrs cybersecurity, SOC2/PCI/HIPAA audit")
]

DEFAULT_PM_SECTIONS = [
    ("1. AGILE DELIVERY FRAMEWORK & SPRINTS", [
        ("Sprint Duration", "2 Calendar Weeks per Sprint."),
        ("Sprint Planning", "Alternate Mondays (9:00 AM - 11:00 AM). User stories estimated via Fibonacci planning poker."),
        ("Daily Standup", "15-minute daily sync at 9:30 AM via Slack/Google Meet: Yesterday, Today, Blockers."),
        ("Sprint Review & Live Demo", "Alternate Fridays (3:00 PM - 4:00 PM). Live functional demonstration in Staging."),
        ("Sprint Retrospective", "Alternate Fridays (4:00 PM - 5:00 PM). Continuous process improvement and velocity review.")
    ]),
    ("2. TOOLING & COLLABORATION PLATFORMS", [
        ("Project Management & Backlog", "Jira Software – Epics, User Stories, Bug tracking, Sprint Burndown Charts."),
        ("Documentation & Knowledge Base", "Confluence – Architecture Decision Records (ADRs), API specs, Runbooks."),
        ("Version Control & CI/CD", "GitHub Enterprise – Trunk-based development, 2 peer approvals per PR, automated tests."),
        ("UI/UX Design Collaboration", "Figma – Design systems, mobile viewports, click-through interactive prototypes."),
        ("Real-Time Communications", "Slack – Dedicated shared channels (#project-daily, #project-tech-dev, #project-announcements).")
    ]),
    ("3. QUALITY GOVERNANCE & CODE REVIEW GATES", [
        ("Code Review Standards", "Every PR requires 2 peer approvals (including Tech Lead). Automated linter and formatting checks."),
        ("Automated Test Gates", "SonarQube scan: 0 critical vulnerabilities, < 3% code duplication, >= 80% unit test coverage."),
        ("Deployment Automation", "Automated deployment to Dev on merge; automated Staging deployment on sprint release tag.")
    ]),
    ("4. SCOPE CHANGE MANAGEMENT PROCEDURE (CR)", [
        ("Change Request Trigger", "Any requirement deviation exceeding 10% of agreed Functional Requirements baseline."),
        ("Impact Assessment", "Vendor PM & Architect evaluate budget, timeline, and dependencies within 48 business hours."),
        ("Commercial Agreement", "Formal Change Order document signed off by Client Sponsor prior to execution.")
    ])
]

DEFAULT_DOD_ITEMS = [
    ("Criterion 1: Code Review", "All code committed to feature branch, passed linter, approved by 2 senior developers via GitHub PR."),
    ("Criterion 2: Automated Tests", "Unit tests written and passing with >= 80% code coverage. Automated integration tests pass."),
    ("Criterion 3: Security & Quality", "SonarQube scan passes with 0 Blocker/Critical bugs and 0 high-severity security vulnerabilities."),
    ("Criterion 4: Deployment & Config", "Code automatically deployed to Staging with database migration scripts verified idempotently."),
    ("Criterion 5: Documentation", "API documentation generated via OpenAPI/Swagger. Architecture decisions recorded in Confluence."),
    ("Criterion 6: Acceptance Sign-off", "Client Product Owner verifies story in Staging and marks Jira story 'Accepted'.")
]

DEFAULT_SLA_DATA = [
    ("P1 – Blocker", "Critical system outage, total data loss risk, or complete stoppage of core checkout/operations.", "Core transaction engine crashes; all user transactions cease.", "< 1 Hour", "< 4 Hours", "Blocks Milestone Go-Live (Zero P1 tolerated)"),
    ("P2 – Critical", "Major feature unusable with no reasonable workaround available for staff or users.", "Primary workflow crashes on specific supported browser/device.", "< 2 Hours", "< 8 Hours", "Blocks Milestone Go-Live (Zero P2 tolerated)"),
    ("P3 – Major", "Feature failure but reasonable manual workaround exists without business disruption.", "Non-critical notification fails to trigger; alternative channel delivers status.", "< 4 Hours", "< 24 Hours", "Max 3 open P3 allowed with approved fix plan"),
    ("P4 – Minor", "Cosmetic, minor UI alignment issue, or minor typo with zero functional impact.", "Dashboard chart legend overlaps slightly on mobile viewport resolution.", "< 8 Hours", "< 72 Hours", "Resolved in subsequent scheduled patch release")
]

