"""
Full Generator for All 10 Enterprise Leads and 10 Full Proposals
Scenarios 1 to 10 across diverse industries:
1. Retail Omnichannel OMS & WMS (NovaRetail)
2. FinTech Digital Banking & Micro-Lending (ApexCredit)
3. HealthTech Hospital Information System & EHR (MediCare)
4. Hospitality Boutique Hotel Chain PMS (Coastal Stay Hotels)
5. Logistics Fleet Telematics & Route Optimization (TransOcean)
6. EdTech Interactive LMS & AI Proctoring (EduVantage)
7. PropTech Commercial Real Estate & Smart Tenant Portal (Horizon Towers)
8. On-Demand Multi-Vendor Grocery Delivery Super-App (QuickDrop)
9. Enterprise Cloud HRM, Payroll & OKRs (TalentoHR)
10. Industrial IoT Predictive Maintenance & Energy Telemetry (PrecisionSteel)
"""

import os
import sys

from generate_all_10_leads_and_proposals import (
    build_lead_workbook,
    build_proposal_workbook
)
from proposals_data_definitions import (
    DEFAULT_RATE_CARD,
    DEFAULT_PM_SECTIONS,
    DEFAULT_DOD_ITEMS,
    DEFAULT_SLA_DATA
)

OUTPUT_DIR = "output/sample_leads_proposals"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# We will define a function for each scenario that returns (rfp_meta, rfp_sections, proposal_data)
# and generates the pair.

def get_scenario_01():
    # Scenario 1: Retail Omnichannel
    rfp_meta = {
        "title": "OMNICHANNEL INVENTORY & ORDER MANAGEMENT SYSTEM – REQUEST FOR PROPOSAL",
        "client": "NovaRetail Holdings Pty Ltd",
        "date": "05 October 2026",
        "contact": "Marcus Vance – VP of Digital & Omnichannel Operations (marcus.vance@novaretail.example | +61 2 9000 1234)"
    }
    rfp_sections = [
        {"section": "About us", "items": [
            ("Company", "NovaRetail Holdings Pty Ltd (trading as NovaRetail Group)"),
            ("What we do", "We are a fashion and lifestyle apparel retailer with physical retail stores and an online brand."),
            ("Our footprint", "- 120 physical retail stores across Australia, New Zealand, and Singapore (75 in Australia, 25 in NZ, 20 in SG)\n- 3 central distribution warehouses (Sydney, Melbourne, and Singapore)\n- Flagship online store on Shopify Plus (averages ~8,000 orders/day, up to 35,000 on peak sale days)"),
            ("Contact", "Marcus Vance – VP of Digital & Omnichannel Operations\nmarcus.vance@novaretail.example  |  +61 2 9000 1234\nElena Rostova – Chief Operating Officer (Project Sponsor)")
        ]},
        {"section": "Where we are at the moment (Our current setup)", "items": [
            ("Current setup", "Our online store runs on Shopify Plus, while all 120 physical stores run an on-premise retail POS system that was put in back in 2017. Finance and master purchasing are in SAP S/4HANA. The physical stores only sync their inventory and sales up to head office twice a day: once around 1:00 PM and once after doors close at 10:00 PM. In the warehouses, our pickers still print out paper order sheets to walk the aisles."),
            ("What isn't working for us (Our biggest headaches)", "- Overselling and cancellations: Because our stores only upload stock twice a day, customers often buy items online that were already purchased off the rack in a store an hour earlier. During last Click Frenzy, we had to cancel 420 orders and pay out over $85,000 in apology vouchers to furious shoppers.\n- Expensive and slow shipping: Right now, every single online order gets routed to our central warehouses in Sydney or Melbourne, even when a customer lives 10 minutes away from our Bondi or Chadstone store that has 5 units of the exact dress sitting on the shelf. This costs us around $14 per parcel in shipping and takes 3 to 4 days.\n- Warehouse picking errors: In our distribution centers, pickers spend half their shift walking back and forth with paper lists. They manually check items off with pens, and about 2.8% of parcels end up being shipped with the wrong size or wrong color.\n- Messy Click & Collect: When a customer orders for store pickup, our store staff simply get an email. When the customer shows up, staff have to hunt through unorganized boxes in the back room while the customer waits 20 minutes at the counter.\n- Manual courier label printing: At our warehouse packing benches, staff have to log into Australia Post eParcel and DHL web portals separately and copy-paste addresses to print labels, creating huge bottlenecks.")
        ]},
        {"section": "What we're looking for", "items": [
            ("In short", "We need a modern, cloud-based Omnichannel Order Management (OMS) and lightweight Warehouse Management (WMS) system that ties Shopify Plus, our store POS systems, and our warehouses together in real time. We want to stop overselling, start shipping orders from our physical stores when it makes sense, and replace paper picking with mobile barcode scanners."),
            ("Key things we need it to do", "- Real-time inventory sync: Sub-second stock ledger across Shopify, all 120 stores, and our 3 warehouses so our website always reflects true available stock without overselling.\n- Smart order routing: An engine that automatically decides whether to fulfill an order from the central warehouse, ship it from the nearest retail store, or route it for store pickup based on customer distance and available stock.\n- Digital handheld picking for warehouses: A mobile scanning app for our warehouse pickers using our Zebra TC52 Android scanners, verifying barcodes on each scan so we eliminate mis-picks.\n- Store associate app for Click & Collect: A clean app on store tablets/phones so retail associates can quickly prepare Click & Collect orders and hand them to customers in under a minute.\n- Automated courier booking: Instant shipping label printing for Australia Post and DHL directly at the packing bench.")
        ]},
        {"section": "Things we'd need it to connect to", "items": [
            ("Integrations", "- Shopify Plus (our e-commerce platform)\n- Our on-premise store POS system\n- SAP S/4HANA (financials, master procurement, and general ledger)\n- Australia Post eParcel and DHL Express (courier APIs for rating and label printing)\n- Zebra TC52 Android handheld barcode scanners")
        ]},
        {"section": "Timeline and budget", "items": [
            ("Expectations", "- Timeline: We want Phase 1 live and tested before our next major trading season (ideally within 18 to 24 weeks).\n- Budget: Our approved capital budget for software development and implementation services is roughly AUD $180,000 to $230,000 (ex GST).\n- Proposal request: Please provide an end-to-end proposal outlining your recommended approach, team structure, technical architecture, timeline, and a detailed commercial quote with milestones.")
        ]}
    ]

    p_data = {
        "title": "PROPOSAL: ENTERPRISE OMNICHANNEL COMMERCE & FULFILLMENT PLATFORM",
        "client": "NovaRetail Holdings Pty Ltd",
        "proposal_id": "PRP-2026-NOV-01",
        "date": "08 October 2026",
        "duration_weeks": 24,
        "total_mandays": 381,
        "overview_sections": [
            ("PROJECT METADATA", [
                ("Client Name", "NovaRetail Holdings Pty Ltd", "Presale Solution Lead", "Alexandre Martin (Principal Solutions Architect)"),
                ("Project Code", "PBL6-NOVA-OMS-2026", "Delivery Manager", "Sarah Jenkins (Senior Agile Delivery Lead)"),
                ("Proposal Version", "v1.0 (Commercial & Technical Bid)", "Target Kick-off", "02 November 2026"),
                ("Primary Objective", "Deploy Cloud OMS, Real-Time Inventory, and WMS Lite across 120 Stores & 3 Warehouses", "Total Delivery Duration", "24 Calendar Weeks (12 Sprints)")
            ]),
            ("EXECUTIVE SUMMARY & 'WHY THIS SOLUTION'", [
                ("Executive Problem Context", "NovaRetail faces severe revenue leakage due to 4-12 hour inventory sync lags between Shopify Plus, physical store POS systems, and regional warehouses. Inefficient order routing inflates fulfillment costs to $14/order and causes 2.8% fulfillment mis-picks with paper manifests.", "", ""),
                ("Proposed Strategic Solution", "We propose delivering a modern, cloud-native Omnichannel Fulfillment Suite ('NovaSync OMS & WMS'). The platform provides a sub-second distributed inventory ledger, intelligent rule-based order routing, mobile handheld PDA warehouse picking, express Click & Collect store workflows, and unified courier label dispatch.", "", ""),
                ("Measurable Business Impact", "• 99.8% reduction in cross-channel overselling & stockout cancellations.\n• 40% reduction in warehouse picking labor hours via digital batch routing.\n• $4.80 average logistics cost reduction per order via ship-from-nearest-store routing.\n• Click & Collect turnaround reduced from 25 minutes down to < 45 seconds at store checkout.", "", "")
            ]),
            ("COMMERCIAL & INVESTMENT SNAPSHOT (USD)", [
                ("Core Services Subtotal", "$198,500 ex GST", "Warranty & Support Period", "90 Calendar Days Hypercare Included"),
                ("Project Contingency Buffer (10%)", "$19,850", "Payment Term Milestone Structure", "5 Deliverable-Based Milestone Gates (20/25/30/15/10)"),
                ("Total Delivery Investment", "$218,350 ex GST", "Ongoing SLA Support (Tier 2/3)", "Optional AUD $4,800/month (99.9% Uptime SLA)")
            ])
        ],
        "roles_data": [
            ("Solution Architect (SA)", "Vendor", "Part-Time (35%)", "Technical architecture governance, system integration design, security compliance, ADR approval", "Architecture Blueprint, Integration Specs, Cloud Sizing", "Principal"),
            ("Project Manager (PM)", "Vendor", "Full-Time (100%)", "Agile sprint orchestration, budget & risk tracking, client communication, milestone sign-off", "Sprint Burndown, Weekly Status Reports, Risk Log", "Senior"),
            ("Technical Lead (TL)", "Vendor", "Full-Time (100%)", "Codebase stewardship, code review quality gate, tech mentoring, sprint backlog technical grooming", "Core Framework Setup, CI/CD Pipeline, DB Schema", "Lead"),
            ("Senior Backend Engineer (2)", "Vendor", "Full-Time (200%)", "Development of OMS routing microservices, real-time inventory locks, SAP & Shopify API connectors", "REST/GraphQL APIs, Kafka Consumers, Worker Jobs", "Senior"),
            ("Senior Frontend Engineer", "Vendor", "Full-Time (100%)", "Next.js 15 Web Portal for operations, store managers, and executive order monitoring dashboard", "Responsive Web Portal, Real-time WebSockets Dashboard", "Senior"),
            ("Senior Mobile / PDA Engineer", "Vendor", "Full-Time (100%)", "Flutter cross-platform app for warehouse Zebra handheld scanners and store associate Click & Collect", "Zebra PDA APK, Store iOS/Android Associate App", "Senior"),
            ("QA / Automation Lead", "Vendor", "Full-Time (100%)", "Test strategy, automated integration test suites, load testing, regression testing, UAT coordination", "Test Plan, Automated E2E Cypress/Postman Suites", "Senior"),
            ("UI/UX Product Designer", "Vendor", "Phase 1 & 2 (50%)", "User journey mapping, warehouse ergonomic UI design, store associate workflow design, design system", "Figma Interactive Prototypes, Design System Tokens", "Senior"),
            ("DevOps / Cloud Engineer", "Vendor", "Part-Time (40%)", "AWS infrastructure as code (Terraform), Kubernetes cluster orchestration, monitoring & telemetry", "Terraform Scripts, Datadog / Grafana Dashboards", "Senior"),
            ("Product Owner (PO)", "Client", "Key Stakeholder (40%)", "Business requirement clarification, prioritization of user stories, acceptance criteria sign-off", "Business Requirements Document (BRD), UAT Sign-off", "Executive"),
            ("Enterprise IT Lead", "Client", "Key Partner (25%)", "Provisioning SAP OData endpoints, firewall whitelist, AWS account IAM role delegation", "Enterprise API Credentials, Sandbox Environments", "Lead")
        ],
        "pm_sections": DEFAULT_PM_SECTIONS,
        "raid_data": [
            ("RSK-01", "Risk", "Shopify Plus GraphQL API rate limits exceeded during flash sales / peak traffic events.", "High", "Medium", "Implement Redis queue buffer with exponential backoff and batch inventory update mutations (max 250 items/call).", "Tech Lead"),
            ("RSK-02", "Risk", "Legacy POS batch synchronization latency creates phantom inventory reservations.", "High", "High", "Enforce safety stock buffer threshold (reserve 2 units) and webhook triggers from POS cash register terminals.", "Solution Architect"),
            ("RSK-03", "Risk", "Warehouse staff resist transition from paper picking manifests to Android Zebra PDAs.", "Medium", "High", "Conduct comprehensive on-site training sessions in Sydney DC; design high-contrast tactile barcode scanning UX.", "Retail Ops Lead"),
            ("RSK-04", "Risk", "Courier carrier API response latency (> 3s) stalls shipping label printing at packing stations.", "High", "Medium", "Pre-fetch courier labels asynchronously during picking phase; cache shipping manifests locally.", "Senior Backend"),
            ("ASM-01", "Assumption", "Client Product Owner will be available at least 15 hours/week for sprint ceremonies and prompt UAT sign-off.", "High", "N/A", "Agreed in Project Charter; PO backup appointed (Elena Rostova - COO).", "Client Sponsor"),
            ("ASM-02", "Assumption", "Test sandbox credentials for SAP S/4HANA OData services provided no later than Sprint 1 kickoff.", "High", "N/A", "Client IT team confirmed sandbox ready by Oct 28.", "Enterprise IT Lead"),
            ("ISS-01", "Issue", "Legacy POS hardware at 18 regional stores has outdated firmware not supporting TLS 1.3.", "Medium", "Active", "Client IT to perform automated overnight firmware update across store POS terminals before Sprint 6.", "Enterprise IT Lead"),
            ("DEP-01", "Dependency", "AWS Australia (ap-southeast-2) Production Cloud Account provisioning and enterprise billing activation.", "High", "Open", "DevOps engineer provided Terraform Cloud account requirements; client to sign AWS agreement by Sprint 0.", "DevOps Lead"),
            ("DEP-02", "Dependency", "AusPost eParcel and DHL Express commercial API production credentials and contract sign-off.", "High", "Open", "Client Logistics manager managing courier onboarding; mock sandbox services used in Sprints 2-4.", "Client Logistics Lead")
        ],
        "dod_items": DEFAULT_DOD_ITEMS,
        "sla_data": DEFAULT_SLA_DATA,
        "fr_data": [
            ("FR-OMS-01", "Core OMS Engine", "Order Ingestion Webhooks", "System shall ingest orders in real-time from Shopify Plus, TikTok Shop, and wholesale B2B via secure webhooks.", "Must-Have", "Medium", "Sprint 1"),
            ("FR-OMS-02", "Core OMS Engine", "Intelligent Order Routing", "System shall dynamically route orders to the closest fulfillment node (DC or local store) based on distance, stock depth, and carrier cost.", "Must-Have", "High", "Sprint 2"),
            ("FR-OMS-03", "Core OMS Engine", "Split-Shipment Optimization", "System shall automatically calculate optimal order splits when a single node cannot fulfill all line items, minimizing shipping legs.", "Should-Have", "High", "Sprint 3"),
            ("FR-INV-01", "Inventory Engine", "Distributed Stock Ledger", "System shall maintain an atomic distributed inventory ledger with sub-second balance updates across 120 stores and 3 DCs.", "Must-Have", "High", "Sprint 1"),
            ("FR-INV-02", "Inventory Engine", "Channel Reservation Locks", "System shall acquire Redis-backed temporary reservation locks (15 min lease) during online checkout to eliminate overselling.", "Must-Have", "High", "Sprint 2"),
            ("FR-INV-03", "Inventory Engine", "Safety Buffer Rules", "System shall allow setting configurable safety stock thresholds per SKU/category (e.g., reserve 2 units for walk-in store customers).", "Must-Have", "Medium", "Sprint 3"),
            ("FR-WMS-01", "WMS Lite (DC)", "Digital Wave Picking", "System shall group orders into optimized pick waves based on warehouse zone, aisle location, and shipping cut-off time.", "Must-Have", "High", "Sprint 5"),
            ("FR-WMS-02", "WMS Lite (DC)", "PDA Barcode Verification", "Warehouse pickers using Zebra PDAs shall scan bin barcode and SKU barcode with audible/tactile validation to prevent mis-picks.", "Must-Have", "Medium", "Sprint 5"),
            ("FR-STR-01", "Store Associate App", "Express Click & Collect (BOPIS)", "Store associate app shall notify staff of new pickup orders, guide item retrieval in store, and trigger customer ready SMS.", "Must-Have", "High", "Sprint 7"),
            ("FR-STR-02", "Store Associate App", "Fast Customer Pickup Handover", "Associate shall scan customer QR code at pickup counter to finalize handover and mark order collected within 15 seconds.", "Must-Have", "Medium", "Sprint 7"),
            ("FR-LOG-01", "Carrier Logistics Hub", "Multi-Carrier Rate Shopping", "System shall query AusPost, StarTrack, and DHL Express APIs in parallel to select the cheapest carrier meeting delivery SLA.", "Should-Have", "Medium", "Sprint 8"),
            ("FR-RPT-01", "Executive Analytics", "Live Fulfillment Operations Wallboard", "Executive web portal shall display live map of orders, regional stockout heatmaps, picking throughput, and courier SLA compliance.", "Must-Have", "Medium", "Sprint 9")
        ],
        "tech_data": [
            ("Frontend Web Portal", "Next.js 15 (React 19, TypeScript)", "15.0+", "SSR for fast initial loads, React Server Components for operations dashboard, Tailwind CSS.", "Open Source / AWS", "Multi-AZ CloudFront CDN"),
            ("Mobile & PDA Client", "Flutter 3.x (Dart)", "3.24+", "Single unified codebase compiling natively to Android (Zebra TC52 PDAs) and iOS devices.", "Open Source / Native", "Local SQLite offline cache"),
            ("Core Backend API", "NestJS (Node.js Enterprise)", "10.4+", "Modular TypeScript framework, dependency injection, high developer velocity, OpenAPI/Swagger.", "Open Source / AWS EKS", "Auto-scaling Pods (3-15)"),
            ("Inventory Lock Service", "Go (Golang Microservice)", "1.23+", "Ultra-low memory footprint, handling 10,000+ lock leases/sec with sub-5ms response time.", "Open Source / AWS EKS", "Horizontal Auto-scaler"),
            ("Primary Database", "PostgreSQL (AWS Aurora)", "16.x", "ACID transactional compliance, JSONB document support for manifests, read-replica scaling.", "AWS Managed Aurora", "Multi-AZ Auto-Failover"),
            ("Distributed Cache & Locks", "Redis Enterprise (AWS ElastiCache)", "7.2+", "In-memory caching, Redis distributed lock manager (Redlock algorithm) for stock reservation.", "AWS Managed ElastiCache", "Multi-AZ Cluster Mode"),
            ("Event Streaming", "Apache Kafka (AWS MSK)", "3.7+", "Decoupled asynchronous event pipeline for order events (OrderCreated, StockDeducted).", "AWS Managed Kafka", "Multi-AZ Topic Replication"),
            ("Cloud Infrastructure", "AWS Sydney (ap-southeast-2)", "N/A", "Complies with Australian Data Sovereignty; low latency (< 15ms) to stores in Sydney/Melbourne.", "AWS Cloud Enterprise", "Multi-AZ (3 Zones)")
        ],
        "nfr_data": [
            ("NFR-PERF-01", "API Response Latency", "P95 response time < 200ms; P99 response time < 500ms under standard operational load.", "Automated k6 load test simulating 1,500 req/sec.", "Redis caching, Aurora DB indexing, lightweight Go service.", "Sprint 11 (Load Test)"),
            ("NFR-PERF-02", "Throughput Scalability", "Support 500 peak transactions per second (TPS) during Flash Sale / Black Friday peaks.", "Distributed load test simulating 35,000 orders over 1 hour.", "AWS EKS Horizontal Pod Autoscaler (HPA) and SQS/Kafka.", "Sprint 11 (Load Test)"),
            ("NFR-AVAIL-01", "System Availability", "99.95% uptime availability (<= 21.6 minutes unscheduled downtime per calendar month).", "Datadog synthetic uptime monitoring from 5 global locations.", "Multi-AZ AWS deployment with active health-check auto-healing pods.", "Production Go-Live"),
            ("NFR-SEC-01", "Data Encryption", "AES-256 encryption at rest for all databases/backups; TLS 1.3 in transit with HSTS enforced.", "AWS Security Hub automated compliance audit scan.", "AWS KMS managed customer master keys (CMK) and SSL certificates.", "Sprint 10 (Security)"),
            ("NFR-DR-01", "Disaster Recovery (RPO)", "Recovery Point Objective (RPO) < 5 minutes; RTO < 30 minutes to restore full operations.", "Quarterly disaster recovery tabletop simulation drill.", "Aurora continuous incremental storage backup and S3 cross-region sync.", "Pre-Go-Live Drill")
        ],
        "rate_data": DEFAULT_RATE_CARD,
        "phases_data": [
            ("Phase 1", "Inception, Architecture & UX Design", "Week 1", "3 Weeks", "Discovery workshops, architecture blueprint, DB schema design, Zebra PDA UI prototypes, AWS environment setup.", "Solution Architecture Document, Interactive Figma Prototype", "Milestone 1 Sign-off"),
            ("Phase 2", "Core OMS & Inventory Ledger Engine", "Week 4", "8 Weeks", "Develop sub-second inventory engine, Shopify Plus webhooks, Redis reservation locks, SAP OData reconciliation.", "OMS Core Services in Staging, Automated API Test Suite", "Milestone 2 Sign-off"),
            ("Phase 3", "WMS Lite, Store App & Courier Hub", "Week 12", "7 Weeks", "Develop Zebra PDA scanner wave picking app, store Click & Collect associate app, carrier rating & label printer integration.", "Android PDA Build, Store Associate App, Courier Hub Connector", "Milestone 3 Sign-off"),
            ("Phase 4", "System Integration, UAT & Pentest", "Week 19", "3 Weeks", "End-to-end integration testing, business user UAT in simulated store/DC, k6 load testing, independent CREST security pentest.", "UAT Acceptance Certificate, Penetration Test Report", "Milestone 4 Sign-off"),
            ("Phase 5", "Production Pilot, Rollout & Hypercare", "Week 22", "3 Weeks", "Production deployment on AWS EKS, Pilot go-live across Sydney DC & 10 stores, staff training, 24/7 on-site hypercare.", "Production Handover Runbook, Final Acceptance Certificate", "Final Milestone 5 Gate")
        ],
        "wbs_data": [
            ("WBS-01", "Phase 1: Architecture, Inception & UI/UX Prototypes", 45, 633.33, 28500.00, "SA (12d), PM (8d), TL (10d), UI/UX (15d)", "Fixed Milestone"),
            ("WBS-02", "Phase 2: Core OMS, Inventory Ledger & SAP/Shopify Sync", 140, 520.00, 72800.00, "Backend (60d), Tech Lead (30d), PM (20d), QA (20d), DevOps (10d)", "Fixed Milestone"),
            ("WBS-03", "Phase 3: WMS Scanner App, Store BOPIS App & Logistics Hub", 110, 496.36, 54600.00, "Mobile (40d), Frontend (30d), Backend (20d), QA (20d)", "Fixed Milestone"),
            ("WBS-04", "Phase 4: End-to-End Testing, Security Pentest & UAT", 50, 492.00, 24600.00, "QA Lead (25d), PM (10d), SA (5d), Security/DevOps (10d)", "Fixed Milestone"),
            ("WBS-05", "Phase 5: Production Deployment, Pilot Rollout & Hypercare", 36, 500.00, 18000.00, "Tech Lead (12d), PM (12d), Mobile (6d), Backend (6d)", "Fixed Milestone")
        ],
        "payments_data": [
            ("Milestone 1", "Contract Execution & Inception Kick-off", 0.20, 43670.00, "Nov 02, 2026 (Kick-off)", "Due within 14 days of invoice"),
            ("Milestone 2", "Architecture Sign-off & Core OMS Staging Demo", 0.25, 54587.50, "Dec 21, 2026 (End Sprint 3)", "Due within 14 days of gate approval"),
            ("Milestone 3", "Feature Complete: WMS Scanner & Store App Release", 0.30, 65505.00, "Feb 22, 2027 (End Sprint 8)", "Due within 14 days of gate approval"),
            ("Milestone 4", "UAT Sign-off & Pilot Go-Live (Sydney DC + 10 Stores)", 0.15, 32752.50, "Mar 29, 2027 (End Sprint 10)", "Due within 14 days of gate approval"),
            ("Milestone 5", "Final Handover & 90-Day Hypercare Acceptance", 0.10, 21835.00, "Apr 19, 2027 (Final Gate)", "Due within 30 days of sign-off")
        ]
    }
    return rfp_meta, rfp_sections, p_data

