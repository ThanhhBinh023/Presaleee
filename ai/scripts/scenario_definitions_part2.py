"""
Scenarios 6, 7, 8, 9, 10:
6. EdTech Interactive Learning & AI Proctoring (EduVantage Academy)
7. PropTech Commercial Real Estate & Smart Tenant Portal (Horizon Towers)
8. On-Demand Multi-Vendor Grocery Delivery Super-App (QuickDrop Express)
9. Enterprise Cloud HRM, Payroll & OKRs (TalentoHR Global)
10. Industrial IoT Predictive Maintenance & Energy Telemetry (PrecisionSteel)
"""

from proposals_data_definitions import (
    DEFAULT_RATE_CARD,
    DEFAULT_PM_SECTIONS,
    DEFAULT_DOD_ITEMS,
    DEFAULT_SLA_DATA
)

# =====================================================================
# SCENARIO 06: EDTECH INTERACTIVE LEARNING & AI PROCTORING
# =====================================================================
def get_scenario_06():
    rfp_meta = {
        "title": "NEXT-GEN INTERACTIVE LMS & SECURE AI PROCTORING PLATFORM – RFP",
        "client": "EduVantage Global Academy Ltd",
        "date": "15 October 2026",
        "contact": "Prof. Arthur Pendelton – Provost & Head of Digital Learning (arthur.p@eduvantage.example | +61 3 9888 7766)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Institution", "EduVantage Global Academy Ltd (Higher Education & Professional Certification)"),
            ("Scale", "65,000 active students across Australia, UK, and Southeast Asia. 2,400 courses offered annually."),
            ("Contact", "Prof. Arthur Pendelton – Provost & Head of Digital Learning\nDr. Clara Song – Director of Academic Assessment")
        ]},
        {"section": "Current Challenges", "items": [
            ("Current Setup", "Legacy Moodle LMS paired with disparate Zoom sessions. Manual proctoring requiring 1 invigilator per 15 students."),
            ("Pain Points", "- High exam cheating rates and impersonation during remote finals.\n- Moodle servers crash during peak submission windows.\n- Lack of mobile video offline learning and real-time interactive quizzes.\n- Gradebook reconciliation takes 3 weeks post-semester.")
        ]},
        {"section": "Target Solution", "items": [
            ("In Short", "Cloud-native microservices LMS with real-time video classrooms, automated AI exam proctoring (gaze/face/sound detection), and cross-platform student/teacher apps."),
            ("Key Requirements", "- Automated AI proctoring with live flagging of suspicious behavior.\n- Micro-credential badges, SCORM/xAPI compliance.\n- Low-latency live video seminars for up to 500 students.\n- Mobile app supporting offline lesson caching and push notifications.")
        ]},
        {"section": "Integrations & Constraints", "items": [
            ("Integrations", "Canvas LMS API, Zoom Video SDK, Turnitin Plagiarism Engine, Stripe / Flywire tuition payments, Workday SIS."),
            ("Timeline & Budget", "Timeline: 20 weeks. Budget: AUD $190,000 - $220,000. Compliance: FERPA, GDPR, and ISO 27001.")
        ]}
    ]
    p_data = {
        "title": "PROPOSAL: NEXT-GEN INTERACTIVE LMS & AI PROCTORING PLATFORM",
        "client": "EduVantage Global Academy Ltd",
        "proposal_id": "PRP-2026-EDV-06",
        "date": "18 October 2026",
        "duration_weeks": 20,
        "total_mandays": 320,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "EduVantage Global Academy Ltd", "Presale Solution Lead", "Dr. Kevin Liang (Principal EdTech Architect)"),
                ("Project Code", "PBL6-EDV-LMS-2026", "Delivery Manager", "Sarah Jenkins (Senior Agile Delivery Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial)", "Target Kick-off", "16 November 2026"),
                ("Primary Objective", "Deliver Scalable Cloud LMS, Mobile Apps, and AI-Powered Remote Proctoring Engine", "Total Delivery Duration", "20 Calendar Weeks (10 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "EduVantage faces high invigilation costs ($180k/semester) and exam integrity risks. Legacy LMS cannot handle concurrent examination loads of 15,000 students.", "", ""),
                ("Proposed Strategic Solution", "We propose 'EduVantage Cloud LMS & ProctorAI': AWS EKS auto-scaling learning portal with WebRTC live classrooms, on-device AI proctoring analyzing webcam and audio feeds, and automated Turnitin similarity scoring.", "", ""),
                ("Measurable Business Impact", "• Invigilation operational expenditure reduced by 75% via automated AI screening.\n• Zero server downtime during 25,000 concurrent student final exams.\n• Exam grading turnaround accelerated from 3 weeks to 48 hours.\n• Student mobile satisfaction score increased to > 4.8/5.0.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$168,000 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$16,800", "Payment Term Milestone Structure", "5 Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$184,800 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $4,500/month (99.95% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("EdTech Solution Architect", "Vendor", "Part-Time (40%)", "Cloud video architecture, AI proctoring model pipeline, FERPA/GDPR compliance", "Architecture Blueprint, Security Spec", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Sprint governance, stakeholder demos, budget and delivery schedule", "Project Plan, Risk Register", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "Full-stack architecture, WebRTC video scaling, code review governance", "Core Codebase, CI/CD Pipeline", "Lead"),
            ("Senior Backend Engineers (2)", "Vendor", "Full-Time (200%)", "Course management APIs, assessment engine, gradebook microservice", "REST/GraphQL APIs, Data Models", "Senior"),
            ("Senior Frontend Engineer", "Vendor", "Full-Time (100%)", "Next.js student/teacher web portals, interactive grading studio", "Web Portals, UI Components", "Senior"),
            ("Senior Mobile Engineer", "Vendor", "Full-Time (100%)", "React Native student mobile app with offline video caching", "iOS and Android Mobile Apps", "Senior"),
            ("QA / Test Automation Lead", "Vendor", "Full-Time (100%)", "Load testing concurrent exam submissions, proctoring accuracy test", "Test Automation Suites", "Senior")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Webcam AI false positives during exam proctoring (poor lighting, ambient noise).", "High", "Medium", "Configure confidence score thresholds; flag for human secondary review rather than immediate auto-fail.", "AI Lead"),
            ("RSK-02", "Risk", "Browser extension bypasses or dual-monitor cheating during unproctored quizzes.", "Medium", "Medium", "Deploy secure lockdown browser SDK with full screen capture and clipboard restrictions.", "Security Lead"),
            ("DEP-01", "Dependency", "Zoom SDK and Turnitin API enterprise licensing credentials provisioned by Week 2.", "High", "Open", "Client procurement finalizing contract with Turnitin / Zoom.", "Client PM")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-LMS-01", "Course Engine", "Interactive Video Lessons", "System shall stream adaptive bitrate video with interactive timestamped quizzes and student notes.", "Must-Have", "Medium", "Sprint 1"),
            ("FR-LMS-02", "Course Engine", "Offline Mobile Downloads", "Mobile app shall securely download encrypted video lessons for offline study with automated license expiry.", "Must-Have", "High", "Sprint 3"),
            ("FR-PRC-01", "AI Proctoring", "Face & Gaze Tracking", "System shall detect multiple faces, continuous gaze divergence, and absent test-taker via client-side WebAssembly AI.", "Must-Have", "High", "Sprint 4"),
            ("FR-PRC-02", "AI Proctoring", "Acoustic Anomaly Flagging", "System shall analyze ambient microphone audio for whispered speech or secondary device audio during exams.", "Must-Have", "High", "Sprint 5"),
            ("FR-EXM-01", "Assessment Studio", "Automated Exam Grading", "System shall auto-grade multiple choice, code executions, and forward essay questions to rubric grading dashboard.", "Must-Have", "Medium", "Sprint 6"),
            ("FR-SEC-01", "Integrity & Compliance", "Turnitin Plagiarism Sync", "System shall automatically submit written assignments to Turnitin API and display similarity index report.", "Must-Have", "Medium", "Sprint 7")
        ],
        "tech_data": [
            ("Web Learning Portal", "Next.js 15 (React 19, TypeScript)", "15.0+", "Server-side rendering, accessible WCAG 2.1 AA UI components, Tailwind CSS.", "Open Source / AWS", "Global CloudFront CDN"),
            ("Student Mobile App", "React Native (Expo SDK 52)", "0.76+", "Cross-platform iOS and Android with background download manager and SQLite storage.", "Open Source", "Encrypted Offline Storage"),
            ("Core LMS Microservices", "Node.js (NestJS) & Go", "20.x / 1.23", "Modular enterprise microservices with high concurrent exam submission throughput.", "Open Source / AWS EKS", "Auto-scaling Pods (3-20)"),
            ("AI Proctoring Engine", "ONNX Runtime & WebAssembly", "1.19+", "Client-side edge inference for zero-latency facial landmark and gaze detection.", "Open Source Edge AI", "Zero server video storage"),
            ("Relational Database", "PostgreSQL (AWS Aurora)", "16.x", "ACID transactional compliance for student enrollments and gradebook records.", "AWS Aurora Multi-AZ", "Automated Read Replicas")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "Concurrent Exam Concurrency", "Support 20,000 concurrent exam takers submitting responses with P95 latency < 300ms.", "k6 load test simulating national finals week.", "Redis cluster caching and async queue worker pods.", "Sprint 9"),
            ("NFR-AVAIL-01", "High Availability", "99.95% system uptime availability during semester exam periods.", "Datadog synthetic probes with auto-healing pods.", "Multi-AZ AWS deployment with auto-failover.", "Production Go-Live"),
            ("NFR-SEC-01", "Student Privacy (FERPA)", "All student telemetry and proctoring metadata encrypted with AES-256; video destroyed post-audit.", "External FERPA and GDPR audit clearance.", "AWS KMS Customer Managed Keys.", "Sprint 8")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Architecture & UX Design", "Week 1", "3 Weeks", "Requirements finalization, Figma UI design system, proctoring algorithm proof of concept.", "Architecture Blueprint, Interactive Figma Prototype", "Milestone 1 Sign-off"),
            ("Phase 2", "Core LMS Portal & Course Delivery Engine", "Week 4", "6 Weeks", "Develop course player, enrollment workflows, assignment submissions, video transcoding.", "LMS Portal in Staging, Video Player Demo", "Milestone 2 Sign-off"),
            ("Phase 3", "AI Proctoring Engine & Mobile Learning App", "Week 10", "6 Weeks", "Develop client-side proctoring engine, lockdown exam browser, React Native mobile apps.", "Proctoring Test Suite, TestFlight Mobile Build", "Milestone 3 Sign-off"),
            ("Phase 4", "Load Testing, Security Pentest & Pilot Trial", "Week 16", "3 Weeks", "20,000 concurrent user load test, security penetration test, trial exams with 500 students.", "Load Test Report, Security Clearance, UAT Sign-off", "Milestone 4 Sign-off"),
            ("Phase 5", "Production Deployment, Rollout & Hypercare", "Week 19", "2 Weeks", "AWS EKS production launch, data migration, 24/7 exam monitoring hypercare.", "Production Handover Runbook, Final Acceptance", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Inception & UI/UX Design", 36, 625.00, 22500.00, "Solution Architect (10d), PM (8d), Tech Lead (8d), UI/UX (10d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Core LMS Portal & Assessment Engine", 120, 525.00, 63000.00, "Backend (50d), Frontend (35d), Tech Lead (15d), QA (20d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: AI Proctoring Engine & Mobile Learning Apps", 100, 530.00, 53000.00, "AI/Mobile (45d), Backend (25d), QA (20d), PM (10d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: Load Testing, Security Pentest & UAT", 40, 487.50, 19500.00, "QA Lead (20d), PM (8d), SA (4d), DevOps (8d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Production Deployment & Hypercare", 24, 416.67, 10000.00, "Tech Lead (8d), PM (8d), DevOps (4d), Mobile (4d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Architecture Sign-off", 0.20, 36960.00, "Nov 16, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Core LMS Staging Demo & Video Player Gate", 0.25, 46200.00, "Dec 28, 2026 (End Sprint 3)", "Due within 14 days of gate approval"),
            ("Milestone 3", "AI Proctoring & Mobile App Feature Complete", 0.30, 55440.00, "Feb 08, 2027 (End Sprint 6)", "Due within 14 days of gate approval"),
            ("Milestone 4", "Load Test Clearance & 500-Student Pilot Gate", 0.15, 27720.00, "Mar 01, 2027 (End Sprint 8)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Production Go-Live & Semester Final Acceptance", 0.10, 18480.00, "Mar 22, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data


# =====================================================================
# SCENARIO 07: PROPTECH SMART TENANT PORTAL & BMS
# =====================================================================
def get_scenario_07():
    rfp_meta = {
        "title": "SMART COMMERCIAL BUILDING & TENANT EXPERIENCE PLATFORM – RFP",
        "client": "Horizon Towers Asset Management Ltd",
        "date": "18 October 2026",
        "contact": "Victoria Chen – VP Commercial Operations (victoria.chen@horizontowers.example | +61 2 9222 3344)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Company", "Horizon Towers Asset Management Ltd (Premium Grade Commercial Real Estate)"),
            ("Portfolio", "8 commercial office towers across Sydney, Melbourne, and Brisbane (240,000 sqm NLA, 18,000 daily occupants)."),
            ("Contact", "Victoria Chen – VP Commercial Operations\nMarcus Vance – Head of Facility Engineering")
        ]},
        {"section": "Current Challenges", "items": [
            ("Current Setup", "Physical plastic RFID keycards for turnstiles and elevators. Paper work orders for HVAC repairs. Manual visitor logbooks."),
            ("Pain Points", "- High card replacement costs ($45,000/yr) and security risks of lost cards.\n- Tenant complaints about slow facility request handling (avg 4.2 days).\n- Inefficient HVAC and lighting scheduling wasting 28% electricity during hybrid work days.\n- Congested lobby turnstiles during 8:30-9:15 AM rush hours.")
        ]},
        {"section": "Target Solution", "items": [
            ("In Short", "White-label Tenant Experience Mobile App (NFC/BLE digital badge access) integrated with Schneider/Honeywell Building Management Systems (BMS), visitor QR codes, and smart amenity booking."),
            ("Key Requirements", "- Digital smartphone badge access via Apple Wallet / Google Wallet NFC.\n- Automated visitor management with pre-registered QR code lobby turnstile access.\n- Desk and meeting room reservation with automated occupancy sensing.\n- Direct IoT telemetry connecting to building HVAC for on-demand temperature adjustment.")
        ]},
        {"section": "Integrations & Constraints", "items": [
            ("Integrations", "Schneider EcoStruxure BMS, HID Origo Mobile Access API, Condeco Desk Booking, Stripe Billing, Microsoft 365 Outlook."),
            ("Timeline & Budget", "Timeline: 18 weeks. Budget: AUD $175,000 - $210,000. Compliance: NABERS 5.5 Star Energy, ISO 27001.")
        ]}
    ]
    p_data = {
        "title": "PROPOSAL: SMART COMMERCIAL BUILDING & TENANT EXPERIENCE PLATFORM",
        "client": "Horizon Towers Asset Management Ltd",
        "proposal_id": "PRP-2026-HRZ-07",
        "date": "21 October 2026",
        "duration_weeks": 18,
        "total_mandays": 290,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "Horizon Towers Asset Management Ltd", "Presale Solution Lead", "Harrison Ford (Principal PropTech Architect)"),
                ("Project Code", "PBL6-HRZ-PROP-2026", "Delivery Manager", "Emily Watson (Senior PropTech Delivery Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial)", "Target Kick-off", "23 November 2026"),
                ("Primary Objective", "Deploy Mobile Tenant App with NFC Access, Smart BMS Control & Visitor Management", "Total Delivery Duration", "18 Calendar Weeks (9 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "Horizon Towers experiences lobby turnstile congestion and $45k annual keycard replacement overhead. Disconnected facility management delays repairs and wastes energy in empty hybrid office zones.", "", ""),
                ("Proposed Strategic Solution", "We propose 'HorizonConnect': An enterprise PropTech suite comprising native iOS/Android apps with Apple/Google Wallet NFC access, automated visitor QR passes, BMS IoT climate adjustment, and facility work order ticketing.", "", ""),
                ("Measurable Business Impact", "• 100% elimination of physical plastic badge issuance for new tenant onboarding.\n• Lobby morning check-in throughput accelerated from 12 guests/min to 45 guests/min.\n• Common zone HVAC energy consumption reduced by 18% via occupancy sensor rules.\n• Tenant maintenance ticket resolution cycle reduced from 4.2 days to < 6 hours.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$152,000 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$15,200", "Payment Term Milestone Structure", "5 Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$167,200 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $4,200/month (99.95% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("PropTech Solution Architect", "Vendor", "Part-Time (40%)", "BMS BACnet/Modbus integration, HID Origo access credential architecture", "Architecture Blueprint, IoT Interface Spec", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Sprint management, hardware vendor coordination, tenant pilot governance", "Project Plan, Risk Register", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "Mobile NFC integration, IoT gateway services, cloud backend governance", "Core Codebase, CI/CD Pipeline", "Lead"),
            ("Senior Mobile Engineers (2)", "Vendor", "Full-Time (200%)", "Flutter mobile app, Apple Wallet / Google Wallet NFC integration", "iOS and Android Mobile Builds", "Senior"),
            ("Senior Backend Engineer", "Vendor", "Full-Time (100%)", "Facility ticketing engine, visitor QR microservice, BMS polling worker", "REST APIs, Database Schemas", "Senior"),
            ("QA / Field Test Lead", "Vendor", "Full-Time (100%)", "Turnstile hardware testing, Bluetooth RSSI calibration, load testing", "Test Suite, Hardware Acceptance Report", "Senior")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Building turnstile hardware latency exceeding 800ms when reading phone NFC.", "High", "Low", "Use HID Origo native BLE/NFC SDK with local credential caching on mobile device.", "Tech Lead"),
            ("RSK-02", "Risk", "Older BMS controllers (BACnet MS/TP) lacking REST API connectivity.", "Medium", "Medium", "Deploy edge IoT gateway bridges converting BACnet to MQTT/HTTPS in basement DCs.", "IoT Architect"),
            ("DEP-01", "Dependency", "Turnstile hardware controller network access and IP configuration by building IT.", "High", "Open", "Building facilities manager scheduled network survey for Week 2.", "Client Facilities")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-ACC-01", "Access Control", "Mobile NFC / BLE Turnstile Unlock", "Mobile app shall transmit encrypted credential to turnstiles and elevator readers via NFC/BLE within < 400ms.", "Must-Have", "High", "Sprint 2"),
            ("FR-ACC-02", "Access Control", "Apple & Google Wallet Integration", "System shall provision digital building keycards directly into Apple Wallet and Google Wallet passes.", "Must-Have", "High", "Sprint 3"),
            ("FR-VST-01", "Visitor Management", "Pre-Registered QR Code Passes", "Tenants shall invite visitors via app, generating dynamic 1-time QR codes for contactless lobby kiosk check-in.", "Must-Have", "Medium", "Sprint 4"),
            ("FR-FAC-01", "Smart Facilities", "HVAC & Lighting On-Demand Override", "Authorized tenant admins shall request after-hours AC and lighting for specific floor zones with automated billing.", "Must-Have", "Medium", "Sprint 5"),
            ("FR-RSV-01", "Amenity Booking", "Meeting Room & Hot Desk Booking", "Tenants shall view live room availability, book spaces, and sync calendar invites with Outlook 365.", "Must-Have", "Medium", "Sprint 6")
        ],
        "tech_data": [
            ("Tenant Mobile App", "Flutter 3.x (Dart)", "3.24+", "Cross-platform mobile app with Apple Wallet NFC PassKit & Google Wallet API.", "Open Source / Native", "Redundant App Store CDN"),
            ("Admin Web Portal", "React 19 & Next.js 15", "15.0+", "Responsive property management web console with live floor plan status.", "Open Source / AWS", "CloudFront Edge"),
            ("Core Facility API", "NestJS (Node.js)", "10.4+", "Modular TypeScript microservices with WebSockets for real-time ticket alerts.", "Open Source / AWS EKS", "Auto-scaling Pods (2-10)"),
            ("IoT BMS Gateway", "Go (Golang MQTT Service)", "1.23+", "Lightweight MQTT broker gateway connecting BACnet/Modbus building controllers.", "Open Source", "Edge Server in Tower Basement"),
            ("Cloud Database", "PostgreSQL (AWS Aurora)", "16.x", "ACID transactional database with Row-Level Security for multi-tenant isolation.", "AWS Aurora Multi-AZ", "Automated Daily Backups")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "Turnstile NFC Unlock Time", "Mobile badge credential read and barrier unlock trigger completes in < 400ms (P99).", "Automated hardware test rig with 1,000 tap cycles.", "Local crypto key validation on mobile client.", "Sprint 7"),
            ("NFR-AVAIL-01", "Offline Access Continuity", "Turnstiles continue granting access to registered tenant badges if cloud Internet drops.", "Simulated Internet sever test at building core switch.", "Local hardware reader credential buffer.", "Pre-Commissioning"),
            ("NFR-SEC-01", "Credential Encryption", "All digital credentials encrypted using AES-128 GCM; tokenized against replay attacks.", "Independent physical and digital security audit.", "HID Origo secure enclave tokenization.", "Sprint 8")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Architecture & Hardware Survey", "Week 1", "3 Weeks", "Site visits across 8 towers, turnstile hardware audit, BMS protocol survey, Figma UI design.", "Hardware Audit Report, Architecture Spec, Figma Prototype", "Milestone 1 Sign-off"),
            ("Phase 2", "Core Platform, Visitor Management & BMS API", "Week 4", "6 Weeks", "Develop tenant management API, visitor QR engine, BACnet/Modbus IoT gateway connectors.", "Staging API, Visitor Kiosk Demo, IoT Gateway Build", "Milestone 2 Sign-off"),
            ("Phase 3", "Mobile Apps & Wallet NFC Credentials", "Week 10", "5 Weeks", "Develop Flutter mobile app, Apple Wallet / Google Wallet pass generation, turnstile unlock test.", "TestFlight / Play Console Mobile Builds, Turnstile Video Demo", "Milestone 3 Sign-off"),
            ("Phase 4", "Pilot Rollout & Hardware Integration (Tower 1)", "Week 15", "2 Weeks", "Live hardware deployment at Horizon Tower Sydney (2,500 occupants), turnstile pilot testing.", "Tower 1 Commissioning Acceptance Certificate", "Milestone 4 Sign-off"),
            ("Phase 5", "Full Portfolio Rollout (Towers 2-8) & Hypercare", "Week 17", "2 Weeks", "Rollout to remaining 7 commercial towers, property manager training, 60-day hypercare.", "Portfolio Acceptance Sign-off, Final Handover", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Site Survey & UI/UX Design", 32, 640.63, 20500.00, "Solution Architect (10d), PM (8d), Tech Lead (6d), UI/UX (8d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Core Platform, Visitor Engine & BMS Gateway", 110, 520.00, 57200.00, "Backend (45d), Tech Lead (25d), IoT Eng (20d), QA (20d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: Mobile Apps & Apple/Google Wallet NFC", 90, 533.33, 48000.00, "Mobile (45d), Backend (20d), QA (15d), PM (10d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: Pilot Deployment & Hardware Sign-off (Tower 1)", 36, 472.22, 17000.00, "QA Lead (14d), Tech Lead (10d), PM (8d), DevOps (4d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Portfolio Rollout (7 Towers) & Hypercare", 22, 422.73, 9300.00, "PM (10d), Tech Lead (6d), Mobile (3d), Backend (3d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Architecture Sign-off", 0.20, 33440.00, "Nov 23, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Core Platform & BMS Staging Integration Gate", 0.25, 41800.00, "Jan 04, 2027 (End Sprint 3)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Mobile App Feature Complete & Wallet NFC Gate", 0.30, 50160.00, "Feb 08, 2027 (End Sprint 6)", "Due within 14 days of gate approval"),
            ("Milestone 4", "Tower 1 Pilot Go-Live & Turnstile Acceptance", 0.15, 25080.00, "Feb 22, 2027 (End Sprint 7)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Portfolio Handover & 60-Day Hypercare Acceptance", 0.10, 16720.00, "Mar 08, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data


# =====================================================================
# SCENARIO 08: ON-DEMAND GROCERY DELIVERY SUPER-APP
# =====================================================================
def get_scenario_08():
    rfp_meta = {
        "title": "HYPERLOCAL ON-DEMAND GROCERY & ESSENTIALS DELIVERY PLATFORM – RFP",
        "client": "QuickDrop Express Australia Pty Ltd",
        "date": "20 October 2026",
        "contact": "Toby Gallagher – Chief Commercial Officer (toby.g@quickdrop.example | +61 2 8777 6655)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Company", "QuickDrop Express Australia Pty Ltd (Rapid Delivery Retail Tech)"),
            ("Scale", "18 micro-fulfillment dark stores across Sydney, Melbourne, and Brisbane. 25,000 daily orders delivered in < 20 minutes."),
            ("Contact", "Toby Gallagher – Chief Commercial Officer\nNina Patel – VP Supply Chain & Fulfillment")
        ]},
        {"section": "Current Challenges", "items": [
            ("Current Setup", "Three disconnected off-the-shelf apps (Shopify customer store, third-party courier dispatch software, manual warehouse pick sheets)."),
            ("Pain Points", "- Courier route inefficiency causing delivery times to exceed 35 mins during dinner peaks.\n- Real-time stockout rate is 6.8%, resulting in refund fees and disappointed shoppers.\n- Courier fraud and order misplacement costing $38,000/month.\n- High payment gateway transaction fees (2.9% + 30c) cutting into thin grocery margins.")
        ]},
        {"section": "Target Solution", "items": [
            ("In Short", "Unified 3-sided on-demand ecosystem: Customer Super-App (iOS/Android), Dark Store High-Speed Picking App, and Rider Delivery & Smart Routing App backed by a real-time dispatch engine."),
            ("Key Requirements", "- Sub-second inventory sync between dark store shelves and customer app.\n- Algorithmic rider batching and multi-drop route optimization.\n- Dark store picker route optimization with shelf barcode verification.\n- Integrated PayID, Apple Pay, and low-fee instant payment rail.")
        ]},
        {"section": "Integrations & Constraints", "items": [
            ("Integrations", "Google Maps Routes API, Stripe / Zepto PayID, Zebra RF Scanners, Twilio SMS/WhatsApp, Braze Marketing Automation."),
            ("Timeline & Budget", "Timeline: 22 weeks. Budget: AUD $210,000 - $260,000. Compliance: PCI-DSS, Australian Heavy Vehicle Safety Standard.")
        ]}
    ]
    p_data = {
        "title": "PROPOSAL: HYPERLOCAL ON-DEMAND GROCERY & DELIVERY SUPER-APP",
        "client": "QuickDrop Express Australia Pty Ltd",
        "proposal_id": "PRP-2026-QKD-08",
        "date": "24 October 2026",
        "duration_weeks": 22,
        "total_mandays": 350,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "QuickDrop Express Australia Pty Ltd", "Presale Solution Lead", "Dominic Russo (Principal Logistics & App Architect)"),
                ("Project Code", "PBL6-QKD-DELIV-2026", "Delivery Manager", "Lucas Meyer (Senior Mobile & Dispatch Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial)", "Target Kick-off", "30 November 2026"),
                ("Primary Objective", "Deploy 3-Sided On-Demand Super-App (Customer, Dark Store Picker, Rider) & Dispatch Engine", "Total Delivery Duration", "22 Calendar Weeks (11 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "QuickDrop suffers from order stockouts (6.8%) and courier route delays exceeding 35 minutes due to fragmented systems. High payment processing fees erode ultra-thin retail grocery margins.", "", ""),
                ("Proposed Strategic Solution", "We propose 'QuickDrop Nexus': A reactive, high-throughput delivery platform featuring Flutter customer apps, dark store wave-picking tablet UI, AI driver dispatch engine with dynamic batching, and PayID instant rails.", "", ""),
                ("Measurable Business Impact", "• Average delivery time compressed from 35 minutes down to < 18 minutes.\n• Stockout cancellations reduced from 6.8% to < 0.4% via Redis inventory locks.\n• Picker throughput accelerated to 45 seconds per average 12-item basket.\n• Payment processing transaction fees reduced by 42% via automated PayID adoption.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$182,000 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$18,200", "Payment Term Milestone Structure", "5 Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$200,200 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $5,000/month (99.95% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("On-Demand Solution Architect", "Vendor", "Part-Time (40%)", "Reactive dispatch engine architecture, Google Maps optimization, payment gateway design", "Architecture Blueprint, Routing Algorithm Spec", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Sprint planning, dark store site pilots, budget and milestone governance", "Project Plan, Risk Register", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "High-throughput microservices, WebSockets live rider tracking, code quality gates", "Core Codebase, CI/CD Pipeline", "Lead"),
            ("Senior Mobile Engineers (3)", "Vendor", "Full-Time (300%)", "Flutter customer app, rider app (background GPS tracking), dark store picker tablet app", "3 Mobile Applications (iOS & Android)", "Senior"),
            ("Senior Backend Engineers (2)", "Vendor", "Full-Time (200%)", "Dispatch microservice, dynamic order routing, inventory reservation engine", "Microservices, Database Schemas", "Senior"),
            ("QA / Field Testing Lead", "Vendor", "Full-Time (100%)", "Live rider simulation in field, dark store picking stress test, load testing", "Test Automation Suites, Field Trial Report", "Senior")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Google Maps Route API costs spiking during high-frequency rider GPS polling.", "High", "Medium", "Implement H3 hexagonal spatial indexing and Kalman filter throttling on driver mobile clients.", "Tech Lead"),
            ("RSK-02", "Risk", "Rider background geolocation termination on iOS / Android during battery-saver mode.", "High", "Low", "Implement foreground service with persistent notification and native background GPS keep-alive.", "Mobile Lead"),
            ("DEP-01", "Dependency", "Zepto PayID commercial payment processing merchant agreement signed by Week 3.", "High", "Open", "Client finance team finalizing underwriting requirements with Zepto.", "Client CFO")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-CST-01", "Customer App", "Live Basket & Inventory Reservation", "App shall reserve items in nearest dark store for 10 minutes upon adding to cart to prevent stockouts.", "Must-Have", "High", "Sprint 1"),
            ("FR-CST-02", "Customer App", "Live Map Rider Telemetry", "App shall render live rider motorcycle/bicycle location on Mapbox/Google Maps with dynamic ETA.", "Must-Have", "High", "Sprint 3"),
            ("FR-PCK-01", "Dark Store Picker", "Optimized Path Wave Picking", "Picker app shall sort items by shelf aisle coordinates to guide 1-way walking loop through dark store.", "Must-Have", "High", "Sprint 4"),
            ("FR-RDR-01", "Rider App", "Intelligent Order Batching", "Dispatch engine shall offer clustered nearby deliveries to single rider when delivery window permits.", "Must-Have", "High", "Sprint 6"),
            ("FR-PAY-01", "Payments Hub", "Instant PayID & 1-Click Apple Pay", "Checkout shall support PayID QR/identifier and Apple Pay/Google Pay with instant webhook confirmation.", "Must-Have", "Medium", "Sprint 5")
        ],
        "tech_data": [
            ("Customer & Rider Apps", "Flutter 3.x (Dart)", "3.24+", "Single high-performance codebase compiling natively to iOS and Android.", "Open Source / Native", "Redundant App Store CDN"),
            ("Dispatch Engine", "Go (Golang Microservices)", "1.23+", "Sub-10ms response time handling geospatial clustering and linear route optimization.", "Open Source / AWS EKS", "Auto-scaling Pods (4-25)"),
            ("Real-Time Geolocation Bus", "Redis Enterprise & WebSockets", "7.2+", "In-memory Pub/Sub broadcasting driver coordinates to active customers every 3 seconds.", "AWS ElastiCache", "Multi-AZ Cluster Mode"),
            ("Primary Transaction DB", "PostgreSQL (AWS Aurora)", "16.x", "ACID compliant transactional store for orders, items, pricing, and driver manifests.", "AWS Aurora Multi-AZ", "Automated Daily Backups"),
            ("Cloud Infrastructure", "AWS Sydney (ap-southeast-2)", "N/A", "Sub-20ms latency across east coast metropolitan dark store footprint.", "AWS Enterprise", "Multi-AZ (3 Zones)")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "Dispatch Execution Latency", "Automated algorithmic matching and rider assignment triggered within < 2 seconds of order confirmation.", "Performance benchmark simulating 1,000 orders/minute.", "In-memory Go routing engine with spatial index.", "Sprint 10"),
            ("NFR-AVAIL-01", "System Availability", "99.95% system uptime during dinner peak hours (5:00 PM - 10:00 PM).", "Synthetic uptime probes with automated pod self-healing.", "Multi-AZ deployment across 3 availability zones.", "Production Go-Live"),
            ("NFR-SEC-01", "PCI-DSS Compliance", "Card data tokenized via Stripe Elements; zero cardholder data touches QuickDrop servers.", "External QSA vulnerability scan and audit certificate.", "Stripe PCI-DSS Level 1 compliance integration.", "Sprint 9")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Architecture & UX Design", "Week 1", "3 Weeks", "Requirements workshops, dispatch algorithm design, Figma UI systems for 3 apps, API design.", "Architecture Document, Interactive Figma Prototypes", "Milestone 1 Sign-off"),
            ("Phase 2", "Core Commerce, Inventory Ledger & Dark Store App", "Week 4", "7 Weeks", "Develop real-time inventory ledger, dark store picking app, checkout & PayID integration.", "Commerce API Staging Demo, Picker Tablet App Build", "Milestone 2 Sign-off"),
            ("Phase 3", "Customer App, Rider App & Dispatch Engine", "Week 11", "6 Weeks", "Develop Flutter customer app, rider mobile app, background GPS tracking, dispatch engine.", "TestFlight / Play Console Builds for 3 Apps, Routing Demo", "Milestone 3 Sign-off"),
            ("Phase 4", "Dark Store Pilot Trial, Load Testing & UAT", "Week 17", "3 Weeks", "Live pilot at Sydney CBD dark store (500 orders/day), k6 load testing, UAT sign-off.", "Pilot Acceptance Certificate, Load Test Sign-off", "Milestone 4 Sign-off"),
            ("Phase 5", "Full Network Cutover (18 Stores) & Hypercare", "Week 20", "3 Weeks", "Rollout to all 18 dark stores, rider onboarding training, 90-day hypercare support.", "Full Network Handover, Final Acceptance Certificate", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Inception & 3-App UI Design", 40, 625.00, 25000.00, "Solution Architect (12d), PM (8d), Tech Lead (8d), UI/UX (12d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Commerce API, Inventory Locks & Picker App", 125, 520.00, 65000.00, "Backend (55d), Mobile/Tablet (35d), Tech Lead (15d), QA (20d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: Customer App, Rider App & Dispatch Engine", 115, 521.74, 60000.00, "Mobile (55d), Backend (30d), QA (20d), PM (10d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: Dark Store Pilot Trial & Load Testing", 44, 488.64, 21500.00, "QA Lead (20d), Tech Lead (10d), PM (8d), DevOps (6d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Network Cutover (18 Stores) & Hypercare", 26, 411.54, 10700.00, "PM (10d), Tech Lead (8d), Mobile (4d), Backend (4d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Architecture Sign-off", 0.20, 40040.00, "Nov 30, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Commerce API & Dark Store Picker Demo Gate", 0.25, 50050.00, "Jan 18, 2027 (End Sprint 4)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Customer & Rider App Feature Complete Gate", 0.30, 60060.00, "Mar 01, 2027 (End Sprint 7)", "Due within 14 days of gate approval"),
            ("Milestone 4", "Sydney Pilot Acceptance & Load Test Clearance", 0.15, 30030.00, "Mar 22, 2027 (End Sprint 9)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Full Network Launch & 90-Day Hypercare Gate", 0.10, 20020.00, "Apr 12, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data


# =====================================================================
# SCENARIO 09: ENTERPRISE CLOUD HRM, PAYROLL & OKRS
# =====================================================================
def get_scenario_09():
    rfp_meta = {
        "title": "GLOBAL CLOUD HRM, PAYROLL COMPLIANCE & OKR PLATFORM – RFP",
        "client": "TalentoHR Global Enterprise Pty Ltd",
        "date": "22 October 2026",
        "contact": "Chloe Montgomery – Chief People Officer (chloe.m@talentohr.example | +61 2 9555 8899)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Company", "TalentoHR Global Enterprise Pty Ltd (Multinational Professional Services)"),
            ("Headcount", "4,800 employees across Australia, Singapore, Philippines, and Vietnam."),
            ("Contact", "Chloe Montgomery – Chief People Officer\nNathaniel Reed – Head of Payroll Compliance")
        ]},
        {"section": "Current Challenges", "items": [
            ("Current Setup", "Fragmented local payroll software in each country, manual Excel timesheet submissions, disconnected goal-setting spreadsheets."),
            ("Pain Points", "- High risk of Single Touch Payroll (STP Phase 2) non-compliance in Australia.\n- Timesheet approval takes 8 business days every pay cycle.\n- Expatriate tax calculation and superannuation errors resulting in $65,000 in penalties.\n- Employee engagement scores plummeted due to zero mobile leave/claim self-service.")
        ]},
        {"section": "Target Solution", "items": [
            ("In Short", "Unified Enterprise Cloud HR Information System (HRIS) featuring multi-country payroll compliance (ATO STP Phase 2, CPF, Tax withholding), mobile self-service app, and real-time OKR goal tracking."),
            ("Key Requirements", "- Automated multi-jurisdiction payroll engine with automated tax calculation.\n- Employee Mobile App for timesheet clock-in, leave requests, and digital payslips.\n- Enterprise OKR & performance management module with 360-degree peer feedback.\n- Single Sign-On (Okta / Azure AD) and integration with ERP general ledger.")
        ]},
        {"section": "Integrations & Constraints", "items": [
            ("Integrations", "ATO Single Touch Payroll (STP Phase 2) gateway, Xero/NetSuite ERP, Okta SAML 2.0, Workday, Slack / MS Teams."),
            ("Timeline & Budget", "Timeline: 20 weeks. Budget: AUD $185,000 - $225,000. Compliance: ATO STP Phase 2, SOC 2 Type II, Australian Fair Work Act.")
        ]}
    ]
    p_data = {
        "title": "PROPOSAL: GLOBAL CLOUD HRM, PAYROLL COMPLIANCE & OKR PLATFORM",
        "client": "TalentoHR Global Enterprise Pty Ltd",
        "proposal_id": "PRP-2026-TLN-09",
        "date": "26 October 2026",
        "duration_weeks": 20,
        "total_mandays": 310,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "TalentoHR Global Enterprise Pty Ltd", "Presale Solution Lead", "Eleanor Vance (Principal HRIS Architect)"),
                ("Project Code", "PBL6-TLN-HRM-2026", "Delivery Manager", "Simon Croft (Senior Enterprise Delivery Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial)", "Target Kick-off", "07 December 2026"),
                ("Primary Objective", "Implement Unified Cloud HRIS, Multi-Country Payroll Engine, and Mobile Employee Portal", "Total Delivery Duration", "20 Calendar Weeks (10 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "TalentoHR risks ATO STP compliance penalties and loses 8 days per cycle due to fragmented multi-country payroll spreadsheets. Lack of mobile self-service frustrates 4,800 employees across 4 countries.", "", ""),
                ("Proposed Strategic Solution", "We propose 'TalentoPulse Cloud HRIS': A SOC2-compliant enterprise platform featuring automated ATO STP Phase 2 payroll engine, multi-currency salary disbursements, React Native mobile self-service, and OKR alignment.", "", ""),
                ("Measurable Business Impact", "• Payroll processing cycle compressed from 8 business days down to 4 hours.\n• 100% elimination of ATO STP Phase 2 non-compliance penalty risks.\n• Employee self-service adoption rate exceeding 94% across all 4 countries.\n• Manual timesheet reconciliation errors reduced by 99% via geofenced clock-in.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$162,000 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$16,200", "Payment Term Milestone Structure", "5 Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$178,200 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $4,800/month (99.95% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("HRIS & Payroll Solution Architect", "Vendor", "Part-Time (40%)", "Multi-country payroll tax rules, ATO STP Phase 2 architecture, SOC 2 compliance", "Architecture Blueprint, Security Spec", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Sprint governance, payroll pilot oversight, executive steering committee reports", "Project Plan, Risk Register", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "Ledger integration, calculation engine accuracy, code review governance", "Core Codebase, CI/CD Pipeline", "Lead"),
            ("Senior Backend Engineers (2)", "Vendor", "Full-Time (200%)", "Payroll calculation engine, timesheet workflows, NetSuite ERP connector", "REST/GraphQL APIs, Data Models", "Senior"),
            ("Senior Frontend Engineer", "Vendor", "Full-Time (100%)", "HR admin web console, performance review matrix, visual OKR hierarchy", "Web Console, UI Components", "Senior"),
            ("Senior Mobile Engineer", "Vendor", "Full-Time (100%)", "React Native employee self-service app (iOS/Android) with biometric auth", "Mobile Apps (iOS & Android)", "Senior"),
            ("QA / Payroll Audit Lead", "Vendor", "Full-Time (100%)", "Parallel payroll math audits, compliance verification, automated regression", "Audit Clearance Report", "Senior")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Discrepancy in complex award interpretation (Australia Fair Work Act overtime rules).", "High", "Low", "Conduct 3 parallel pay runs comparing legacy calculations against new engine before go-live.", "Payroll Architect"),
            ("RSK-02", "Risk", "ATO Single Touch Payroll gateway certification delays.", "Medium", "Low", "Partner with accredited MessageXchange STP gateway provider with pre-certified ATO connectors.", "Tech Lead"),
            ("DEP-01", "Dependency", "Historical payroll and employee master data extract in CSV format by Week 3.", "High", "Open", "Client HR operations team preparing export scripts from legacy software.", "Client HR Lead")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-PAY-01", "Payroll Engine", "Automated Award Interpretation", "System shall calculate base salary, overtime penalties, shift allowances, and superannuation per Fair Work awards.", "Must-Have", "High", "Sprint 2"),
            ("FR-PAY-02", "Payroll Engine", "ATO STP Phase 2 Reporting", "System shall generate and lodge cryptographically signed STP Phase 2 pay event JSON directly to ATO gateway.", "Must-Have", "High", "Sprint 3"),
            ("FR-MOB-01", "Employee App", "Mobile Leave & Expense Claims", "Employees shall submit leave requests, photograph receipts for expense claims, and view payslips on mobile.", "Must-Have", "High", "Sprint 4"),
            ("FR-OKR-01", "Performance & OKR", "Hierarchical Goal Cascading", "System shall link company objectives to department key results and individual goals with quarterly grading.", "Should-Have", "Medium", "Sprint 6"),
            ("FR-SEC-01", "Security & SSO", "Okta / Azure AD SAML 2.0", "System shall enforce SSO and automated role provisioning/deprovisioning via SCIM 2.0 protocol.", "Must-Have", "Medium", "Sprint 5")
        ],
        "tech_data": [
            ("HR Admin Web Console", "Next.js 15 (React 19, TypeScript)", "15.0+", "Clean modern web portal with rich data grids, payroll approval dashboards, and charts.", "Open Source / AWS", "CloudFront CDN"),
            ("Employee Mobile App", "React Native (Expo SDK 52)", "0.76+", "Cross-platform mobile application with biometric FaceID login and push notifications.", "Open Source", "Encrypted Local Storage"),
            ("Payroll Engine Service", "Node.js (NestJS) & Python", "20.x / 3.12", "NestJS for employee workflows; Python worker for high-precision decimal math calculations.", "Open Source / AWS EKS", "Auto-scaling Pods (3-12)"),
            ("Core Database", "PostgreSQL (AWS Aurora)", "16.x", "ACID compliant relational database with transparent column-level encryption for salary data.", "AWS Aurora Multi-AZ", "Multi-AZ Failover"),
            ("Cloud & Compliance", "AWS Sydney (ap-southeast-2)", "N/A", "Complies with Australian Privacy Principles and SOC 2 Type II data security baselines.", "AWS Enterprise", "Multi-AZ (3 Zones)")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "Payroll Batch Processing Speed", "Complete end-to-end payroll calculation for 4,800 employees across 4 countries in < 15 minutes.", "Automated stress benchmark with simulated employee ledger.", "Multi-threaded Python worker microservices.", "Sprint 8"),
            ("NFR-AVAIL-01", "System Availability", "99.95% system uptime across all business hours.", "Datadog synthetic monitoring with automated pod failover.", "AWS EKS cluster with multi-AZ Aurora database.", "Production Go-Live"),
            ("NFR-SEC-01", "Salary Privacy & RBAC", "Strict role-based encryption ensuring salaries are visible only to authorized HR compensation directors.", "Independent SOC 2 compliance penetration test.", "Field-level encryption with AWS KMS CMK keys.", "Sprint 9")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Architecture & Award Rule Blueprint", "Week 1", "3 Weeks", "Payroll rules workshops, award interpretation specification, Figma design system, API specs.", "Award Rule Specification, Architecture Blueprint, Figma Design", "Milestone 1 Sign-off"),
            ("Phase 2", "Core Payroll Engine & ATO STP Connector", "Week 4", "6 Weeks", "Develop payroll calculation engine, ATO STP Phase 2 gateway integration, NetSuite ledger connector.", "Payroll Engine in Staging, Parallel Pay Run 1 Demo", "Milestone 2 Sign-off"),
            ("Phase 3", "Employee Mobile App & Leave/Expense Workflows", "Week 10", "5 Weeks", "Develop React Native mobile app, geofenced timesheet clock-in, leave approval matrix.", "TestFlight / Play Console Mobile Builds, Self-Service Demo", "Milestone 3 Sign-off"),
            ("Phase 4", "Parallel Pay Runs (3 Cycles) & Security Pentest", "Week 15", "3 Weeks", "3 consecutive live parallel payroll runs, external SOC 2 penetration test, UAT sign-off.", "Parallel Pay Audit Sign-off, UAT Acceptance Certificate", "Milestone 4 Sign-off"),
            ("Phase 5", "Production Cutover & Post-Payroll Hypercare", "Week 18", "2 Weeks", "Live payroll execution, legacy software decommissioning, 60-day hypercare support.", "Production Handover Runbook, Final Acceptance Certificate", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Inception & Award Blueprint", 36, 625.00, 22500.00, "HRIS Architect (12d), PM (8d), Tech Lead (8d), UI/UX (8d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Payroll Engine, STP Gateway & ERP Connector", 120, 520.00, 62400.00, "Backend (50d), Tech Lead (25d), PM (15d), QA (20d), DevOps (10d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: Employee Mobile App & Timesheet Workflows", 90, 516.67, 46500.00, "Mobile (45d), Backend (20d), QA (15d), PM (10d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: 3 Parallel Pay Runs, Pentest & UAT", 42, 483.33, 20300.00, "QA Lead (20d), Payroll Architect (8d), PM (8d), DevOps (6d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Production Cutover & Hypercare", 22, 477.27, 10500.00, "Tech Lead (8d), PM (8d), Backend (3d), Mobile (3d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Architecture Sign-off", 0.20, 35640.00, "Dec 07, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Payroll Engine & Parallel Pay Run 1 Demo", 0.25, 44550.00, "Jan 18, 2027 (End Sprint 3)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Employee Mobile App Feature Complete Gate", 0.30, 53460.00, "Feb 22, 2027 (End Sprint 6)", "Due within 14 days of gate approval"),
            ("Milestone 4", "3 Parallel Pay Runs Audit & UAT Acceptance", 0.15, 26730.00, "Mar 15, 2027 (End Sprint 8)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Production Payroll Go-Live & Hypercare Gate", 0.10, 17820.00, "Mar 29, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data


# =====================================================================
# SCENARIO 10: INDUSTRIAL IOT PREDICTIVE MAINTENANCE & TELEMETRY
# =====================================================================
def get_scenario_10():
    rfp_meta = {
        "title": "INDUSTRIAL IOT PREDICTIVE MAINTENANCE & ASSET TELEMETRY – RFP",
        "client": "PrecisionSteel Manufacturing Corporation",
        "date": "25 October 2026",
        "contact": "Klaus Lindner – VP Industrial Operations (klaus.l@precisionsteel.example | +61 2 9777 4433)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Company", "PrecisionSteel Manufacturing Corporation (Heavy Industrial & Metallurgy)"),
            ("Facilities", "4 heavy rolling mills and casting plants in Newcastle, Wollongong, and Port Kembla. 450 heavy rotating machinery assets."),
            ("Contact", "Klaus Lindner – VP Industrial Operations\nDr. Helga Weiss – Chief Reliability Engineer")
        ]},
        {"section": "Current Challenges", "items": [
            ("Current Setup", "Manual vibration inspection routes every 30 days with handheld sensors. SCADA data trapped in isolated plant PLCs."),
            ("Pain Points", "- Catastrophic unplanned gearbox failures costing $220,000 per downtime incident.\n- Technicians inspect healthy machines manually while deteriorating bearings are missed between monthly rounds.\n- Excessive energy consumption during high-tariff peak electricity hours.\n- Zero enterprise asset overview across the 4 distributed plants.")
        ]},
        {"section": "Target Solution", "items": [
            ("In Short", "Cloud-native Industrial IoT Telemetry & AI Predictive Maintenance Platform: Continuous edge sensor ingestion (vibration, temperature, current), AI anomaly detection, and automated maintenance work orders."),
            ("Key Requirements", "- Real-time edge ingestion via MQTT/OPC-UA of vibration (FFT spectrum) and temperature telemetry.\n- Machine Learning anomaly detection predicting bearing/gearbox failures 21 days in advance.\n- Asset Health Index dashboard with live 3D plant twin view.\n- Integration with SAP PM (Plant Maintenance) for automated work order generation.")
        ]},
        {"section": "Integrations & Constraints", "items": [
            ("Integrations", "Siemens S7 & Rockwell PLCs via OPC-UA, AWS IoT Core, SAP PM (Plant Maintenance), Grafana Enterprise, PagerDuty."),
            ("Timeline & Budget", "Timeline: 24 weeks. Budget: AUD $220,000 - $275,000. Compliance: IEC 62443 Industrial Cybersecurity, ISO 55000 Asset Management.")
        ]}
    ]
    p_data = {
        "title": "PROPOSAL: INDUSTRIAL IOT PREDICTIVE MAINTENANCE & TELEMETRY PLATFORM",
        "client": "PrecisionSteel Manufacturing Corporation",
        "proposal_id": "PRP-2026-PCS-10",
        "date": "28 October 2026",
        "duration_weeks": 24,
        "total_mandays": 360,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "PrecisionSteel Manufacturing Corporation", "Presale Solution Lead", "Viktor Novak (Principal IIoT & Industry 4.0 Architect)"),
                ("Project Code", "PBL6-PCS-IIOT-2026", "Delivery Manager", "Gerard Sullivan (Senior Industrial Tech Delivery Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial)", "Target Kick-off", "14 December 2026"),
                ("Primary Objective", "Deploy Industrial IoT Edge Ingestion, AI Anomaly Detection, and SAP PM Auto-Work Orders", "Total Delivery Duration", "24 Calendar Weeks (12 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "PrecisionSteel experiences catastrophic gearbox failures costing $220k/incident due to 30-day manual inspection cycles. Critical telemetry remains trapped in isolated plant PLCs with zero predictive warning.", "", ""),
                ("Proposed Strategic Solution", "We propose 'SteelPulse Industry 4.0': An edge-to-cloud industrial telemetry platform ingesting continuous OPC-UA/MQTT vibration metrics into AWS IoT Core, running Autoencoder ML anomaly detection to warn of bearing degradation 21 days in advance.", "", ""),
                ("Measurable Business Impact", "• Unplanned mill downtime reduced by 68%, saving an estimated $1.2M annually.\n• Machine failure warning lead time extended from 0 days to 21 days predictive horizon.\n• Asset maintenance technician productivity increased by 45% via condition-based routing.\n• Energy consumption reduced by 8.4% by rescheduling heavy rolling passes outside peak tariffs.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$192,000 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$19,200", "Payment Term Milestone Structure", "5 Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$211,200 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $5,500/month (99.95% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("IIoT & Industry 4.0 Architect", "Vendor", "Part-Time (40%)", "OPC-UA edge gateway architecture, AWS IoT Core design, IEC 62443 industrial security", "Architecture Blueprint, Edge Telemetry Spec", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Sprint governance, plant site safety protocols, SAP PM integration oversight", "Project Plan, Risk Register", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "Edge computing runtime, time-series database architecture, code review quality gate", "Core Codebase, CI/CD Pipeline", "Lead"),
            ("Senior Data / ML Engineer", "Vendor", "Full-Time (100%)", "Fast Fourier Transform (FFT) feature engineering, unsupervised anomaly detection models", "ML Models, Pipeline Specifications", "Senior"),
            ("Senior Backend Engineers (2)", "Vendor", "Full-Time (200%)", "Time-series stream processing, asset hierarchy API, SAP PM bidirectional connector", "REST APIs, Ingestion Services", "Senior"),
            ("Senior Frontend Engineer", "Vendor", "Full-Time (100%)", "Next.js asset health dashboard, interactive 3D digital twin viewer, alert console", "Web Portals, Telemetry Visuals", "Senior"),
            ("QA / Field Commissioning Lead", "Vendor", "Full-Time (100%)", "Industrial vibration sensor calibration, edge failover testing, load testing", "Test Suite, Commissioning Certificate", "Senior")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Harsh plant environment (extreme heat, metal dust, electromagnetic interference) degrading sensors.", "High", "Low", "Specify IP68 / ATEX Zone 2 rated industrial vibration transmitters with shielded cabling.", "Hardware Lead"),
            ("RSK-02", "Risk", "Industrial OT network firewall restrictions preventing outbound cloud MQTT traffic.", "High", "Low", "Deploy DMZ edge gateway with outbound-only TLS 1.3 mTLS connection to AWS IoT Core.", "Security Architect"),
            ("DEP-01", "Dependency", "OPC-UA server tag configuration and access credentials provided by plant SCADA team.", "High", "Open", "Plant automation manager scheduled tag mapping workshop for Week 2.", "Client SCADA")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-ING-01", "Telemetry Ingestion", "Continuous OPC-UA / MQTT Pipeline", "System shall ingest 10,000 samples/sec of 3-axis vibration and bearing temperature metrics via edge gateway.", "Must-Have", "High", "Sprint 2"),
            ("FR-ANM-01", "AI Predictive Engine", "Bearing Vibration Spectral Anomaly", "System shall compute FFT spectra and trigger early bearing degradation alerts when RMS harmonics exceed ISO 10816 thresholds.", "Must-Have", "High", "Sprint 4"),
            ("FR-DSH-01", "Asset Dashboard", "Asset Health Index & 3D Twin", "Executive web portal shall display color-coded asset health index (0-100) across all 4 plants with drill-down vibration graphs.", "Must-Have", "Medium", "Sprint 5"),
            ("FR-SAP-01", "Enterprise ERP Sync", "Automated SAP PM Work Orders", "System shall automatically create SAP PM maintenance notifications when critical anomaly persists for > 4 hours.", "Must-Have", "High", "Sprint 7"),
            ("FR-ALT-01", "Alerting & Escalation", "PagerDuty & SMS Dispatch", "System shall dispatch critical alarm notifications to on-duty plant engineers with audio spectrogram snapshots.", "Must-Have", "Medium", "Sprint 6")
        ],
        "tech_data": [
            ("Asset Health Web Portal", "Next.js 15 (React 19, TypeScript)", "15.0+", "Real-time canvas-based spectrogram charts, dark mode industrial UI, Tailwind CSS.", "Open Source / AWS", "CloudFront CDN"),
            ("Time-Series Database", "TimescaleDB / AWS Timestream", "N/A", "Optimized time-series telemetry storage processing 50M records/day with automatic rollups.", "AWS Managed", "Multi-AZ Storage"),
            ("IIoT Edge Gateway", "AWS IoT Greengrass & Docker", "2.13+", "On-premise edge computing running local OPC-UA poller and offline data buffering.", "AWS Greengrass", "Dual Redundant Industrial PCs"),
            ("Core Asset API", "Node.js (NestJS) & Go", "20.x / 1.23", "Modular enterprise API layer managing asset hierarchies, alerts, and user permissions.", "Open Source / AWS EKS", "Auto-scaling Pods (3-15)"),
            ("Cloud & Security", "AWS Sydney (ap-southeast-2)", "N/A", "IEC 62443 compliant architecture, VPC private subnets, Hardware Security Module keys.", "AWS Enterprise", "Multi-AZ (3 Zones)")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "Alert Dispatch Latency", "Critical mechanical anomaly detection to PagerDuty alert notification triggered in < 5 seconds.", "Automated stress benchmark simulating sudden bearing spike.", "Real-time Kafka stream processing.", "Sprint 9"),
            ("NFR-AVAIL-01", "System Availability", "99.95% cloud telemetry uptime across 24/7 continuous casting operations.", "Synthetic health probes with automated pod self-healing.", "Multi-AZ deployment across 3 availability zones.", "Production Go-Live"),
            ("NFR-SEC-01", "Industrial Cybersecurity", "Full adherence to IEC 62443-3-3 OT/IT security standard with zero inbound ports into plant network.", "External industrial cybersecurity penetration audit.", "mTLS authentication and unidirectional gateway proxy.", "Sprint 10")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Architecture & Plant Survey", "Week 1", "3 Weeks", "Site visits to 4 plants, OPC-UA tag survey, edge gateway hardware specification, Figma UI design.", "Site Audit Report, Architecture Blueprint, Figma Prototype", "Milestone 1 Sign-off"),
            ("Phase 2", "Edge Gateway Deployment & Ingestion Pipeline", "Week 4", "7 Weeks", "Deploy AWS Greengrass edge PCs at Newcastle plant, develop OPC-UA poller, TimescaleDB setup.", "Live Telemetry Pipeline in Staging, Edge Gateway Build", "Milestone 2 Sign-off"),
            ("Phase 3", "AI Predictive Engine, Web Portal & SAP PM Sync", "Week 11", "7 Weeks", "Develop FFT spectral anomaly model, web health dashboard, automated SAP PM work order integration.", "Asset Health Portal Demo, SAP PM Connector Test", "Milestone 3 Sign-off"),
            ("Phase 4", "Pilot Machine Validation (Newcastle Plant) & Load Test", "Week 18", "3 Weeks", "Live validation on 50 critical rolling mill assets, vibration calibration, k6 load test.", "Pilot Acceptance Certificate, Vibration Accuracy Report", "Milestone 4 Sign-off"),
            ("Phase 5", "Full Rollout (All 4 Plants) & 90-Day Hypercare", "Week 21", "3 Weeks", "Deploy remaining 400 assets across 3 plants, plant maintenance staff training, hypercare.", "Full Plant Acceptance Sign-off, Final Handover", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Site Survey & UI/UX Design", 40, 650.00, 26000.00, "IIoT Architect (12d), PM (8d), Tech Lead (10d), UI/UX (10d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Edge Gateway Deployment & Ingestion Engine", 130, 523.08, 68000.00, "Backend (55d), Tech Lead (25d), IoT Eng (25d), QA (15d), PM (10d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: AI Predictive Models, Web Portal & SAP Sync", 115, 521.74, 60000.00, "ML Eng (35d), Frontend (30d), Backend (25d), QA (15d), PM (10d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: Pilot Machine Validation & Calibration", 45, 488.89, 22000.00, "QA/Commissioning (20d), Tech Lead (10d), ML Eng (10d), PM (5d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Full Rollout (4 Plants) & Hypercare", 30, 506.67, 15200.00, "Tech Lead (10d), PM (10d), Backend (5d), ML Eng (5d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Architecture Sign-off", 0.20, 42240.00, "Dec 14, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Edge Gateway Ingestion Pipeline Demo Gate", 0.25, 52800.00, "Feb 01, 2027 (End Sprint 4)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Asset Portal & AI Anomaly Model Demo Gate", 0.30, 63360.00, "Mar 22, 2027 (End Sprint 7)", "Due within 14 days of gate approval"),
            ("Milestone 4", "Newcastle Pilot Sign-off & SAP PM Live Gate", 0.15, 31680.00, "Apr 12, 2027 (End Sprint 9)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Full 4-Plant Network Handover & Hypercare Gate", 0.10, 21120.00, "May 03, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data
