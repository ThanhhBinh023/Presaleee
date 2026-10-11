"""
Scenarios 2, 3, 4, 5:
2. FinTech Digital Banking & Micro-Lending (ApexCredit)
3. HealthTech Hospital Information System & EHR (MediCare Network)
4. Hospitality Boutique Hotel Chain PMS (Coastal Stay Hotels)
5. Logistics Fleet Telematics & Route Optimization (TransOcean Freight)
"""

from proposals_data_definitions import (
    DEFAULT_RATE_CARD,
    DEFAULT_PM_SECTIONS,
    DEFAULT_DOD_ITEMS,
    DEFAULT_SLA_DATA
)

# =====================================================================
# SCENARIO 02: FINTECH DIGITAL BANKING & MICRO-LENDING
# =====================================================================
def get_scenario_02():
    rfp_meta = {
        "title": "NEXT-GEN DIGITAL BANKING & MICRO-LENDING PLATFORM – REQUEST FOR PROPOSAL",
        "client": "ApexCredit Financial Technologies Ltd",
        "date": "10 October 2026",
        "contact": "Julian Thorne – Chief Product Officer (julian.thorne@apexcredit.example | +61 2 8555 4321)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Company", "ApexCredit Financial Technologies Ltd (Licensed Non-Bank Financial Institution)"),
            ("What we do", "We provide consumer micro-loans, instant digital credit lines, and Buy-Now-Pay-Later (BNPL) facilities across Australia and New Zealand."),
            ("Our current scale", "- Over 180,000 registered borrowers with $65M active loan book.\n- Currently growing at 15% month-on-month.\n- Average micro-loan size: AUD $500 to $3,500; loan tenure: 3 to 12 months.\n- Over 4,500 loan applications received daily."),
            ("Contact & Stakeholders", "Julian Thorne – Chief Product Officer\nDr. Aris Vance – Head of Credit Risk & AI Modeling\nSamantha Reed – Chief Compliance Officer & General Counsel")
        ]},
        {"section": "Where we are at the moment (Our current setup)", "items": [
            ("Current setup", "We launched 3 years ago using a white-label loan portal glued to an off-the-shelf PHP backend. User registration happens on a clumsy responsive website. Identity verification requires users to manually upload photo copies of their driver's licence, which our compliance team reviews by eye. Credit risk assessment is handled by credit officers opening Excel spreadsheets and pulling credit scores manually."),
            ("What isn't working for us (Our biggest headaches)", "- Horrible onboarding drop-off: 62% of applicants drop off during onboarding because identity verification takes up to 2 business days. Today's consumers expect instant approvals in under 3 minutes.\n- Fraud & synthetic IDs: Because ID checks are manual, we were hit with 140 synthetic identity fraud cases last quarter, resulting in a $320,000 credit write-off.\n- Mobile experience is terrible: We have no native mobile apps. Customers constantly complain about having to log into a clunky web portal on mobile Safari just to check payment dates or schedule a repayment.\n- Rigid repayment & collection: Repayments only debit via direct debit batch files once a week. If a debit fails, customers get slapped with bank dishonour fees, creating brand backlash.\n- Core banking disconnect: Our loan ledger does not sync in real time with our banking partner's transactional accounts, creating reconciliation discrepancies every month-end.")
        ]},
        {"section": "What we're looking for", "items": [
            ("In short", "We want to build a world-class Native Digital Banking & Micro-Lending Mobile App (iOS & Android) backed by a high-throughput, cloud-native Core Lending Microservice. We want fully automated eKYC, instant algorithmic credit decisioning in under 90 seconds, and seamless PayID / debit card repayments."),
            ("Key things we need it to do", "- Modern Mobile App: Native iOS and Android banking app with biometric login (FaceID/Fingerprint), digital wallet balance, instant loan application slider, and repayment calendar.\n- Instant eKYC Engine: Automated document verification (Australian Driver Licence, Passport) with AI facial liveness detection.\n- Automated Credit Decisioning: Real-time credit risk scoring engine integrating with Equifax & Illion APIs, open banking (CDR) bank statement ingestion, calculating debt-to-income and instant limit assignment in < 90 seconds.\n- Instant Loan Disbursement: Direct integration with New Payments Platform (NPP / Osko) for sub-60-second loan funds transfer directly into customer bank accounts 24/7.\n- Flexible Repayment Engine: Apple Pay, Google Pay, PayID, and automated recurring card debits with SMS reminder alerts.")
        ]},
        {"section": "Things we'd need it to connect to", "items": [
            ("Integrations", "- Equifax Australia & Illion Credit Bureau APIs\n- Australian Document Verification Service (DVS) via authorized gateway (e.g. FrankieOne / IDverse)\n- Open Banking (CDR) aggregator (Basiq / Frollo) for 90-day bank statement retrieval\n- New Payments Platform (NPP / Osko) & Cuscal payment rails\n- Stripe & Zepto for automated card debit and PayID collections\n- Core Banking General Ledger (Mambu / Thought Machine)")
        ]},
        {"section": "Timeline and budget", "items": [
            ("Expectations", "- Timeline: 20 to 22 weeks to launch Phase 1 (iOS/Android mobile apps, eKYC, and automated lending engine).\n- Budget: Approved capital expenditure is roughly AUD $200,000 to $250,000 (ex GST).\n- Compliance: Solution must comply strictly with PCI-DSS Level 1, Australian Privacy Act, and APRA CPS 234 cybersecurity standards.")
        ]}
    ]

    p_data = {
        "title": "PROPOSAL: NEXT-GEN DIGITAL BANKING & MICRO-LENDING PLATFORM",
        "client": "ApexCredit Financial Technologies Ltd",
        "proposal_id": "PRP-2026-APX-02",
        "date": "12 October 2026",
        "duration_weeks": 22,
        "total_mandays": 360,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "ApexCredit Financial Technologies Ltd", "Presale Solution Lead", "Julianna Ross (Principal FinTech Architect)"),
                ("Project Code", "PBL6-APX-BANK-2026", "Delivery Manager", "Marcus Sterling (Senior FinTech Delivery Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial)", "Target Kick-off", "09 November 2026"),
                ("Primary Objective", "Deploy Native iOS/Android Banking App, Instant eKYC, and Real-time Lending Engine", "Total Delivery Duration", "22 Calendar Weeks (11 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "ApexCredit suffers from 62% customer onboarding abandonment due to 48-hour manual ID checks and spreadsheet underwriting. Lack of native mobile apps and manual reconciliation exposes the company to fraud ($320k last quarter) and brand erosion.", "", ""),
                ("Proposed Strategic Solution", "We propose 'ApexCore Digital Bank': A secure, cloud-native FinTech platform comprising high-performance Flutter mobile apps, an automated eKYC pipeline with biometric liveness, algorithmic credit scoring integrating Equifax & Open Banking CDR, and sub-60s NPP/Osko loan disbursement.", "", ""),
                ("Measurable Business Impact", "• Onboarding drop-off reduced from 62% down to < 12% via 90-second instant eKYC.\n• Loan decisioning accelerated from 48 hours to under 60 seconds automated approval.\n• Synthetic identity fraud reduced by 98% via biometric liveness verification.\n• Loan book volume capacity increased from 4,500/day to 50,000+ daily applications.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$188,400 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$18,840", "Payment Term Milestone Structure", "5 Deliverable-Based Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$207,240 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $5,200/month (99.99% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("FinTech Solution Architect", "Vendor", "Part-Time (40%)", "Security architecture, APRA CPS 234 compliance, Open Banking & Core banking API design", "Security Blueprint, CDR Integration Spec, Threat Model", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Sprint governance, PCI-DSS compliance coordination, budget & timeline management", "Burndown Charts, Risk Register, Governance Reports", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "Lead microservice architecture, encryption key management, code review quality gate", "Core Architecture, CI/CD, Key Management Framework", "Lead"),
            ("Senior Backend Engineers (2)", "Vendor", "Full-Time (200%)", "Lending engine, eKYC integration, credit scoring microservice, NPP payment rails", "REST/gRPC APIs, Underwriting Engine, Worker Jobs", "Senior"),
            ("Senior Mobile Engineers (2)", "Vendor", "Full-Time (200%)", "Native iOS & Android development in Flutter, biometric security, camera capture", "Flutter Banking App, Security Keystore Integration", "Senior"),
            ("QA / Security Test Lead", "Vendor", "Full-Time (100%)", "Automated test suites, security vulnerability testing, financial calculation audits", "Test Automation Suite, Financial Audit Report", "Senior"),
            ("UI/UX Product Designer", "Vendor", "Phase 1 & 2 (50%)", "FinTech ergonomics, friction-free onboarding UX, loan repayment visualization", "Figma Design System, Interactive Prototypes", "Senior"),
            ("DevOps & Cloud Security", "Vendor", "Part-Time (40%)", "AWS Multi-Region deployment, KMS encryption, WAF, automated security scanning", "Terraform Scripts, SOC2 Compliance Infrastructure", "Senior"),
            ("Product Owner (PO)", "Client", "Key Stakeholder (40%)", "Credit risk policy clarification, lending criteria sign-off, regulatory review", "Credit Policy Specification, UAT Acceptance", "Executive"),
            ("Chief Risk Officer", "Client", "Advisory (20%)", "Underwriting model validation, bureau integration rules, fraud thresholds", "Credit Risk & Underwriting Rulebook", "Executive")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Equifax or Illion credit bureau API downtime causes lending decision stalls.", "High", "Low", "Implement dual-bureau failover fallback logic; if Equifax fails, route to Illion automatically.", "Tech Lead"),
            ("RSK-02", "Risk", "App Store / Google Play review rejection due to strict financial services lending guidelines.", "High", "Medium", "Prepare legal credit license documentation, APR disclosures, and conduct pre-submission review.", "Compliance Lead"),
            ("RSK-03", "Risk", "Open Banking (CDR) user consent friction during bank statement ingestion.", "Medium", "Medium", "Design high-trust bank connection UI with accredited CDR data recipient badge.", "UI/UX Designer"),
            ("ASM-01", "Assumption", "Client maintains active Australian Credit Licence (ACL) and DVS bureau credentials.", "High", "N/A", "Client compliance team confirmed licences active and in good standing.", "Client Sponsor"),
            ("DEP-01", "Dependency", "NPP / Osko banking partner API sandbox access and settlement escrow account.", "High", "Open", "Client treasury team coordinating with Cuscal / banking partner for sandbox keys.", "Client IT"),
            ("DEP-02", "Dependency", "FrankieOne / IDverse eKYC commercial API subscription provisioned by Week 3.", "High", "Open", "Contract execution underway; mock eKYC sandbox used for Sprint 1.", "Client PM")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-KYC-01", "Onboarding & eKYC", "Biometric Document Verification", "System shall capture user photo ID, verify against Australian DVS database, and perform 3D liveness check.", "Must-Have", "High", "Sprint 1"),
            ("FR-KYC-02", "Onboarding & eKYC", "Open Banking CDR Bank Retrieval", "System shall securely connect to user bank via CDR and retrieve 90 days of categorised bank statements.", "Must-Have", "High", "Sprint 2"),
            ("FR-UND-01", "Credit Underwriting", "Automated Credit Bureau Pull", "System shall query Equifax credit score, default records, and debt-to-income metrics via automated API.", "Must-Have", "High", "Sprint 3"),
            ("FR-UND-02", "Credit Underwriting", "Decisioning Rule Engine", "System shall calculate risk grade (A-E), generate instant approval or decline, and set credit limit in <60s.", "Must-Have", "High", "Sprint 3"),
            ("FR-LOAN-01", "Loan Management", "Dynamic Loan Calculator", "Mobile app shall provide interactive slider for loan amount ($500-$3,500) and tenure with transparent APR fees.", "Must-Have", "Medium", "Sprint 4"),
            ("FR-LOAN-02", "Loan Management", "Digital Contract E-Sign", "System shall generate DocuSign/built-in digital credit contract and record cryptographic timestamp consent.", "Must-Have", "Medium", "Sprint 4"),
            ("FR-PAY-01", "Payment & Disbursement", "Real-Time NPP / Osko Payout", "System shall disburse approved loan funds via NPP/Osko within 60 seconds directly to user PayID/BSB.", "Must-Have", "High", "Sprint 5"),
            ("FR-PAY-02", "Payment & Disbursement", "Automated Repayment Debits", "System shall execute automated scheduled repayments via PayID and stored debit card with pre-debit SMS.", "Must-Have", "High", "Sprint 6"),
            ("FR-MOB-01", "Mobile Banking App", "Biometric Authentication", "Mobile app shall support FaceID, TouchID, and cryptographic device binding with jailbreak detection.", "Must-Have", "High", "Sprint 5"),
            ("FR-MOB-02", "Mobile Banking App", "Repayment Schedule & Early Pay", "Mobile app shall display upcoming payment calendar and allow 1-click fee-free early loan payoff.", "Must-Have", "Medium", "Sprint 7"),
            ("FR-ADM-01", "Backoffice Portal", "Underwriting Override & Audit", "Backoffice web portal shall allow compliance officers to inspect loan applications and audit trail.", "Must-Have", "Medium", "Sprint 8"),
            ("FR-ADM-02", "Backoffice Portal", "Collections & Arrears Tracker", "System shall flag overdue accounts, automate grace-period reminders, and generate regulatory reports.", "Should-Have", "Medium", "Sprint 9")
        ],
        "tech_data": [
            ("Mobile Banking App", "Flutter 3.x (Dart)", "3.24+", "Single secure codebase with hardware keystore integration, SSL pinning, and jailbreak detection.", "Open Source / Native", "Redundant CDN endpoints"),
            ("Core Backend API", "Go (Golang) & NestJS", "1.23+ / 10+", "Go for ultra-fast underwriting engine; NestJS for financial ledger domain services.", "Open Source / AWS EKS", "Auto-scaling Pods (4-20)"),
            ("Financial Database", "PostgreSQL (AWS Aurora)", "16.x", "ACID compliance, strict double-entry ledger database schema, encrypted column storage.", "AWS Managed Aurora", "Multi-AZ Auto-Failover (<20s)"),
            ("Cache & Lock Service", "Redis Enterprise", "7.2+", "In-memory session state, rate-limiting, and idempotency key locks preventing double-spend.", "AWS ElastiCache", "Multi-AZ Replication"),
            ("Event Bus", "Apache Kafka (AWS MSK)", "3.7+", "Audit-compliant immutable event log for every financial transaction and state change.", "AWS Managed Kafka", "3-AZ Cluster"),
            ("Cloud & Security", "AWS Sydney (ap-southeast-2)", "N/A", "APRA CPS 234 compliant architecture, AWS KMS Hardware Security Module (HSM), CloudHSM.", "AWS Enterprise", "Multi-AZ (3 Zones)"),
            ("WAF & DDoS", "Cloudflare Enterprise & AWS WAF", "N/A", "Financial-grade DDoS mitigation, rate-limiting, bot protection, and mTLS API protection.", "Cloudflare / AWS", "Global Anycast")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "Loan Decision Latency", "End-to-end automated credit decisioning generated in < 90 seconds (P95) from submission.", "Automated performance benchmark with simulated bureau response.", "Asynchronous parallel API invocation of bureau & CDR.", "Sprint 10"),
            ("NFR-PERF-02", "Peak Throughput", "Handle 2,000 concurrent mobile app users and 200 loan applications/minute.", "k6 load test simulating high-volume payday rush.", "Go microservice architecture with read-replica DB pool.", "Sprint 10"),
            ("NFR-AVAIL-01", "System Availability", "99.99% core transaction uptime (less than 4.3 minutes unscheduled downtime/month).", "Synthetic multi-location health probes with automated failover.", "Multi-AZ Aurora, EKS pod autoscaling, multi-node Kafka.", "Production Go-Live"),
            ("NFR-SEC-01", "Encryption Standards", "AES-256 for all PII data and database columns; TLS 1.3 with certificate pinning on mobile.", "Independent CREST penetration test and cryptographic audit.", "AWS KMS Customer Master Keys and Hardware Security Module.", "Sprint 9"),
            ("NFR-SEC-02", "Regulatory Compliance", "Full compliance with APRA CPS 234, PCI-DSS Level 1, and Australia Privacy Act 1988.", "External compliance audit report by accredited QSA.", "Zero plain-text PAN storage, strict RBAC, immutable logs.", "Sprint 10")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Architecture & Compliance Blueprint", "Week 1", "3 Weeks", "Architecture specifications, APRA compliance model, eKYC & bureau API integration design, Figma UI prototypes.", "Architecture Document, Security Blueprint, Figma Prototype", "Milestone 1 Sign-off"),
            ("Phase 2", "Core Lending Engine, eKYC & Bureau Connectors", "Week 4", "7 Weeks", "Develop automated eKYC pipeline, Equifax/Illion integration, Open Banking ingestion, risk scoring microservice.", "Lending Engine API in Staging, eKYC Demo, Underwriting Suite", "Milestone 2 Sign-off"),
            ("Phase 3", "Mobile Banking Apps & NPP Payment Rails", "Week 11", "6 Weeks", "Develop Flutter mobile apps (iOS/Android), NPP/Osko payout rails, PayID repayments, biometric binding.", "Flutter App Builds (TestFlight/Play Console), Payout Demo", "Milestone 3 Sign-off"),
            ("Phase 4", "Security Pentest, Load Testing & UAT", "Week 17", "3 Weeks", "External CREST security penetration testing, PCI-DSS compliance verification, financial math audits, UAT.", "Pentest Clearance Report, UAT Acceptance Certificate", "Milestone 4 Sign-off"),
            ("Phase 5", "Production Deployment, App Store Launch & Hypercare", "Week 20", "3 Weeks", "App Store / Google Play public release, production cloud cutover, 24/7 on-call engineering hypercare.", "Production Verification Sign-off, Final Handover", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Inception & Security Design", 40, 650.00, 26000.00, "FinTech SA (12d), PM (8d), Tech Lead (10d), UI/UX (10d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Lending Engine, eKYC & Bureau Integration", 130, 526.15, 68400.00, "Backend (60d), Tech Lead (25d), PM (15d), QA (20d), DevOps (10d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: Mobile Apps & NPP Payout Rails", 110, 510.91, 56200.00, "Mobile (50d), Backend (25d), QA (20d), PM (15d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: Security Pentest, Load Testing & UAT", 48, 483.33, 23200.00, "QA Lead (20d), Security SA (8d), PM (10d), DevOps (10d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Production Deployment, App Store Launch & Hypercare", 32, 456.25, 14600.00, "Tech Lead (10d), PM (10d), Mobile (6d), Backend (6d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Architecture Sign-off", 0.20, 41448.00, "Nov 09, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Lending Engine & eKYC Staging Verification", 0.25, 51810.00, "Dec 28, 2026 (End Sprint 4)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Mobile App Feature Complete & Payout Demo", 0.30, 62172.00, "Feb 08, 2027 (End Sprint 7)", "Due within 14 days of gate approval"),
            ("Milestone 4", "Security Pentest Sign-off & App Store Submission", 0.15, 31086.00, "Mar 15, 2027 (End Sprint 9)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Production Launch & 90-Day Hypercare Acceptance", 0.10, 20724.00, "Apr 05, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data


# =====================================================================
# SCENARIO 03: HEALTHTECH HOSPITAL INFORMATION SYSTEM & EHR
# =====================================================================
def get_scenario_03():
    rfp_meta = {
        "title": "CLOUD HOSPITAL INFORMATION SYSTEM (HIS) & TELEHEALTH – REQUEST FOR PROPOSAL",
        "client": "MediCare Regional Health Network",
        "date": "14 October 2026",
        "contact": "Dr. Eleanor Vance – Chief Medical Officer (eleanor.vance@medicarehealth.example | +61 3 9555 8888)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Organization", "MediCare Regional Health Network (Comprehensive Healthcare Group)"),
            ("What we do", "We operate 14 outpatient polyclinics and diagnostic centers across Victoria and regional New South Wales with 85 general practitioners, 32 medical specialists, and 140 nursing staff."),
            ("Patient volume", "- Approx. 1,400 patient consultations conducted daily across the network.\n- Over 220,000 active patient health records.\n- Operating across general medicine, pathology testing, pediatric care, cardiology, and digital telehealth."),
            ("Contact & Governance", "Dr. Eleanor Vance – Chief Medical Officer & Clinical Sponsor\nThomas Sterling – Director of Health Informatics & IT\nClara Jenkins – Clinical Operations Lead")
        ]},
        {"section": "Where we are at the moment (Our current setup)", "items": [
            ("Current setup", "Each of our 14 clinics runs a separate legacy desktop medical software installed on local clinic servers back in 2012. Patient notes and treatment histories are locked inside local servers at each clinic. When a patient visits a different clinic within our network, doctors have no visibility into their past medical history, allergy alerts, or recent blood test results unless staff manually fax paper summaries!"),
            ("What isn't working for us (Our biggest headaches)", "- Disconnected patient records: Doctors cannot access medical notes from other clinics, resulting in duplicated blood tests ($180k wasted annually) and dangerous prescription clash risks.\n- 45-minute waiting room delays: Patients queue up at front desk counters filling out physical paper clipboards with personal details. Front-desk staff spend all day manually retyping handwriting into desktop computers.\n- High appointment no-show rate: Our no-show rate is currently 18%, leaving expensive doctor consultation slots idle and costing our network over $450,000 a year in lost revenue.\n- Primitive telehealth: During Covid, we scrambled to use consumer Zoom links emailed to patients. Doctors have to write notes on paper during the call and type them into the local computer later, with zero integration to electronic prescriptions.\n- Cyber risk & compliance: Two clinic servers suffered hard drive corruptions this year. Managing on-premise backups across 14 individual clinic closets is a massive data loss risk and violates Australian Privacy Act health records standards.")
        ]},
        {"section": "What we're looking for", "items": [
            ("In short", "We need a unified, cloud-based Electronic Health Record (EHR) and Clinic Management Platform that connects all 14 clinics. It must provide digital patient intake, real-time doctor consultation scheduling, secure HD telehealth video with in-call clinical notes, automated e-prescriptions, and a patient mobile portal."),
            ("Key things we need it to do", "- Unified Cloud EHR: Centralized patient medical history, clinical encounter notes, diagnostic pathology results, and automated drug-allergy interaction warnings accessible securely across all clinics.\n- Smart Patient Intake & Portal: Mobile web check-in allowing patients to verify Medicare details, upload insurance cards via camera OCR, and complete triage questionnaires from their phone before arriving.\n- Integrated Telehealth Suite: WebRTC-based HIPAA/Privacy Act compliant video consultation embedded directly into the doctor's EHR view with screen sharing and instant e-script dispatch.\n- Automated SMS Appointment Reminders: Intelligent two-way SMS reminders allowing patients to confirm or reschedule with 1 click, reducing no-show rates to under 5%.\n- Electronic Prescriptions & Medicare Billing: Direct integration with Australian eRx Script Exchange, Medicare Easyclaim online billing, and electronic pathology lab ordering.")
        ]},
        {"section": "Things we'd need it to connect to", "items": [
            ("Integrations", "- Australian eRx Script Exchange / MediSecure for legal digital prescriptions\n- Medicare Online & DVA claiming API via Services Australia\n- Australian My Health Record (B2B FHIR / HL7 gateway)\n- Sonic Healthcare & Sullivan Nicolaides Pathology lab results feeds (HL7 v2.4)\n- Twilio / MessageMedia for automated SMS appointment workflows\n- Tyro / Stripe for digital consultation card payments")
        ]},
        {"section": "Timeline and budget", "items": [
            ("Expectations", "- Timeline: 22 to 24 weeks phased rollout across all 14 clinics.\n- Budget: Approved board capital budget of AUD $210,000 to $260,000 (ex GST).\n- Compliance: Mandatory compliance with Australian Privacy Principles (APPs), My Health Record Act 2012, and RACGP Standards for General Practices.")
        ]}
    ]

    p_data = {
        "title": "PROPOSAL: ENTERPRISE CLOUD EHR & TELEHEALTH PLATFORM",
        "client": "MediCare Regional Health Network",
        "proposal_id": "PRP-2026-MED-03",
        "date": "16 October 2026",
        "duration_weeks": 24,
        "total_mandays": 375,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "MediCare Regional Health Network", "Presale Solution Lead", "Dr. Alistair Chen (Chief Clinical Architect)"),
                ("Project Code", "PBL6-MED-EHR-2026", "Delivery Manager", "Fiona Gallagher (Senior HealthTech Delivery Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial Bid)", "Target Kick-off", "16 November 2026"),
                ("Primary Objective", "Deploy Unified Cloud EHR, Patient Portal, and Telehealth across 14 Regional Clinics", "Total Delivery Duration", "24 Calendar Weeks (12 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "MediCare suffers from fragmented on-premise clinic servers, 18% appointment no-show rates ($450k lost revenue), 45-minute waiting room congestion, and clinical risks due to lack of cross-clinic medical record visibility.", "", ""),
                ("Proposed Strategic Solution", "We propose delivering 'MediSync Health Cloud': A unified cloud EHR platform featuring a centralized longitudinal patient health record, digital mobile patient intake, WebRTC secure video telehealth, automated SMS reminders, and Australian eRx / Medicare integration.", "", ""),
                ("Measurable Business Impact", "• 75% reduction in appointment no-show rates (from 18% down to < 4.5%) via automated two-way SMS.\n• Waiting room check-in time slashed from 45 minutes to < 3 minutes via mobile pre-intake.\n• $180k annual savings from eliminating duplicate pathology testing across network clinics.\n• 100% elimination of on-premise clinic server failure risks through secure AWS Sydney hosting.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$196,250 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$19,625", "Payment Term Milestone Structure", "5 Deliverable-Based Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$215,875 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $4,900/month (99.95% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("HealthTech Solution Architect", "Vendor", "Part-Time (35%)", "Clinical architecture, HL7/FHIR interoperability, My Health Record security governance", "EHR Architecture Blueprint, FHIR Data Model, Security Spec", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Clinical sprint orchestration, clinic staff rollout planning, regulatory milestone sign-off", "Sprint Burndown, Clinical Training Plan, Status Reports", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "Lead microservices engineering, HL7 integration engine, cryptographic audit trail", "Core Framework, CI/CD, FHIR Integration Service", "Lead"),
            ("Senior Backend Engineers (2)", "Vendor", "Full-Time (200%)", "EHR patient record services, appointment scheduler, eRx connector, Medicare billing API", "REST/FHIR APIs, Clinical Database Schema, Workers", "Senior"),
            ("Senior Frontend Engineer", "Vendor", "Full-Time (100%)", "Doctor clinical workstation portal (Next.js 15), WebRTC telehealth interface, appointment matrix", "Responsive Clinical Web Portal, Telehealth UI", "Senior"),
            ("Senior Mobile Engineer", "Vendor", "Full-Time (100%)", "Patient mobile portal (Flutter) for appointment booking, test results, and check-in", "iOS & Android Patient App Builds", "Senior"),
            ("QA / Clinical Systems Lead", "Vendor", "Full-Time (100%)", "Clinical workflow test suites, drug-allergy interaction verification, HL7 message testing", "Automated Clinical Test Suite, RACGP Audit Report", "Senior"),
            ("UI/UX Product Designer", "Vendor", "Phase 1 & 2 (50%)", "High-efficiency doctor charting ergonomics, patient mobile accessibility design", "Figma Design System, Doctor Charting Wireframes", "Senior"),
            ("DevOps & Cloud Security", "Vendor", "Part-Time (40%)", "AWS Sydney health-grade deployment, KMS encryption, automated disaster recovery", "Terraform Scripts, Health Cloud Infrastructure", "Senior"),
            ("Product Owner (PO)", "Client", "Key Stakeholder (40%)", "Clinical requirement clarification, medical specialty charting input, UAT sign-off", "Clinical Requirements Specification, UAT Sign-off", "Executive"),
            ("Director of Health Informatics", "Client", "Key Partner (25%)", "Legacy database export coordination, clinic network firewall whitelist, My Health Record liaison", "Legacy Database Exports, Clinic IT Liaison", "Lead")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Doctor resistance to adopting new electronic charting interface during busy clinic days.", "High", "High", "Engage clinical champions; design ultra-fast keyboard shortcuts and 1-click charting templates.", "Clinical Architect"),
            ("RSK-02", "Risk", "Corrupted or non-standard clinical data in legacy 2012 on-premise database exports.", "High", "Medium", "Run automated data cleansing and deduplication scripts during Phase 2; clinical validation audit.", "Tech Lead"),
            ("RSK-03", "Risk", "Services Australia Medicare claiming API gateway latency or certification delays.", "High", "Low", "Initiate Medicare vendor software integration testing early in Sprint 2.", "Lead Backend"),
            ("ASM-01", "Assumption", "Client clinic rooms have stable 50+ Mbps fiber internet connection for HD video telehealth.", "Medium", "N/A", "Client IT confirmed all 14 clinics upgraded to NBN Enterprise Ethernet.", "Client IT"),
            ("DEP-01", "Dependency", "Australian eRx Script Exchange vendor production credentials and test certificate.", "High", "Open", "Client medical director submitted eRx agreement; sandbox keys delivered.", "Client Sponsor")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-EHR-01", "Clinical Record", "Longitudinal Patient Record", "System shall display consolidated medical history, previous consultations, vitals, and allergies in single view.", "Must-Have", "High", "Sprint 1"),
            ("FR-EHR-02", "Clinical Record", "Drug-Allergy Interaction Engine", "System shall automatically check proposed prescriptions against patient allergy profile and trigger warnings.", "Must-Have", "High", "Sprint 2"),
            ("FR-SCH-01", "Appointment Engine", "Multi-Clinic Doctor Scheduler", "System shall manage doctor appointment slots across all 14 clinics with real-time multi-practitioner calendar.", "Must-Have", "Medium", "Sprint 3"),
            ("FR-SCH-02", "Appointment Engine", "Automated Two-Way SMS Reminders", "System shall dispatch automated SMS reminders 48h and 24h prior, allowing 1-click confirmation or reschedule.", "Must-Have", "Medium", "Sprint 3"),
            ("FR-INT-01", "Patient Mobile Intake", "Pre-Visit Digital Check-In", "Patients shall receive mobile intake link to verify Medicare details, upload insurance, and answer symptoms.", "Must-Have", "High", "Sprint 4"),
            ("FR-TEL-01", "Telehealth Suite", "Encrypted WebRTC Video Consultation", "Doctor workstation shall launch embedded peer-to-peer HD video call with patient directly within clinical note tab.", "Must-Have", "High", "Sprint 5"),
            ("FR-TEL-02", "Telehealth Suite", "In-Call Medical Documentation", "Doctor shall enter clinical findings, diagnoses (ICD-10/SNOMED CT), and orders during active video session.", "Must-Have", "Medium", "Sprint 6"),
            ("FR-RX-01", "Prescriptions & Labs", "Australian eRx Electronic Scripts", "System shall generate legally compliant e-prescriptions with cryptographic QR barcode sent via SMS to patient.", "Must-Have", "High", "Sprint 7"),
            ("FR-RX-02", "Prescriptions & Labs", "HL7 Pathology Lab Ordering", "System shall send electronic lab order requests and ingest diagnostic pathology reports via HL7 v2.4 feeds.", "Must-Have", "High", "Sprint 8"),
            ("FR-BIL-01", "Billing & Claiming", "Medicare & DVA Online Claiming", "System shall submit direct batch bulk-billing and patient claiming to Medicare Australia API in real-time.", "Must-Have", "High", "Sprint 9"),
            ("FR-PAT-01", "Patient Mobile Portal", "Mobile App Consultation Booking", "Patients shall search doctors, book appointments, view upcoming visits, and view test results on mobile.", "Must-Have", "Medium", "Sprint 9")
        ],
        "tech_data": [
            ("Doctor Web Workstation", "Next.js 15 (React 19, TypeScript)", "15.0+", "Fast server-side rendering, sub-second patient record switching, Tailwind CSS medical UI.", "Open Source / AWS", "Multi-AZ CloudFront"),
            ("Patient Mobile App", "Flutter 3.x (Dart)", "3.24+", "Single accessible cross-platform app for patients to check in, book appointments, and view e-scripts.", "Open Source / Native", "Redundant App Gateways"),
            ("Core Clinical Backend", "NestJS (Node.js) & Python FHIR", "10.4+ / 3.12+", "NestJS for microservices; Python for HL7/FHIR parsing and clinical data transformers.", "Open Source / AWS EKS", "Auto-scaling Pods (3-15)"),
            ("Telehealth Media Server", "LiveKit / WebRTC Cloud", "1.7+", "Low-latency WebRTC media routing, selective forwarding unit (SFU), end-to-end media encryption.", "LiveKit Cloud / AWS", "Global TURN/STUN cluster"),
            ("Clinical Database", "PostgreSQL (AWS Aurora)", "16.x", "ACID compliance, JSONB for flexible medical assessment forms, row-level security for HIPAA compliance.", "AWS Managed Aurora", "Multi-AZ Auto-Failover (<30s)"),
            ("Audit Logging & Search", "AWS OpenSearch & Redis", "2.14+ / 7.2+", "Full-text medical history search; immutable audit trail recording every medical chart view.", "AWS OpenSearch", "Multi-Node Cluster"),
            ("Cloud & Compliance", "AWS Sydney (ap-southeast-2)", "N/A", "Dedicated VPC, HIPAA & Australian Privacy Act compliance, AWS KMS customer-managed keys.", "AWS Cloud Enterprise", "Multi-AZ (3 Zones)")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "Patient Chart Loading Time", "Complete longitudinal patient record loads in < 500ms (P95) across all 14 clinics.", "Automated k6 load test simulating 300 simultaneous doctor charts.", "Redis caching of demographic records; Aurora indexing.", "Sprint 11"),
            ("NFR-PERF-02", "Telehealth Video Latency", "Glass-to-glass video latency < 250ms with jitter buffer adaptation.", "WebRTC quality telemetry metrics analysis.", "LiveKit WebRTC selective forwarding unit with Sydney media relay.", "Sprint 10"),
            ("NFR-AVAIL-01", "System Availability", "99.95% clinical system uptime during core clinic operating hours (7:00 AM - 10:00 PM).", "Datadog health check probes with automated alert escalation.", "Multi-AZ Aurora, EKS pod autoscaling, multi-node fallback.", "Production Go-Live"),
            ("NFR-SEC-01", "Medical Record Privacy", "Zero plain-text storage of clinical notes; AES-256 field-level encryption for sensitive diagnoses.", "External cybersecurity penetration test and HIPAA audit.", "AWS KMS managed encryption and strict DB column security.", "Sprint 10"),
            ("NFR-SEC-02", "Audit Trail Immutability", "Cryptographically verifiable audit log recording doctor ID, timestamp, and patient chart accessed.", "Compliance audit inspection by medical legal advisor.", "Immutable PostgreSQL write-only audit table with S3 Glacier lock.", "Sprint 9")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Clinical Architecture & FHIR Modeling", "Week 1", "3 Weeks", "Clinical workflow discovery, FHIR schema design, doctor UI/UX prototyping, AWS health cloud setup.", "Clinical Architecture Document, Figma EHR Prototypes", "Milestone 1 Sign-off"),
            ("Phase 2", "Core EHR, Patient Scheduler & SMS Reminder Engine", "Week 4", "8 Weeks", "Develop longitudinal patient record, multi-clinic doctor schedule, two-way SMS reminder microservice.", "EHR Core Services in Staging, Scheduler Demo", "Milestone 2 Sign-off"),
            ("Phase 3", "Telehealth Suite, eRx Scripts & Medicare Claiming", "Week 12", "7 Weeks", "Develop WebRTC video consultation, Australian eRx integration, Medicare online billing, patient mobile app.", "Telehealth Working Demo, Patient Mobile App, eRx Suite", "Milestone 3 Sign-off"),
            ("Phase 4", "Clinical Testing, Security Pentest & Clinic Pilot", "Week 19", "3 Weeks", "End-to-end clinical workflow testing, CREST cybersecurity penetration testing, Pilot launch at 2 clinics.", "Clinical Audit Sign-off, Pentest Clearance Report", "Milestone 4 Sign-off"),
            ("Phase 5", "Full Network Rollout, Staff Training & Hypercare", "Week 22", "3 Weeks", "Phased rollout to remaining 12 clinics, on-site doctor/nurse training, 24/7 dedicated hypercare.", "Production Handover Runbook, Final Acceptance Certificate", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Inception & Clinical UX Design", 44, 638.64, 28100.00, "Health SA (12d), PM (8d), Tech Lead (10d), UI/UX (14d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Core EHR, Patient Scheduler & SMS Engine", 136, 523.53, 71200.00, "Backend (60d), Tech Lead (26d), PM (20d), QA (20d), DevOps (10d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: Telehealth, eRx, Medicare & Patient App", 112, 503.57, 56400.00, "Frontend (35d), Mobile (35d), Backend (22d), QA (20d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: Clinical Testing, Security Pentest & Pilot", 48, 500.00, 24000.00, "QA Lead (22d), Security SA (8d), PM (10d), DevOps (8d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Full Rollout, Clinical Training & Hypercare", 35, 472.86, 16550.00, "Tech Lead (11d), PM (12d), Frontend (6d), Backend (6d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Clinical Architecture Sign-off", 0.20, 43175.00, "Nov 16, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "EHR Record Engine & Scheduler Staging Demo", 0.25, 53968.75, "Jan 11, 2027 (End Sprint 4)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Telehealth & eRx Feature Complete Release", 0.30, 64762.50, "Mar 01, 2027 (End Sprint 8)", "Due within 14 days of gate approval"),
            ("Milestone 4", "Security Pentest Sign-off & 2-Clinic Pilot Go-Live", 0.15, 32381.25, "Apr 05, 2027 (End Sprint 10)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Full Network Rollout & 90-Day Hypercare Sign-off", 0.10, 21587.50, "Apr 26, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data


# =====================================================================
# SCENARIO 04: HOSPITALITY HOTEL PMS & GUEST EXPERIENCE
# =====================================================================
def get_scenario_04():
    rfp_meta = {
        "title": "CLOUD HOTEL PMS & GUEST EXPERIENCE PLATFORM – REQUEST FOR PROPOSAL",
        "client": "Coastal Stay Hotels Pty Ltd",
        "date": "18 October 2026",
        "contact": "Sarah Mitchell – Group Operations Manager (sarah.mitchell@coastalstay.example | +61 400 000 000)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Company", "Coastal Stay Hotels Pty Ltd"),
            ("What we do", "We own and operate three boutique coastal hotels on the east coast of Australia."),
            ("Properties & Scale", "- Byron Bay, NSW: 48 luxury boutique rooms\n- Gold Coast, QLD: 112 rooms (includes on-site restaurant & cocktail bar)\n- Sydney CBD, NSW: 60 boutique rooms\nTotal of 220 rooms across the group with high seasonal occupancy (88% peak)."),
            ("Contact & Leadership", "Sarah Mitchell – Group Operations Manager\nDavid Evans – Group Financial Controller\nLiam Rossi – IT & Hospitality Systems Coordinator")
        ]},
        {"section": "Where we are at the moment (Our current setup)", "items": [
            ("Current setup", "All three hotels run on an old on-premise hotel PMS that was installed back in 2013. Each hotel has its own physical server in the back office running local software. Rates, guest folios, and housekeeping schedules are managed through manual Excel spreadsheets."),
            ("What isn't working for us (Our biggest headaches)", "- Overbooking & double bookings: Last summer season, our OTA channel rates lagged by 4 hours. We suffered two major double-bookings over New Year's Eve on Booking.com and Expedia, costing us $12,000 in alternative accommodation and guest complaints.\n- Exhausting manual rate updates: Staff spend up to 2 hours every morning manually logging into Booking.com, Expedia, and Airbnb separately to adjust seasonal room rates.\n- Housekeeping still uses paper sheets: Floor staff wander around with clipboards and radios. Front desk never knows when a room is cleaned and inspected, making early check-in guests wait in the lobby.\n- No group-wide visibility: Head office has no unified dashboard. Every Friday, the GM has to wait for emailed spreadsheets from each property to see group occupancy and revenue.\n- Hardware failure risks: The Gold Coast server died twice this year. Front desk staff had to check guests in using paper registration cards for five hours! Furthermore, the software vendor is retiring support for our PMS version next year.")
        ]},
        {"section": "What we're looking for", "items": [
            ("In short", "A modern, cloud-hosted Hotel Property Management System (SaaS) that unifies front desk, central reservations, housekeeping, guest billing, and group reporting across all three properties, plus a direct booking engine for our website and digital door locks."),
            ("Key things we need it to do", "- Multi-Property Cloud PMS: Centralized reservations, guest check-in/out folios, automated night audit, and group-wide reporting.\n- Two-Way Channel Manager Sync: Real-time inventory and rate synchronization with Booking.com, Expedia, and Airbnb.\n- Mobile Housekeeping & Maintenance: Mobile tablet/phone web app for room attendants to update room status in real-time (Clean, Dirty, Inspected, Out-of-Order).\n- Direct Website Booking Engine: Clean, mobile-first booking widget for our website with promo codes and immediate credit card processing.\n- Restaurant POS & Key Card Integration: Post restaurant/bar charges from Gold Coast POS directly to guest room folios; integrate with Salto door lock system for digital keycards.")
        ]},
        {"section": "Things we'd need it to connect to", "items": [
            ("Integrations", "- Major OTAs via Channel Manager (Booking.com, Expedia, Airbnb, Agoda)\n- Stripe for direct web payments & Tyro EFTPOS card terminals at front desk\n- Xero for automated daily revenue accounting journals\n- Restaurant POS at Gold Coast property (Lightspeed / OrderMate)\n- Salto Space / Salto KS electronic door lock encoders\n- Our WordPress website for direct booking engine widget")
        ]},
        {"section": "Timeline and budget", "items": [
            ("Expectations", "- Timeline: Phased go-live across 26 weeks. Byron Bay pilot in Wave 1 (avoiding Christmas peak), Gold Coast in Wave 2, Sydney in Wave 3.\n- Budget: Software implementation and integration budget approximately AUD $150,000 to $200,000 (ex GST).\n- Commercial Model: Professional services for deployment + recurring monthly SaaS subscription.")
        ]}
    ]

    p_data = {
        "title": "PROPOSAL: CLOUD HOTEL PMS & GUEST EXPERIENCE SUITE",
        "client": "Coastal Stay Hotels Pty Ltd",
        "proposal_id": "PRP-2026-PMS-04",
        "date": "20 October 2026",
        "duration_weeks": 26,
        "total_mandays": 320,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "Coastal Stay Hotels Pty Ltd", "Presale Solution Lead", "Oliver Vance (Principal Hospitality Architect)"),
                ("Project Code", "PBL6-COAST-PMS-2026", "Delivery Manager", "Clare Montgomery (Senior Hospitality Delivery Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial)", "Target Kick-off", "09 November 2026"),
                ("Primary Objective", "Deploy Unified Cloud PMS across 3 Properties (220 Rooms), Channel Manager & Salto Key Sync", "Total Delivery Duration", "26 Calendar Weeks (3 Rollout Waves)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "Coastal Stay operates legacy on-premise PMS servers from 2013 with impending vendor end-of-life. Manual channel updates cause costly double-bookings, paper housekeeping delays check-ins, and server failures create severe operational downtime.", "", ""),
                ("Proposed Strategic Solution", "We propose deploying 'CoastCloud PMS': A modern cloud SaaS hospitality platform integrating multi-property reservations, automated two-way OTA channel distribution, mobile housekeeping status, Salto digital key encoding, and automated Xero journal sync.", "", ""),
                ("Measurable Business Impact", "• 100% elimination of double-bookings via sub-second two-way OTA channel synchronization.\n• 2 hours/day saved per property in manual rate uploading across Booking.com and Expedia.\n• Room turnover inspection time reduced by 35% through mobile housekeeping tasking.\n• Zero on-premise server maintenance overhead via AWS Australia multi-tenant cloud hosting.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$166,400 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$16,640", "Payment Term Milestone Structure", "5 Deliverable-Based Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$183,040 ex GST", "Ongoing SaaS Subscription", "AUD $4,100/month (220 rooms @ $18.60/room/mo)")
            ])
        ],
        "roles_data": [
            ("Hospitality Solution Architect", "Vendor", "Part-Time (30%)", "Hotel system architecture, OTA channel manager protocols, Salto lock integration", "PMS Architecture Blueprint, Integration Specifications", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Rollout wave management across Byron Bay, Gold Coast, Sydney; vendor governance", "Project Plan, Wave Go-Live Checklist, Status Reports", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "Core PMS engine, database schema, POS and Xero interface connectors, CI/CD pipeline", "PMS Core Architecture, Data Migration Scripts", "Lead"),
            ("Senior Backend Engineers (2)", "Vendor", "Full-Time (200%)", "Reservation state machine, channel manager webhooks, billing folios, night audit engine", "REST APIs, Night Audit Workers, Xero Connector", "Senior"),
            ("Senior Frontend Engineer", "Vendor", "Full-Time (100%)", "Front desk web dashboard, visual tape chart (room grid), direct website booking engine", "Front Desk Web Application, Direct Booking Widget", "Senior"),
            ("Mobile Web Specialist", "Vendor", "Part-Time (50%)", "Responsive mobile housekeeping app, maintenance ticketing interface", "Mobile Housekeeping PWA", "Senior"),
            ("QA / Hospitality Test Lead", "Vendor", "Full-Time (100%)", "Folio balance testing, channel sync validation, night audit reconciliation, UAT", "Test Plans, Folio Financial Audit Report", "Senior"),
            ("UI/UX Product Designer", "Vendor", "Phase 1 & 2 (50%)", "Tape chart ergonomics, quick check-in workflow, mobile housekeeping UI", "Figma Design System, Interactive Prototypes", "Senior"),
            ("Product Owner (PO)", "Client", "Key Stakeholder (40%)", "Room setup design, rate plan hierarchy sign-off, UAT lead", "Rate Matrix, UAT Acceptance Certificates", "Executive"),
            ("Group Financial Controller", "Client", "Key Stakeholder (20%)", "Xero chart of accounts, GST tax rule validation, payment gateway sign-off", "Financial Sign-off, Accounting Mapping", "Executive")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Migration of historical guest reservation data from legacy 2013 on-premise database.", "High", "Medium", "Run test extraction scripts in Byron Bay during Discovery; sanitize data into standard CSV.", "Tech Lead"),
            ("RSK-02", "Risk", "Property internet drop during front desk check-in peak at coastal hotels.", "Medium", "Medium", "Enable local PWA offline buffering for key check-in details with automatic background sync.", "Frontend Lead"),
            ("ASM-01", "Assumption", "Client property staff available for scheduled training workshops prior to each wave go-live.", "High", "N/A", "Training scheduled in 2-hour shifts to prevent hotel operational disruption.", "Client PM"),
            ("DEP-01", "Dependency", "Salto door lock server IP access and API license confirmed by Salto technician.", "High", "Open", "Client confirmed Salto local server access ready for test encoder in Sprint 3.", "Client IT")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-PMS-01", "Core Front Desk", "Interactive Visual Tape Chart", "Front desk staff shall view, drag-and-drop, and assign 220 rooms on an interactive daily/monthly tape chart.", "Must-Have", "High", "Sprint 1"),
            ("FR-PMS-02", "Core Front Desk", "Guest Folio & Split Billing", "System shall manage guest charges, room splits, restaurant debits, and generate compliant GST tax invoices.", "Must-Have", "High", "Sprint 2"),
            ("FR-CHN-01", "Channel Manager", "Two-Way OTA Synchronization", "System shall push room rates/availability and pull bookings from Booking.com, Expedia, and Airbnb in <30s.", "Must-Have", "High", "Sprint 3"),
            ("FR-HK-01", "Housekeeping", "Mobile Room Status Updating", "Attendants shall view assigned room list on mobile and mark rooms Clean, Inspected, or Maintenance.", "Must-Have", "Medium", "Sprint 4"),
            ("FR-INT-01", "Integrations", "Salto Key Card Encoder API", "Front desk check-in shall trigger RFID keycard creation directly via local Salto encoder integration.", "Must-Have", "High", "Sprint 5"),
            ("FR-INT-02", "Integrations", "Lightspeed Restaurant POS Interface", "Gold Coast restaurant staff shall charge food & beverage bills directly to guest room folios via room/name lookup.", "Must-Have", "Medium", "Sprint 5"),
            ("FR-INT-03", "Integrations", "Automated Xero Journal Sync", "Night audit shall automatically generate and export balanced daily revenue and payment journals to Xero.", "Must-Have", "Medium", "Sprint 6"),
            ("FR-BKG-01", "Direct Booking", "Website Direct Booking Engine", "Responsive website booking engine with live calendar, room photos, add-on packages, and Stripe payment.", "Must-Have", "Medium", "Sprint 6"),
            ("FR-RPT-01", "Reporting", "Group Executive Dashboard", "Head office shall view consolidated group RevPAR, ADR, occupancy rates, and forward booking pace.", "Must-Have", "Medium", "Sprint 7")
        ],
        "tech_data": [
            ("Front Desk Web App", "Next.js 15 (React 19, TypeScript)", "15.0+", "Fast interactive tape chart rendering, responsive UI, zero-install browser deployment.", "Open Source / AWS", "Multi-AZ CloudFront"),
            ("Mobile Housekeeping", "Progressive Web App (PWA)", "N/A", "Offline-capable lightweight web app running on any iOS/Android smartphone or tablet.", "Open Source / Web", "Cached Service Worker"),
            ("Core Backend Services", "NestJS (Node.js Enterprise)", "10.4+", "Modular TypeScript microservices for reservations, rate engine, and channel connectors.", "Open Source / AWS EKS", "Auto-scaling Pods (2-8)"),
            ("Hospitality Database", "PostgreSQL (AWS Aurora)", "16.x", "Strict transactional consistency for financial folios, multi-tenant property data isolation.", "AWS Managed Aurora", "Multi-AZ Auto-Failover"),
            ("Cache & Lock Service", "Redis Enterprise", "7.2+", "Sub-millisecond room inventory reservation locks during simultaneous online bookings.", "AWS ElastiCache", "Multi-AZ Replication"),
            ("Cloud Infrastructure", "AWS Sydney (ap-southeast-2)", "N/A", "Australian data residency compliance; low latency (< 20ms) across NSW and QLD hotels.", "AWS Enterprise", "Multi-AZ (3 Zones)")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "Channel Sync Latency", "OTA rate and availability changes synchronized to Booking.com/Expedia in < 30 seconds.", "Automated synthetic channel webhook response monitoring.", "Asynchronous message queue decoupling with Redis buffer.", "Sprint 8"),
            ("NFR-PERF-02", "Check-in Transaction Time", "Front desk check-in and room key generation completed in < 15 seconds.", "Usability time-and-motion testing during staff training.", "Optimized single-screen check-in workflow with pre-cached folios.", "Sprint 7"),
            ("NFR-AVAIL-01", "System Availability", "99.95% system uptime (< 21.6 minutes unscheduled downtime/month).", "Continuous external health monitoring from Sydney & Brisbane.", "AWS Multi-AZ Aurora and redundant application containers.", "Production Go-Live"),
            ("NFR-SEC-01", "Payment Data Security", "PCI-DSS Level 1 compliance; credit cards tokenized via Stripe/Tyro with zero raw PAN stored.", "Third-party PCI compliance attestation.", "Client-side payment tokenization and encrypted card tokens.", "Sprint 7")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Discovery, Room Matrix & Architecture Setup", "Week 1", "3 Weeks", "Property room inventory audit, rate plan mapping, Salto & POS technical discovery, AWS setup.", "Architecture Blueprint, Rate Configuration Matrix", "Milestone 1 Sign-off"),
            ("Phase 2", "Core PMS Engine, Channel Manager & Xero Sync", "Week 4", "8 Weeks", "Develop visual tape chart, reservation state machine, two-way OTA channel sync, Xero journals.", "PMS Core Staging Release, Channel Sync Demo", "Milestone 2 Sign-off"),
            ("Phase 3", "Integrations (Salto, POS) & Wave 1 Byron Bay Pilot", "Week 12", "6 Weeks", "Salto key encoder integration, Lightspeed POS interface, Wave 1 Byron Bay go-live and training.", "Byron Bay Pilot Go-Live Certificate, Salto Connector", "Milestone 3 Sign-off"),
            ("Phase 4", "Wave 2 (Gold Coast) & Wave 3 (Sydney CBD) Rollout", "Week 18", "5 Weeks", "Data migration and go-live for Gold Coast (restaurant POS active) and Sydney CBD properties.", "Wave 2 & Wave 3 Go-Live Acceptance Certificates", "Milestone 4 Sign-off"),
            ("Phase 5", "Group Dashboard Handover & 90-Day Hypercare", "Week 23", "4 Weeks", "Executive reporting dashboard sign-off, final staff training, 24/7 on-call operational hypercare.", "Final Handover Sign-off, Hypercare Acceptance", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Discovery, Architecture & Configuration", 38, 634.21, 24100.00, "Hospitality SA (10d), PM (8d), Tech Lead (10d), UI/UX (10d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Core PMS, Tape Chart & Channel Sync", 120, 520.00, 62400.00, "Backend (55d), Frontend (30d), Tech Lead (15d), QA (20d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: Integrations (Salto, POS) & Wave 1 Pilot", 90, 510.00, 45900.00, "Backend (30d), Frontend (25d), QA (20d), PM (15d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: Wave 2 (Gold Coast) & Wave 3 (Sydney) Rollout", 45, 480.00, 21600.00, "PM (15d), Tech Lead (10d), Backend (10d), QA (10d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Executive Reporting & Hypercare Support", 27, 459.26, 12400.00, "PM (10d), Tech Lead (7d), Backend (5d), Frontend (5d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Discovery Architecture Sign-off", 0.20, 36608.00, "Nov 09, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Core PMS & Channel Manager Staging Verification", 0.25, 45760.00, "Jan 04, 2027 (End Sprint 4)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Wave 1 Byron Bay Pilot Go-Live & Salto Key Sign-off", 0.30, 54912.00, "Feb 15, 2027 (Wave 1 Go-Live)", "Due within 14 days of gate approval"),
            ("Milestone 4", "Wave 2 (Gold Coast) & Wave 3 (Sydney) Go-Live", 0.15, 27456.00, "Mar 22, 2027 (Wave 3 Go-Live)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Final Handover & 90-Day Hypercare Sign-off", 0.10, 18304.00, "Apr 19, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data


# =====================================================================
# SCENARIO 05: LOGISTICS FLEET TELEMATICS & ROUTE OPTIMIZATION
# =====================================================================
def get_scenario_05():
    rfp_meta = {
        "title": "B2B FREIGHT TELEMATICS & ROUTE OPTIMIZATION PLATFORM – REQUEST FOR PROPOSAL",
        "client": "TransOcean Freight & Logistics Ltd",
        "date": "22 October 2026",
        "contact": "Marcus Brody – VP of Fleet Operations (marcus.brody@transoceanfreight.example | +61 7 3000 5678)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Company", "TransOcean Freight & Logistics Ltd"),
            ("What we do", "We are a national long-haul and interstate road freight carrier operating across Australia, moving heavy industrial freight and refrigerated consumer goods."),
            ("Our fleet scale", "- 350 heavy prime mover trucks (B-doubles and semi-trailers).\n- 480 commercial truck drivers operating 24/7 across 5 regional depots (Brisbane, Sydney, Melbourne, Adelaide, Perth).\n- Moving over 12,000 pallets and 450 freight consignments every day."),
            ("Contact & Stakeholders", "Marcus Brody – VP of Fleet Operations\nDarren Vance – Chief Information Officer\nRachel Adams – Dispatch Operations Manager")
        ]},
        {"section": "Where we are at the moment (Our current setup)", "items": [
            ("Current setup", "Our dispatchers use Excel spreadsheets on 4 desktop monitors, alongside constant two-way telephone calls and WhatsApp groups with drivers. Vehicles have Geotab telematics hardware installed for basic GPS and speed logs, but the telematics data sits in an isolated web portal completely disconnected from our dispatchers and ERP."),
            ("What isn't working for us (Our biggest headaches)", "- Crushing deadhead empty miles: 28% of our return trips are 'empty miles' with empty trailers because dispatchers cannot match return freight loads quickly enough with spot market loads, burning $1.8M annually in wasted diesel.\n- Delayed proof-of-delivery (POD) invoicing: Drivers keep paper proof-of-delivery consignment notes on clipboards in their truck cabs. It takes 4 to 6 business days for physical papers to reach head office so accounting can type them into SAP. Our Days Sales Outstanding (DSO) is terrible.\n- Driver fatigue & compliance risk: Dispatchers accidentally allocate jobs to drivers who are close to their 12-hour National Heavy Vehicle Regulator (NHVR) fatigue driving limit, risking massive fines.\n- Manual customer status calls: Our customer service team receives over 350 calls a day from freight clients asking 'Where is my truck?'. Dispatchers have to call the driver on the highway to ask their location.")
        ]},
        {"section": "What we're looking for", "items": [
            ("In short", "A centralized, cloud-based Transport Management & Dynamic Fleet Optimization Platform (TMS). It must ingest live Geotab GPS telematics every 5 seconds, provide AI-powered route and backhaul load matching to kill empty miles, give drivers a rugged mobile app for camera OCR proof-of-delivery, and automate SAP invoice dispatch."),
            ("Key things we need it to do", "- Live Fleet Telematics Wallboard: Real-time map displaying 350 trucks, live speed, engine diagnostics, geofence triggers, and driver fatigue clock.\n- Dynamic Backhaul Load Matching: Smart algorithm matching empty return trailers with available spot freight loads along the corridor, slashing empty miles from 28% to < 12%.\n- Driver Mobile App (iOS & Android): Turn-by-turn commercial truck routing, electronic pre-trip vehicle checklist, and instant Camera OCR Proof-of-Delivery (POD) scanning.\n- Instant Order-to-Cash Automation: When a driver scans the signed POD consignment at delivery, the system instantly uploads the verified document and triggers invoice creation in SAP in under 2 minutes.\n- Automated EDI Customer Tracking: Ingest EDI 204 load tenders and dispatch real-time EDI 214 GPS shipment milestone updates to major enterprise retail clients (Woolworths, Coles, Wesfarmers).")
        ]},
        {"section": "Things we'd need it to connect to", "items": [
            ("Integrations", "- Geotab Telematics streaming API (GPS, OBD-II telemetry, engine diagnostics)\n- SAP S/4HANA (IDoc / RFC / OData for billing and transport orders)\n- National Heavy Vehicle Regulator (NHVR) Electronic Work Diary (EWD) API\n- Google Maps Distance Matrix & HERE Truck Routing API (height/weight road restrictions)\n- B2B EDI 204 / 214 / 210 freight messaging gateways")
        ]},
        {"section": "Timeline and budget", "items": [
            ("Expectations", "- Timeline: 20 to 22 weeks. 90-day pilot on 50 trucks in Sydney-Melbourne corridor, then full fleet rollout.\n- Budget: Approved capital budget of AUD $190,000 to $240,000 (ex GST).\n- Requirements: System must support offline caching in rural cellular dead zones (Nullarbor, Outback corridors).")
        ]}
    ]

    p_data = {
        "title": "PROPOSAL: ENTERPRISE FLEET TELEMATICS & DYNAMIC TMS PLATFORM",
        "client": "TransOcean Freight & Logistics Ltd",
        "proposal_id": "PRP-2026-TRN-05",
        "date": "24 October 2026",
        "duration_weeks": 22,
        "total_mandays": 350,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "TransOcean Freight & Logistics Ltd", "Presale Solution Lead", "Garrett Stone (Principal Supply Chain Architect)"),
                ("Project Code", "PBL6-TRN-TMS-2026", "Delivery Manager", "Nathaniel Cross (Senior Logistics Delivery Lead)"),
                ("Proposal Version", "v1.0 (Full Technical & Commercial)", "Target Kick-off", "16 November 2026"),
                ("Primary Objective", "Deploy Live Geotab Telematics Hub, AI Backhaul Optimizer & Driver Mobile App across 350 Trucks", "Total Delivery Duration", "22 Calendar Weeks (11 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "TransOcean suffers from 28% deadhead empty miles ($1.8M fuel loss), 5-day DSO invoice latency from paper bills of lading, compliance risks from manual fatigue tracking, and high customer tracking call overhead.", "", ""),
                ("Proposed Strategic Solution", "We propose 'FleetSync Cloud TMS': An event-driven freight platform featuring sub-5-second Geotab telematics streaming, AI-powered backhaul load matching, native driver mobile app with offline OCR POD scanning, and automated SAP invoicing.", "", ""),
                ("Measurable Business Impact", "• Deadhead empty miles reduced from 28% down to under 12%, saving an estimated $1.1M in annual fuel.\n• Order-to-cash DSO accelerated from 5 business days down to < 2 minutes via automated mobile POD.\n• Customer status inquiry phone calls reduced by 85% via automated EDI 214 and tracking portal.\n• 100% compliance with NHVR driver fatigue regulations through automated EWD telematics sync.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$182,500 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$18,250", "Payment Term Milestone Structure", "5 Deliverable-Based Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$200,750 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $4,600/month (99.95% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("Supply Chain Solution Architect", "Vendor", "Part-Time (35%)", "Event streaming architecture, Geotab telemetry pipeline, SAP IDoc connector design", "TMS Architecture Blueprint, Telemetry Interface Spec", "Principal"),
            ("Project Manager", "Vendor", "Full-Time (100%)", "Sprint orchestration, depot rollout coordination, driver change management planning", "Project Burndown, Depot Rollout Plan, Status Reports", "Senior"),
            ("Technical Lead", "Vendor", "Full-Time (100%)", "Kafka streaming engine, route optimization algorithms, driver app offline sync", "Core Architecture, CI/CD, Routing Microservice", "Lead"),
            ("Senior Backend Engineers (2)", "Vendor", "Full-Time (200%)", "Geotab streaming ingest, backhaul load matching engine, SAP billing connector, EDI 204/214", "REST/gRPC APIs, Kafka Ingestion Workers, SAP Connector", "Senior"),
            ("Senior Mobile Engineers (2)", "Vendor", "Full-Time (200%)", "Flutter cross-platform driver app, camera OCR POD scanning, offline SQLite cache", "Driver Android & iOS Apps, Offline Sync Engine", "Senior"),
            ("QA / Logistics Test Lead", "Vendor", "Full-Time (100%)", "Route algorithm validation, offline sync stress testing, SAP end-to-end invoice audits", "Automated Test Suite, Field Pilot Test Report", "Senior"),
            ("UI/UX Product Designer", "Vendor", "Phase 1 & 2 (50%)", "Dispatcher multi-monitor map UI, rugged high-contrast driver mobile ergonomics", "Figma Design System, Interactive Prototypes", "Senior"),
            ("DevOps & Cloud Engineer", "Vendor", "Part-Time (40%)", "AWS Kafka (MSK), EKS auto-scaling, Prometheus telemetry monitoring", "Terraform Scripts, Telematics Cloud Infrastructure", "Senior"),
            ("Product Owner (PO)", "Client", "Key Stakeholder (40%)", "Dispatch rule specification, carrier SLA criteria, pilot fleet oversight", "TMS Rulebook, Pilot Acceptance Sign-off", "Executive"),
            ("Enterprise SAP IT Lead", "Client", "Key Partner (25%)", "SAP IDoc / RFC interfaces, firewall setup, sandbox credentials", "SAP Interface Configurations, Credentials", "Lead")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Driver cellular dead zones across regional outback routes causing app data stalls.", "High", "High", "Enforce robust local SQLite offline storage with automated background queue sync upon signal restore.", "Mobile Lead"),
            ("RSK-02", "Risk", "High telemetry ingestion volume (350 trucks streaming every 5s = 70 events/sec) overwhelming DB.", "Medium", "Medium", "Deploy Kafka stream buffering and timescale time-series database partitioning.", "Tech Lead"),
            ("ASM-01", "Assumption", "Geotab telematics hardware installed and firmware updated across all 350 trucks.", "High", "N/A", "Client fleet team confirmed Geotab hardware installed across 100% of fleet.", "Client PM"),
            ("DEP-01", "Dependency", "SAP S/4HANA IDoc / RFC sandbox connection provisioned by Sprint 2.", "High", "Open", "Client SAP team scheduled connector provisioning for Nov 24.", "Client IT")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-TEL-01", "Telematics Hub", "Live Geotab GPS Streaming", "System shall ingest vehicle GPS, speed, and odometer every 5s via Kafka and update live dispatcher map.", "Must-Have", "High", "Sprint 1"),
            ("FR-TEL-02", "Telematics Hub", "Automated Geofence Triggers", "System shall detect vehicle arrival and departure at depots/customer sites, auto-updating trip status.", "Must-Have", "Medium", "Sprint 2"),
            ("FR-OPT-01", "Route Optimizer", "AI Backhaul Load Matching", "System shall analyze empty return corridors and recommend high-margin spot freight loads.", "Must-Have", "High", "Sprint 3"),
            ("FR-OPT-02", "Route Optimizer", "Commercial Truck Turn-by-Turn", "System shall calculate truck routes accounting for B-double bridge weight, tunnel hazmat, and height limits.", "Must-Have", "High", "Sprint 4"),
            ("FR-MOB-01", "Driver Mobile App", "Camera OCR Proof-of-Delivery (POD)", "Driver shall take photo of signed paper manifest; system extracts consignment ID and signature via OCR.", "Must-Have", "High", "Sprint 5"),
            ("FR-MOB-02", "Driver Mobile App", "Offline Queue Synchronization", "Driver app shall store all trip logs, checklist forms, and POD scans in offline SQLite during dead zones.", "Must-Have", "High", "Sprint 5"),
            ("FR-SAP-01", "ERP Integration", "Instant SAP Billing Dispatch", "Upon verified POD upload, system shall trigger SAP billing IDoc in <2 minutes, auto-generating invoice.", "Must-Have", "High", "Sprint 6"),
            ("FR-EDI-01", "Customer EDI", "Automated EDI 214 Milestone Dispatch", "System shall transmit EDI 214 shipment tracking updates to enterprise shipper systems at every key milestone.", "Must-Have", "Medium", "Sprint 7"),
            ("FR-FAT-01", "Safety & Compliance", "NHVR Driver Fatigue Counter", "System shall monitor driver rest breaks and trigger audible alerts when driver approaches 12-hour limit.", "Must-Have", "Medium", "Sprint 8")
        ],
        "tech_data": [
            ("Dispatcher Web Portal", "Next.js 15 (React 19, TypeScript)", "15.0+", "Multi-monitor map rendering using Mapbox GL, real-time WebSockets vehicle telemetry.", "Open Source / AWS", "Multi-AZ CloudFront"),
            ("Driver Mobile App", "Flutter 3.x (Dart)", "3.24+", "Single cross-platform app with ML Kit Camera OCR, local SQLite caching, offline sync engine.", "Open Source / Native", "Local Encrypted SQLite"),
            ("Event Ingestion Engine", "Apache Kafka (AWS MSK)", "3.7+", "High-throughput event streaming ingesting 70+ telematics events/sec with zero packet loss.", "AWS Managed Kafka", "3-AZ Cluster"),
            ("Core Backend Services", "Go (Golang) & NestJS", "1.23+ / 10+", "Go for high-speed telematics processing; NestJS for dispatch business logic and SAP connectors.", "Open Source / AWS EKS", "Auto-scaling Pods (3-12)"),
            ("Time-Series & Primary DB", "PostgreSQL Aurora & TimescaleDB", "16.x", "PostgreSQL for orders and dispatch; TimescaleDB hypertable partitioning for GPS telemetry logs.", "AWS Aurora / Timescale", "Multi-AZ Auto-Failover"),
            ("Cloud Infrastructure", "AWS Sydney (ap-southeast-2)", "N/A", "Low-latency AWS Australia region, VPC peering, KMS encryption.", "AWS Cloud Enterprise", "Multi-AZ (3 Zones)")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "GPS Ingestion Latency", "Telematics data point ingested, geofence verified, and rendered on dispatcher map in < 1.5s.", "k6 automated streaming load benchmark simulating 500 trucks.", "Kafka distributed topic partitioning and WebSockets.", "Sprint 9"),
            ("NFR-PERF-02", "Mobile POD Upload Speed", "Compressed POD image and OCR metadata synchronized within 3 seconds of cellular reconnect.", "Network throttling simulation drill (2G/3G network conditions).", "Client-side image compression (WEBP) before queue transmission.", "Sprint 8"),
            ("NFR-AVAIL-01", "System Availability", "99.95% system uptime (< 21.6 minutes unscheduled downtime/month).", "Continuous synthetic health monitoring of Kafka brokers and APIs.", "Multi-AZ EKS cluster, multi-broker Kafka, Aurora failover.", "Production Go-Live"),
            ("NFR-SEC-01", "Data Security", "AES-256 encryption at rest; TLS 1.3 in transit; driver location data restricted via strict RBAC.", "Cybersecurity audit scan and penetration test.", "AWS KMS managed customer master keys and IAM roles.", "Sprint 10")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Telematics Architecture & Dispatch UX", "Week 1", "3 Weeks", "Geotab API data stream discovery, SAP IDoc mapping, dispatcher Mapbox prototype, AWS setup.", "Architecture Blueprint, Interactive Figma Prototypes", "Milestone 1 Sign-off"),
            ("Phase 2", "Telematics Streaming Hub & Dispatch Engine", "Week 4", "7 Weeks", "Develop Kafka telemetry ingest, live map wallboard, geofence engine, backhaul load matcher.", "Telematics Hub in Staging, Geofence Demo", "Milestone 2 Sign-off"),
            ("Phase 3", "Driver Mobile App, OCR POD & SAP Connector", "Week 11", "6 Weeks", "Develop Flutter driver app, offline SQLite sync, camera OCR POD capture, SAP billing connector.", "Driver App Builds, Automated SAP Invoicing Demo", "Milestone 3 Sign-off"),
            ("Phase 4", "Pilot Corridor Launch (50 Trucks) & Pentest", "Week 17", "3 Weeks", "Deploy to 50 pilot trucks in Sydney-Melbourne corridor, field testing, security pentest.", "Pilot Corridor Acceptance Certificate, Pentest Report", "Milestone 4 Sign-off"),
            ("Phase 5", "Full Fleet Rollout (350 Trucks) & 90-Day Hypercare", "Week 20", "3 Weeks", "Depot rollout across Brisbane, Melbourne, Adelaide, Perth, driver training, 24/7 hypercare.", "Full Fleet Acceptance Certificate, Final Handover", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Inception & UI Design", 40, 645.00, 25800.00, "Supply Chain SA (12d), PM (8d), Tech Lead (10d), UI/UX (10d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Telematics Streaming Hub & Backhaul Engine", 125, 526.40, 65800.00, "Backend (55d), Tech Lead (25d), PM (15d), QA (20d), DevOps (10d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: Driver Mobile App, OCR POD & SAP Connector", 105, 508.57, 53400.00, "Mobile (45d), Backend (25d), QA (20d), PM (15d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: 50-Truck Pilot, Security Pentest & UAT", 48, 487.50, 23400.00, "QA Lead (20d), SA (8d), PM (10d), DevOps (10d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Fleet Rollout, Driver Training & Hypercare", 32, 440.63, 14100.00, "Tech Lead (10d), PM (10d), Mobile (6d), Backend (6d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Architecture Sign-off", 0.20, 40150.00, "Nov 16, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Telematics Hub & Live Map Staging Verification", 0.25, 50187.50, "Jan 04, 2027 (End Sprint 4)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Driver App & Automated SAP Invoicing Demo", 0.30, 60225.00, "Feb 15, 2027 (End Sprint 7)", "Due within 14 days of gate approval"),
            ("Milestone 4", "50-Truck Pilot Go-Live & Security Clearance", 0.15, 30112.50, "Mar 22, 2027 (End Sprint 9)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Full Fleet Rollout & 90-Day Hypercare Sign-off", 0.10, 20075.00, "Apr 12, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data

