"""
Generate Complete Enterprise Lead and Proposal Excel Workbooks
Lead 01: NovaRetail - Omnichannel Order Management (OMS) & Smart Warehouse Fulfillment (WMS)
Proposal 01: Comprehensive 10-Sheet Enterprise Technical & Commercial Proposal
Sheets:
1. Overview
2. Project Roles
3. Project Management Approach
4. RAID
5. Acceptance Docs
6. FR
7. Tech-stack
8. Non-FR
9. RateCard
10. Macro Plan & Quotation
"""

import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Common Styling Constants
FONT_FAMILY = "Segoe UI"
COLOR_HEADER_BG = "0F172A"       # Slate 900
COLOR_HEADER_TEXT = "FFFFFF"     # White
COLOR_SECTION_BG = "1E3A8A"      # Blue 900
COLOR_SECTION_TEXT = "FFFFFF"    # White
COLOR_SUBSECTION_BG = "DBEAFE"   # Light Blue 100
COLOR_SUBSECTION_TEXT = "1E3A8A" # Dark Blue
COLOR_ZEBRA_BG = "F8FAFC"        # Slate 50
COLOR_ACCENT = "2563EB"          # Blue 600
COLOR_BORDER = "CBD5E1"          # Slate 300

font_title = Font(name=FONT_FAMILY, size=15, bold=True, color="0F172A")
font_subtitle = Font(name=FONT_FAMILY, size=10, italic=True, color="475569")
font_section = Font(name=FONT_FAMILY, size=11, bold=True, color=COLOR_SECTION_TEXT)
font_tbl_header = Font(name=FONT_FAMILY, size=10, bold=True, color=COLOR_HEADER_TEXT)
font_cell = Font(name=FONT_FAMILY, size=9.5, color="1E293B")
font_cell_bold = Font(name=FONT_FAMILY, size=9.5, bold=True, color="1E293B")
font_meta_key = Font(name=FONT_FAMILY, size=9.5, bold=True, color="334155")
font_meta_val = Font(name=FONT_FAMILY, size=9.5, color="0F172A")

fill_header = PatternFill(start_color=COLOR_HEADER_BG, end_color=COLOR_HEADER_BG, fill_type="solid")
fill_section = PatternFill(start_color=COLOR_SECTION_BG, end_color=COLOR_SECTION_BG, fill_type="solid")
fill_sub = PatternFill(start_color=COLOR_SUBSECTION_BG, end_color=COLOR_SUBSECTION_BG, fill_type="solid")
fill_zebra = PatternFill(start_color=COLOR_ZEBRA_BG, end_color=COLOR_ZEBRA_BG, fill_type="solid")
fill_white = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

thin_border = Border(
    left=Side(style='thin', color=COLOR_BORDER),
    right=Side(style='thin', color=COLOR_BORDER),
    top=Side(style='thin', color=COLOR_BORDER),
    bottom=Side(style='thin', color=COLOR_BORDER)
)

header_border = Border(
    left=Side(style='thin', color="334155"),
    right=Side(style='thin', color="334155"),
    top=Side(style='medium', color="0F172A"),
    bottom=Side(style='medium', color="0F172A")
)

def style_row(ws, row_idx, font=font_cell, fill=fill_white, border=thin_border, alignment=None):
    for col_idx in range(1, ws.max_column + 1):
        cell = ws.cell(row=row_idx, column=col_idx)
        cell.font = font
        if fill:
            cell.fill = fill
        if border:
            cell.border = border
        if alignment:
            cell.alignment = alignment

def auto_fit_columns(ws, min_widths=None):
    ws.views.sheetView[0].showGridLines = True
    min_widths = min_widths or {}
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            val = cell.value
            if val is not None:
                lines = str(val).split("\n")
                line_max = max(len(l) for l in lines)
                if line_max > max_len:
                    max_len = line_max
        fitted = max(max_len + 3, min_widths.get(col_letter, 10))
        ws.column_dimensions[col_letter].width = min(fitted, 75)


# ==========================================
# 1. BUILD LEAD 01 EXCEL WORKBOOK (AUTHENTIC CLIENT RFP)
# ==========================================
def build_lead_01(file_path: str):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Request"

    # Header Title
    ws["A1"] = "OMNICHANNEL INVENTORY & ORDER MANAGEMENT SYSTEM – REQUEST FOR PROPOSAL"
    ws["A1"].font = font_title
    ws.row_dimensions[1].height = 28

    ws["A2"] = "From: NovaRetail Holdings Pty Ltd     |     Date sent: 5 October 2026     |     Contact: Marcus Vance"
    ws["A2"].font = font_subtitle
    ws.row_dimensions[2].height = 20

    rfp_rows = [
        # (RowType, ColA, ColB, Height)
        ("SEC", "About us", "", 24),
        ("ROW", "Company", "NovaRetail Holdings Pty Ltd (trading as NovaRetail Group)", 22),
        ("ROW", "What we do", "We are a fashion and lifestyle apparel retailer with both physical retail stores and a fast-growing digital direct-to-consumer presence.", 24),
        ("ROW", "Our footprint", "- 120 physical retail stores across Australia, New Zealand, and Singapore (75 in Australia, 25 in NZ, 20 in SG)\n- 3 central distribution warehouses (Sydney, Melbourne, and Singapore)\n- Flagship online store on Shopify Plus (we average around 8,000 orders a day, peaking up to 35,000 orders a day during peak sale periods like Black Friday)", 55),
        ("ROW", "Contact", "Marcus Vance – VP of Digital & Omnichannel Operations\nmarcus.vance@novaretail.example  |  +61 2 9000 1234\nElena Rostova – Chief Operating Officer (Project Sponsor)", 45),

        ("SEC", "Where we are at the moment (Our current setup)", "", 24),
        ("ROW", "Current setup", "Our online store runs on Shopify Plus, while all 120 physical stores run an on-premise retail POS system that was put in back in 2017. Finance and master purchasing are in SAP S/4HANA. The physical stores only sync their inventory and sales up to head office twice a day: once around 1:00 PM and once after doors close at 10:00 PM. In the warehouses, our pickers still print out paper order sheets to walk the aisles.", 65),
        ("ROW", "What isn't working for us (Our biggest headaches)", "- Overselling and cancellations: Because our stores only upload stock twice a day, customers often buy items online that were already purchased off the rack in a store an hour earlier. During last year's Click Frenzy, we had to cancel 420 orders and pay out over $85,000 in apology vouchers to furious shoppers.\n- Expensive and slow shipping: Right now, every single online order gets routed to our central warehouses in Sydney or Melbourne, even when a customer lives 10 minutes away from our Bondi or Chadstone store that has 5 units of the exact dress sitting on the shelf. This costs us around $14 per parcel in shipping and takes 3 to 4 days.\n- Warehouse picking errors: In our distribution centers, pickers spend half their shift walking back and forth with paper lists. They manually check items off with pens, and about 2.8% of parcels end up being shipped with the wrong size or wrong color.\n- Messy Click & Collect: When a customer orders for store pickup, our store staff simply get an email. When the customer shows up, staff have to hunt through unorganized boxes in the back room while the customer waits 20 minutes at the counter.\n- Manual courier label printing: At our warehouse packing benches, staff have to log into Australia Post eParcel and DHL web portals separately and copy-paste addresses to print labels, creating huge bottlenecks.", 155),

        ("SEC", "What we're looking for", "", 24),
        ("ROW", "In short", "We need a modern, cloud-based Omnichannel Order Management (OMS) and lightweight Warehouse Management (WMS) system that ties Shopify Plus, our store POS systems, and our warehouses together in real time. We want to stop overselling, start shipping orders from our physical stores when it makes sense, and replace paper picking with mobile barcode scanners.", 55),
        ("ROW", "Key things we need it to do", "- Real-time inventory sync: Sub-second stock ledger across Shopify, all 120 stores, and our 3 warehouses so our website always reflects true available stock without overselling.\n- Smart order routing: An engine that automatically decides whether to fulfill an order from the central warehouse, ship it from the nearest retail store, or route it for store pickup based on customer distance and available stock.\n- Digital handheld picking for warehouses: A mobile scanning app for our warehouse pickers using our Zebra TC52 Android scanners, verifying barcodes on each scan so we eliminate mis-picks.\n- Store associate app for Click & Collect: A clean app on store tablets/phones so retail associates can quickly prepare Click & Collect orders and hand them to customers in under a minute.\n- Automated courier booking: Instant shipping label printing for Australia Post and DHL directly at the packing bench.", 90),

        ("SEC", "Things we'd need it to connect to", "", 24),
        ("ROW", "Integrations", "- Shopify Plus (our e-commerce platform)\n- Our on-premise store POS system\n- SAP S/4HANA (financials, master procurement, and general ledger)\n- Australia Post eParcel and DHL Express (courier APIs for rating and label printing)\n- Zebra TC52 Android handheld barcode scanners", 75),

        ("SEC", "Timeline and budget", "", 24),
        ("ROW", "Expectations", "- Timeline: We want Phase 1 live and tested before our next major trading season (ideally within 18 to 24 weeks).\n- Budget: Our approved capital budget for software development and implementation services is roughly AUD $180,000 to $230,000 (ex GST).\n- Proposal request: Please provide an end-to-end proposal outlining your recommended approach, team structure, technical architecture, timeline, and a detailed commercial quote with milestones.", 75)
    ]

    curr_r = 4
    for r_type, col_a, col_b, r_height in rfp_rows:
        ws.row_dimensions[curr_r].height = r_height
        if r_type == "SEC":
            ws.merge_cells(start_row=curr_r, start_column=1, end_row=curr_r, end_column=2)
            c = ws.cell(row=curr_r, column=1, value=col_a)
            c.font = font_section
            c.fill = fill_section
            c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
            ws.cell(row=curr_r, column=2).border = thin_border
            curr_r += 1
        else:
            cA = ws.cell(row=curr_r, column=1, value=col_a)
            cA.font = font_meta_key
            cA.fill = fill_zebra
            cA.border = thin_border
            cA.alignment = Alignment(horizontal="left", vertical="top")

            cB = ws.cell(row=curr_r, column=2, value=col_b)
            cB.font = font_meta_val
            cB.fill = fill_white
            cB.border = thin_border
            cB.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            curr_r += 1

    ws.views.sheetView[0].showGridLines = True
    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["B"].width = 100

    wb.save(file_path)
    print(f"✅ Authentic Client Lead 01 created at: {file_path}")


# ==========================================
# 2. BUILD PROPOSAL 01 (10 SHEETS)
# ==========================================
def build_proposal_01(file_path: str):
    wb = openpyxl.Workbook()

    # ----------------------------------------------------
    # SHEET 1: Overview
    # ----------------------------------------------------
    ws_ov = wb.active
    ws_ov.title = "Overview"

    ws_ov.merge_cells("A1:F1")
    ws_ov["A1"] = "PROPOSAL: ENTERPRISE OMNICHANNEL COMMERCE & FULFILLMENT PLATFORM"
    ws_ov["A1"].font = font_title
    ws_ov["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws_ov.row_dimensions[1].height = 32

    ws_ov.merge_cells("A2:F2")
    ws_ov["A2"] = "Client: NovaRetail Holdings Pty Ltd  |  Proposal ID: PRP-2026-NOV-01  |  Date: 08 October 2026  |  Validity: 30 Days"
    ws_ov["A2"].font = font_subtitle
    ws_ov.row_dimensions[2].height = 20

    ov_data = [
        ("PROJECT METADATA", [
            ("Client Name", "NovaRetail Holdings Pty Ltd", "Presale Solution Lead", "Alexandre Martin (Principal Solutions Architect)"),
            ("Project Code", "PBL6-NOVA-OMS-2026", "Delivery Manager", "Sarah Jenkins (Senior Agile Delivery Lead)"),
            ("Proposal Version", "v1.0 (Commercial & Technical Bid)", "Target Kick-off", "02 November 2026"),
            ("Primary Objective", "Deploy Cloud OMS, Real-Time Inventory, and WMS Lite across 120 Stores & 3 Central Warehouses", "Total Delivery Duration", "24 Calendar Weeks (12 Sprints)")
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
    ]

    r = 4
    for sec_name, rows in ov_data:
        ws_ov.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
        c = ws_ov.cell(row=r, column=1, value=sec_name)
        c.font = font_section
        c.fill = fill_section
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws_ov.row_dimensions[r].height = 24
        r += 1

        for row_tuple in rows:
            if row_tuple[2] == "" and row_tuple[3] == "":
                ws_ov.cell(row=r, column=1, value=row_tuple[0]).font = font_meta_key
                ws_ov.cell(row=r, column=1).fill = fill_zebra
                ws_ov.cell(row=r, column=1).border = thin_border
                ws_ov.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="top")

                ws_ov.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
                val_c = ws_ov.cell(row=r, column=2, value=row_tuple[1])
                val_c.font = font_meta_val
                val_c.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
                for ci in range(2, 7):
                    ws_ov.cell(row=r, column=ci).border = thin_border
                ws_ov.row_dimensions[r].height = 24 if len(row_tuple[1]) < 70 else (45 if len(row_tuple[1]) < 180 else 70)
            else:
                ws_ov.cell(row=r, column=1, value=row_tuple[0]).font = font_meta_key
                ws_ov.cell(row=r, column=1).fill = fill_zebra
                ws_ov.cell(row=r, column=1).border = thin_border
                ws_ov.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="center")

                ws_ov.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
                ws_ov.cell(row=r, column=2, value=row_tuple[1]).font = font_meta_val
                ws_ov.cell(row=r, column=2).alignment = Alignment(horizontal="left", vertical="center")
                for ci in range(2, 4):
                    ws_ov.cell(row=r, column=ci).border = thin_border

                ws_ov.cell(row=r, column=4, value=row_tuple[2]).font = font_meta_key
                ws_ov.cell(row=r, column=4).fill = fill_zebra
                ws_ov.cell(row=r, column=4).border = thin_border
                ws_ov.cell(row=r, column=4).alignment = Alignment(horizontal="left", vertical="center")

                ws_ov.merge_cells(start_row=r, start_column=5, end_row=r, end_column=6)
                ws_ov.cell(row=r, column=5, value=row_tuple[3]).font = font_meta_val
                ws_ov.cell(row=r, column=5).alignment = Alignment(horizontal="left", vertical="center")
                for ci in range(5, 7):
                    ws_ov.cell(row=r, column=ci).border = thin_border
                ws_ov.row_dimensions[r].height = 22
            r += 1
        r += 1

    auto_fit_columns(ws_ov, {"A": 26, "B": 28, "C": 20, "D": 26, "E": 28, "F": 15})

    # ----------------------------------------------------
    # SHEET 2: Project Roles
    # ----------------------------------------------------
    ws_roles = wb.create_sheet(title="Project Roles")

    ws_roles.merge_cells("A1:G1")
    ws_roles["A1"] = "PROJECT ORGANIZATION & TEAM ROLES"
    ws_roles["A1"].font = font_title
    ws_roles.row_dimensions[1].height = 28

    ws_roles.merge_cells("A2:G2")
    ws_roles["A2"] = "Clear division of responsibilities, governance structure, and RACI Matrix across project lifecycle."
    ws_roles["A2"].font = font_subtitle
    ws_roles.row_dimensions[2].height = 18

    headers_roles = ["Role Title", "Organization", "Allocation", "Primary Responsibilities", "Key Deliverables Owned", "Seniority"]
    ws_roles.row_dimensions[4].height = 24
    for i, h in enumerate(headers_roles, 1):
        cell = ws_roles.cell(row=4, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")

    roles_data = [
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
        ("Enterprise IT Lead", "Client", "Key Partner (25%)", "Provisioning SAP OData endpoints, firewall whitelist, AWS account IAM role delegation", "Enterprise API Credentials, Sandbox Environments", "Lead"),
        ("Retail Operations Champion", "Client", "Advisory (20%)", "Operational input on store workflows, pilot store coordination (Byron & Sydney), staff training", "Store Standard Operating Procedures (SOP)", "Specialist")
    ]

    for r_idx, r_data in enumerate(roles_data, 5):
        ws_roles.row_dimensions[r_idx].height = 28
        fill_curr = fill_zebra if r_idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_roles.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_cell
            cell.fill = fill_curr
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center" if c_idx in [2, 3, 6] else "left", vertical="center", wrap_text=True)

    auto_fit_columns(ws_roles, {"A": 26, "B": 15, "C": 18, "D": 45, "E": 35, "F": 14})

    # ----------------------------------------------------
    # SHEET 3: Project Management Approach
    # ----------------------------------------------------
    ws_pm = wb.create_sheet(title="Project Management Approach")

    ws_pm.merge_cells("A1:E1")
    ws_pm["A1"] = "PROJECT MANAGEMENT & DELIVERY METHODOLOGY"
    ws_pm["A1"].font = font_title
    ws_pm.row_dimensions[1].height = 28

    ws_pm.merge_cells("A2:E2")
    ws_pm["A2"] = "Agile Scrum framework, communication cadence, quality assurance governance, and risk control."
    ws_pm["A2"].font = font_subtitle
    ws_pm.row_dimensions[2].height = 18

    pm_sections = [
        ("1. AGILE DELIVERY FRAMEWORK & SPRINTS", [
            ("Sprint Duration", "2 Calendar Weeks per Sprint (Total of 12 Sprints across 24 weeks)."),
            ("Sprint Planning", "Conducted alternate Mondays (9:00 AM - 11:00 AM). User stories estimated using Fibonacci story points."),
            ("Daily Standup", "15-minute daily synchronization at 9:30 AM via Slack Huddle / Google Meet. Three questions: What was done yesterday, what will be done today, any blockers."),
            ("Sprint Review & Live Demo", "Alternate Fridays (3:00 PM - 4:00 PM). Live functional software demonstration in Staging environment with client PO and key stakeholders."),
            ("Sprint Retrospective", "Alternate Fridays (4:00 PM - 5:00 PM). Internal vendor team review focusing on process optimization, velocity calibration, and impediments.")
        ]),
        ("2. TOOLING & COLLABORATION PLATFORMS", [
            ("Project Management & Backlog", "Jira Software – Epics, User Stories, Bug tracking, Sprint Burndown Charts, and Velocity metrics."),
            ("Documentation & Knowledge Base", "Confluence – Architecture Decision Records (ADRs), API specifications, Meeting minutes, Deployment runbooks."),
            ("Version Control & CI/CD", "GitHub Enterprise – Trunk-based development, Pull Request peer review requirements (2 approvals), Automated GitHub Actions."),
            ("UI/UX Design Collaboration", "Figma – Design systems, component libraries, responsive viewports, click-through interactive prototypes."),
            ("Real-Time Communications", "Slack – Dedicated shared channels (#novasync-daily, #novasync-tech-dev, #novasync-announcements).")
        ]),
        ("3. QUALITY GOVERNANCE & CODE REVIEW GATES", [
            ("Code Review Standards", "Every Pull Request requires 2 peer approvals (including Tech Lead). PR template enforces unit test coverage, security checks, and lint clean."),
            ("Automated Test Gates", "CI pipeline runs SonarQube quality gate: 0 critical vulnerabilities, < 3% code duplication, minimum 80% automated unit test coverage."),
            ("Deployment Automation", "Automated deployment to Dev environment on merge to 'develop' branch; Automated Staging deployment on tagged sprint release.")
        ]),
        ("4. SCOPE CHANGE MANAGEMENT PROCEDURE (CR)", [
            ("Change Request Trigger", "Any requirement alteration exceeding 10% deviation from baseline Functional Requirements (FR) sheet."),
            ("Impact Assessment", "Vendor PM and Solution Architect evaluate impact on budget, timeline, and dependencies within 48 business hours."),
            ("Commercial Agreement", "Formal Change Order document detailing added story points, timeline impact, and cost signed off by Client Sponsor prior to implementation.")
        ])
    ]

    r = 4
    for sec_t, items in pm_sections:
        ws_pm.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
        c = ws_pm.cell(row=r, column=1, value=sec_t)
        c.font = font_section
        c.fill = fill_section
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        ws_pm.row_dimensions[r].height = 24
        r += 1

        for label, val in items:
            ws_pm.cell(row=r, column=1, value=label).font = font_meta_key
            ws_pm.cell(row=r, column=1).fill = fill_zebra
            ws_pm.cell(row=r, column=1).border = thin_border
            ws_pm.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="center")

            ws_pm.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
            val_cell = ws_pm.cell(row=r, column=2, value=val)
            val_cell.font = font_meta_val
            val_cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            for ci in range(2, 6):
                ws_pm.cell(row=r, column=ci).border = thin_border
            ws_pm.row_dimensions[r].height = 24 if len(val) < 80 else 42
            r += 1
        r += 1

    auto_fit_columns(ws_pm, {"A": 30, "B": 25, "C": 25, "D": 25, "E": 20})

    # ----------------------------------------------------
    # SHEET 4: RAID (Risks, Assumptions, Issues, Dependencies)
    # ----------------------------------------------------
    ws_raid = wb.create_sheet(title="RAID")

    ws_raid.merge_cells("A1:G1")
    ws_raid["A1"] = "RAID LOG: RISKS, ASSUMPTIONS, ISSUES & DEPENDENCIES"
    ws_raid["A1"].font = font_title
    ws_raid.row_dimensions[1].height = 28

    ws_raid.merge_cells("A2:G2")
    ws_raid["A2"] = "Active risk management matrix monitored continuously during weekly governance meetings."
    ws_raid["A2"].font = font_subtitle
    ws_raid.row_dimensions[2].height = 18

    headers_raid = ["ID", "Category", "Item Description", "Impact", "Probability", "Mitigation Strategy & Action Plan", "Owner"]
    ws_raid.row_dimensions[4].height = 24
    for i, h in enumerate(headers_raid, 1):
        cell = ws_raid.cell(row=4, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")

    raid_data = [
        ("RSK-01", "Risk", "Shopify Plus GraphQL API rate limits exceeded during flash sales / peak traffic events.", "High", "Medium", "Implement Redis queue buffer with exponential backoff and batch inventory update mutations (max 250 items/call).", "Tech Lead"),
        ("RSK-02", "Risk", "Legacy POS batch synchronization latency creates phantom inventory reservations.", "High", "High", "Enforce safety stock buffer threshold (reserve 2 units) and webhook triggers from POS cash register terminals.", "Solution Architect"),
        ("RSK-03", "Risk", "Warehouse staff resist transition from paper picking manifests to Android Zebra PDAs.", "Medium", "High", "Conduct comprehensive on-site training sessions in Sydney DC; design high-contrast tactile barcode scanning UX.", "Retail Ops Lead"),
        ("RSK-04", "Risk", "Courier carrier API response latency (> 3s) stalls shipping label printing at packing stations.", "High", "Medium", "Pre-fetch courier labels asynchronously during picking phase; cache shipping manifests locally.", "Senior Backend"),
        ("ASM-01", "Assumption", "Client Product Owner will be available at least 15 hours/week for sprint ceremonies and prompt UAT sign-off.", "High", "N/A", "Agreed in Project Charter; PO backup appointed (Elena Rostova - COO).", "Client Sponsor"),
        ("ASM-02", "Assumption", "Test sandbox credentials for SAP S/4HANA OData services provided no later than Sprint 1 kickoff.", "High", "N/A", "Client IT team confirmed sandbox ready by Oct 28.", "Enterprise IT Lead"),
        ("ASM-03", "Assumption", "All 3 Distribution Centers have high-density 5GHz Wi-Fi coverage across all warehouse aisles.", "Medium", "N/A", "Client facility manager conducted RF signal audit in Sept 2026.", "Client PM"),
        ("ISS-01", "Issue", "Legacy POS hardware at 18 regional stores has outdated firmware not supporting TLS 1.3.", "Medium", "Active", "Client IT to perform automated overnight firmware update across store POS terminals before Sprint 6.", "Enterprise IT Lead"),
        ("DEP-01", "Dependency", "AWS Australia (ap-southeast-2) Production Cloud Account provisioning and enterprise billing activation.", "High", "Open", "DevOps engineer provided Terraform Cloud account requirements; client to sign AWS agreement by Sprint 0.", "DevOps Lead"),
        ("DEP-02", "Dependency", "AusPost eParcel and DHL Express commercial API production credentials and contract sign-off.", "High", "Open", "Client Logistics manager managing courier onboarding; mock sandbox services used in Sprints 2-4.", "Client Logistics Lead"),
        ("DEP-03", "Dependency", "Zebra TC52 Android handheld scanner hardware procurement and OS staging (120 units total).", "Medium", "Open", "Hardware vendor PO placed; delivery scheduled in two batches (Batch 1: Week 8, Batch 2: Week 14).", "Retail Ops Lead")
    ]

    for r_idx, r_data in enumerate(raid_data, 5):
        ws_raid.row_dimensions[r_idx].height = 32
        fill_curr = fill_zebra if r_idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_raid.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_cell
            cell.fill = fill_curr
            cell.border = thin_border
            
            # Alignments & badges
            if c_idx in [1, 2, 4, 5, 7]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

    auto_fit_columns(ws_raid, {"A": 12, "B": 15, "C": 45, "D": 12, "E": 12, "F": 45, "G": 20})

    # ----------------------------------------------------
    # SHEET 5: Acceptance Docs
    # ----------------------------------------------------
    ws_acc = wb.create_sheet(title="Acceptance Docs")

    ws_acc.merge_cells("A1:F1")
    ws_acc["A1"] = "QUALITY ASSURANCE, ACCEPTANCE CRITERIA & DEFECT SLA"
    ws_acc["A1"].font = font_title
    ws_acc.row_dimensions[1].height = 28

    ws_acc.merge_cells("A2:F2")
    ws_acc["A2"] = "Milestone acceptance definitions, Definition of Done (DoD), and production defect severity SLAs."
    ws_acc["A2"].font = font_subtitle
    ws_acc.row_dimensions[2].height = 18

    # Section 1: Definition of Done
    ws_acc.merge_cells("A4:F4")
    ws_acc["A4"] = "1. DEFINITION OF DONE (DoD) FOR SPRINT USER STORIES"
    ws_acc["A4"].font = font_section
    ws_acc["A4"].fill = fill_section
    ws_acc["A4"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_acc.row_dimensions[4].height = 24

    dod_items = [
        ("Criterion 1: Code Review", "All code committed to feature branch, passed automated linter, and approved by 2 senior developers via GitHub PR."),
        ("Criterion 2: Automated Tests", "Unit tests written and passing with >= 80% code coverage. Automated integration tests pass on GitHub Actions."),
        ("Criterion 3: Security & Quality", "SonarQube scan passes with 0 Blocker/Critical bugs and 0 high-severity security vulnerabilities."),
        ("Criterion 4: Deployment & Config", "Code automatically deployed to Staging environment with database migration scripts verified and idempotency confirmed."),
        ("Criterion 5: Documentation", "API documentation generated via Swagger / OpenAPI. Any architectural changes documented in Confluence ADR."),
        ("Criterion 6: Acceptance Sign-off", "Client Product Owner verifies story against Gherkin Given-When-Then criteria in Staging and marks Jira story 'Accepted'.")
    ]
    r = 5
    for c_name, c_desc in dod_items:
        ws_acc.cell(row=r, column=1, value=c_name).font = font_meta_key
        ws_acc.cell(row=r, column=1).fill = fill_zebra
        ws_acc.cell(row=r, column=1).border = thin_border
        ws_acc.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="center")

        ws_acc.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
        ws_acc.cell(row=r, column=2, value=c_desc).font = font_meta_val
        ws_acc.cell(row=r, column=2).alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        for ci in range(2, 7):
            ws_acc.cell(row=r, column=ci).border = thin_border
        ws_acc.row_dimensions[r].height = 22
        r += 1

    r += 1
    # Section 2: Defect SLA
    ws_acc.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
    ws_acc.cell(row=r, column=1, value="2. DEFECT SEVERITY CLASSIFICATION & RESOLUTION SLA (UAT & WARRANTY)").font = font_section
    ws_acc.cell(row=r, column=1).fill = fill_section
    ws_acc.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_acc.row_dimensions[r].height = 24
    r += 1

    headers_sla = ["Severity Level", "Definition", "Example Scenario", "Initial Response SLA", "Target Resolution SLA", "Exit Gate Impact"]
    ws_acc.row_dimensions[r].height = 24
    for i, h in enumerate(headers_sla, 1):
        cell = ws_acc.cell(row=r, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")
    r += 1

    sla_data = [
        ("P1 – Blocker", "Critical system outage, total data loss risk, or complete stoppage of core checkout/picking.", "Inventory lock engine crashes; all order routing ceases across all stores.", "< 1 Hour", "< 4 Hours", "Blocks Milestone Go-Live (Zero P1 tolerated)"),
        ("P2 – Critical", "Major feature unusable with no reasonable workaround available for staff.", "Zebra PDA scanner app crashes when scanning multi-SKU barcode bins.", "< 2 Hours", "< 8 Hours", "Blocks Milestone Go-Live (Zero P2 tolerated)"),
        ("P3 – Major", "Feature failure but reasonable manual workaround exists without business disruption.", "Courier tracking SMS fails to trigger; customer still receives email update.", "< 4 Hours", "< 24 Hours", "Max 3 open P3 allowed with approved fix plan"),
        ("P4 – Minor", "Cosmetic, minor UI alignment issue, or minor typo with zero functional impact.", "Dashboard chart legend overlaps slightly on mobile viewport resolution.", "< 8 Hours", "< 72 Hours", "Resolved in subsequent scheduled patch release")
    ]
    for s_row in sla_data:
        ws_acc.row_dimensions[r].height = 32
        for ci, val in enumerate(s_row, 1):
            cell = ws_acc.cell(row=r, column=ci, value=val)
            cell.font = font_cell
            cell.fill = fill_zebra if r % 2 == 0 else fill_white
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center" if ci in [1, 4, 5] else "left", vertical="center", wrap_text=True)
        r += 1

    auto_fit_columns(ws_acc, {"A": 16, "B": 28, "C": 35, "D": 18, "E": 18, "F": 30})

    # ----------------------------------------------------
    # SHEET 6: FR (Functional Requirements)
    # ----------------------------------------------------
    ws_fr = wb.create_sheet(title="FR")

    ws_fr.merge_cells("A1:G1")
    ws_fr["A1"] = "FUNCTIONAL REQUIREMENTS MATRIX (FR)"
    ws_fr["A1"].font = font_title
    ws_fr.row_dimensions[1].height = 28

    ws_fr.merge_cells("A2:G2")
    ws_fr["A2"] = "Detailed functional breakdown across OMS, Real-time Inventory, WMS Lite, Store Associate App & Logistics."
    ws_fr["A2"].font = font_subtitle
    ws_fr.row_dimensions[2].height = 18

    headers_fr = ["Requirement ID", "Functional Module", "Feature Name", "Detailed User Story & Specification", "Priority (MoSCoW)", "Complexity", "Sprint Allocation"]
    ws_fr.row_dimensions[4].height = 24
    for i, h in enumerate(headers_fr, 1):
        cell = ws_fr.cell(row=4, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")

    fr_data = [
        ("FR-OMS-01", "Core OMS Engine", "Order Ingestion Webhooks", "System shall ingest orders in real-time from Shopify Plus, TikTok Shop, and wholesale B2B via secure webhooks.", "Must-Have", "Medium", "Sprint 1"),
        ("FR-OMS-02", "Core OMS Engine", "Intelligent Order Routing", "System shall dynamically route orders to the closest fulfillment node (DC or local store) based on distance, stock depth, and carrier cost.", "Must-Have", "High", "Sprint 2"),
        ("FR-OMS-03", "Core OMS Engine", "Split-Shipment Optimization", "System shall automatically calculate optimal order splits when a single node cannot fulfill all line items, minimizing shipping legs.", "Should-Have", "High", "Sprint 3"),
        ("FR-OMS-04", "Core OMS Engine", "Order Lifecycle State Machine", "System shall maintain finite state machine for orders (Pending, Routed, Allocated, Picking, Shipped, Delivered, Cancelled, Returned).", "Must-Have", "Medium", "Sprint 2"),
        ("FR-INV-01", "Inventory Engine", "Distributed Stock Ledger", "System shall maintain an atomic distributed inventory ledger with sub-second balance updates across 120 stores and 3 DCs.", "Must-Have", "High", "Sprint 1"),
        ("FR-INV-02", "Inventory Engine", "Channel Reservation Locks", "System shall acquire Redis-backed temporary reservation locks (15 min lease) during online checkout to eliminate overselling.", "Must-Have", "High", "Sprint 2"),
        ("FR-INV-03", "Inventory Engine", "Safety Buffer Rules", "System shall allow setting configurable safety stock thresholds per SKU/category (e.g., reserve 2 units for walk-in store customers).", "Must-Have", "Medium", "Sprint 3"),
        ("FR-INV-04", "Inventory Engine", "SAP S/4HANA Reconciliation", "System shall execute daily automated two-way inventory reconciliation with SAP Master Inventory, flagging discrepancies.", "Should-Have", "Medium", "Sprint 4"),
        ("FR-WMS-01", "WMS Lite (DC)", "Digital Wave Picking", "System shall group orders into optimized pick waves based on warehouse zone, aisle location, and shipping cut-off time.", "Must-Have", "High", "Sprint 5"),
        ("FR-WMS-02", "WMS Lite (DC)", "PDA Barcode Verification", "Warehouse pickers using Zebra PDAs shall scan bin barcode and SKU barcode with audible/tactile validation to prevent mis-picks.", "Must-Have", "Medium", "Sprint 5"),
        ("FR-WMS-03", "WMS Lite (DC)", "Packing & Weigh Scale API", "Packing station terminal shall integrate with USB digital scale to verify parcel weight against expected SKU weight tolerance.", "Should-Have", "Medium", "Sprint 6"),
        ("FR-WMS-04", "WMS Lite (DC)", "Automated Label Printing", "System shall automatically print carrier thermal labels (ZPL format) upon final parcel carton sealing.", "Must-Have", "Medium", "Sprint 6"),
        ("FR-STR-01", "Store Associate App", "Express Click & Collect (BOPIS)", "Store associate app shall notify staff of new pickup orders, guide item retrieval in store, and trigger customer ready SMS.", "Must-Have", "High", "Sprint 7"),
        ("FR-STR-02", "Store Associate App", "Fast Customer Pickup Handover", "Associate shall scan customer QR code at pickup counter to finalize handover and mark order collected within 15 seconds.", "Must-Have", "Medium", "Sprint 7"),
        ("FR-STR-03", "Store Associate App", "Ship-from-Store Dispatch", "Store staff shall receive packing assignments for local courier delivery during store quiet hours, generating courier labels.", "Should-Have", "High", "Sprint 8"),
        ("FR-LOG-01", "Carrier Logistics Hub", "Multi-Carrier Rate Shopping", "System shall query AusPost, StarTrack, and DHL Express APIs in parallel to select the cheapest carrier meeting delivery SLA.", "Should-Have", "Medium", "Sprint 8"),
        ("FR-LOG-02", "Carrier Logistics Hub", "Unified Tracking Webhooks", "System shall normalize carrier milestone tracking events into unified customer-facing status updates via SMS and email.", "Must-Have", "Medium", "Sprint 9"),
        ("FR-RPT-01", "Executive Analytics", "Live Fulfillment Operations Wallboard", "Executive web portal shall display live map of orders, regional stockout heatmaps, picking throughput, and courier SLA compliance.", "Must-Have", "Medium", "Sprint 9"),
        ("FR-RPT-02", "Executive Analytics", "Overselling & Discrepancy Reports", "System shall provide automated daily exception reports detailing cancelled orders, stockout causes, and discrepancy root cause.", "Should-Have", "Low", "Sprint 10")
    ]

    for r_idx, r_data in enumerate(fr_data, 5):
        ws_fr.row_dimensions[r_idx].height = 26
        fill_curr = fill_zebra if r_idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_fr.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_cell
            cell.fill = fill_curr
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center" if c_idx in [1, 2, 5, 6, 7] else "left", vertical="center", wrap_text=True)

    auto_fit_columns(ws_fr, {"A": 16, "B": 22, "C": 30, "D": 55, "E": 18, "F": 14, "G": 16})

    # ----------------------------------------------------
    # SHEET 7: Tech-stack
    # ----------------------------------------------------
    ws_tech = wb.create_sheet(title="Tech-stack")

    ws_tech.merge_cells("A1:F1")
    ws_tech["A1"] = "TECHNICAL ARCHITECTURE & TECHNOLOGY STACK"
    ws_tech["A1"].font = font_title
    ws_tech.row_dimensions[1].height = 28

    ws_tech.merge_cells("A2:F2")
    ws_tech["A2"] = "Cloud-native, event-driven, high-throughput microservices architecture hosted on AWS Australia."
    ws_tech["A2"].font = font_subtitle
    ws_tech.row_dimensions[2].height = 18

    headers_tech = ["Architecture Tier", "Component / Framework", "Version", "Selection Rationale & Technical Justification", "Licensing & Hosting", "High Availability"]
    ws_tech.row_dimensions[4].height = 24
    for i, h in enumerate(headers_tech, 1):
        cell = ws_tech.cell(row=4, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")

    tech_data = [
        ("Frontend Web Portal", "Next.js 15 (React 19, TypeScript)", "15.0+", "Server-Side Rendering (SSR) for fast initial loads, React Server Components for dashboards, built-in security headers.", "Open Source (MIT) / Vercel/AWS", "Multi-AZ CloudFront CDN"),
        ("Mobile & PDA Client", "Flutter 3.x (Dart)", "3.24+", "Single unified codebase compiling natively to Android (Zebra TC52 PDAs) and iOS (store manager iPhones). 60fps hardware scanning.", "Open Source (BSD) / Native", "Local SQLite offline cache"),
        ("Core Backend API", "NestJS (Node.js Enterprise)", "10.4+", "Modular TypeScript framework, dependency injection, high developer velocity, native OpenAPI/Swagger generation.", "Open Source (MIT) / AWS EKS", "Auto-scaling Pods (3-15)"),
        ("High-Speed Inventory Lock", "Go (Golang Microservice)", "1.23+", "Ultra-low memory footprint, goroutine concurrency handling 10,000+ lock leases/sec with sub-5ms response time.", "Open Source (BSD) / AWS EKS", "Horizontal Auto-scaler"),
        ("Primary Database", "PostgreSQL (AWS Aurora)", "16.x", "ACID transactional compliance, JSONB document support for complex order manifests, read-replica scaling.", "AWS Managed Aurora PostgreSQL", "Multi-AZ Auto-Failover (<30s)"),
        ("Distributed Cache & Locks", "Redis Enterprise (AWS ElastiCache)", "7.2+", "In-memory key-value caching, Redis distributed lock manager (Redlock algorithm) for stock reservation.", "AWS Managed ElastiCache", "Multi-AZ Cluster Mode"),
        ("Search & Analytics", "Elasticsearch (OpenSearch)", "2.14+", "Sub-50ms full-text search across 50,000 SKUs and historical orders; complex aggregation for dashboard.", "AWS OpenSearch Service", "3-Node Master/Data Cluster"),
        ("Event Streaming & Messaging", "Apache Kafka (AWS MSK) / RabbitMQ", "3.7+", "Decoupled asynchronous event pipeline for order events (OrderCreated, StockDeducted, LabelGenerated).", "AWS Managed Streaming Kafka", "Multi-AZ Topic Replication"),
        ("Cloud Infrastructure", "AWS (Sydney ap-southeast-2)", "N/A", "Complies with Australian Data Sovereignty; low latency (< 15ms) to physical stores across Sydney & Melbourne.", "AWS Cloud Enterprise", "Multi-AZ (3 Availability Zones)"),
        ("DevOps & Orchestration", "Terraform & GitHub Actions", "1.9+", "100% Infrastructure-as-Code (IaC) reproducible environments; automated blue/green zero-downtime deployment.", "Open Source / GitHub SaaS", "Redundant CI Runners"),
        ("API Security & Identity", "Keycloak / AWS Cognito & OAuth2", "24.x", "Role-Based Access Control (RBAC), OpenID Connect, JWT token expiration with refresh rotation, MFA for managers.", "Open Source / AWS", "Redundant Auth Servers")
    ]

    for r_idx, r_data in enumerate(tech_data, 5):
        ws_tech.row_dimensions[r_idx].height = 28
        fill_curr = fill_zebra if r_idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_tech.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_cell
            cell.fill = fill_curr
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center" if c_idx in [1, 3, 5, 6] else "left", vertical="center", wrap_text=True)

    auto_fit_columns(ws_tech, {"A": 22, "B": 28, "C": 12, "D": 45, "E": 24, "F": 22})

    # ----------------------------------------------------
    # SHEET 8: Non-FR (Non-Functional Requirements)
    # ----------------------------------------------------
    ws_nfr = wb.create_sheet(title="Non-FR")

    ws_nfr.merge_cells("A1:F1")
    ws_nfr["A1"] = "NON-FUNCTIONAL REQUIREMENTS (NFR) & ARCHITECTURAL BASELINE"
    ws_nfr["A1"].font = font_title
    ws_nfr.row_dimensions[1].height = 28

    ws_nfr.merge_cells("A2:F2")
    ws_nfr["A2"] = "Performance SLAs, system availability, data security, scalability, and disaster recovery standards."
    ws_nfr["A2"].font = font_subtitle
    ws_nfr.row_dimensions[2].height = 18

    headers_nfr = ["NFR ID", "Quality Attribute", "Target Metric / Specification", "Measurement Methodology", "Architecture Enforcement Mechanism", "Verification Phase"]
    ws_nfr.row_dimensions[4].height = 24
    for i, h in enumerate(headers_nfr, 1):
        cell = ws_nfr.cell(row=4, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")

    nfr_data = [
        ("NFR-PERF-01", "API Response Latency", "P95 response time < 200ms; P99 response time < 500ms under standard operational load.", "Automated k6 load test simulating 1,500 requests/sec.", "Redis caching, Aurora DB indexing, lightweight Go microservice for inventory.", "Sprint 11 (Load Test)"),
        ("NFR-PERF-02", "Throughput Scalability", "Support 500 peak transactions per second (TPS) during Flash Sale / Black Friday peaks.", "Distributed load test simulating 35,000 orders over 1-hour burst.", "AWS EKS Horizontal Pod Autoscaler (HPA) and SQS/Kafka decoupling.", "Sprint 11 (Load Test)"),
        ("NFR-AVAIL-01", "System Availability", "99.95% uptime availability (<= 21.6 minutes unscheduled downtime per calendar month).", "Datadog synthetic uptime monitoring from 5 global locations.", "Multi-AZ AWS deployment with active health-check auto-healing pods.", "Production Go-Live"),
        ("NFR-SEC-01", "Data Encryption", "AES-256 encryption at rest for all databases/backups; TLS 1.3 in transit with HSTS enforced.", "AWS Security Hub automated compliance audit scan.", "AWS KMS managed customer master keys (CMK) and SSL certificates.", "Sprint 10 (Security)"),
        ("NFR-SEC-02", "Authentication & Access", "Role-Based Access Control (RBAC) with OAuth2 / JWT; Multi-Factor Authentication (MFA) for Admin.", "Penetration test report by CREST-certified security auditor.", "Strict Spring/NestJS guard middleware and Keycloak policy enforcement.", "Sprint 11 (Pentest)"),
        ("NFR-SEC-03", "Compliance Sovereignty", "All customer Personally Identifiable Information (PII) hosted in Australia (ap-southeast-2).", "Independent cloud architecture data residency audit.", "AWS IAM geographical SCP policies preventing non-Australian region spins.", "Sprint 10 (Security)"),
        ("NFR-DR-01", "Disaster Recovery (RPO)", "Recovery Point Objective (RPO) < 5 minutes (maximum 5 minutes of transactional data loss).", "Quarterly disaster recovery tabletop simulation drill.", "Aurora continuous incremental storage backup and S3 cross-region sync.", "Pre-Go-Live Drill"),
        ("NFR-DR-02", "Disaster Recovery (RTO)", "Recovery Time Objective (RTO) < 30 minutes to restore full transactional capabilities.", "Automated Terraform failover spin-up verification test.", "Infrastructure-as-Code Terraform deployment scripts stored in GitHub.", "Pre-Go-Live Drill"),
        ("NFR-OBS-01", "Observability & Tracing", "100% distributed trace capture for order lifecycle with centralized log retention (365 days).", "OpenTelemetry distributed trace sampling verification.", "Datadog APM / AWS CloudWatch Logs with automated P1 Slack alerting.", "Sprint 9")
    ]

    for r_idx, r_data in enumerate(nfr_data, 5):
        ws_nfr.row_dimensions[r_idx].height = 28
        fill_curr = fill_zebra if r_idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_nfr.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_cell
            cell.fill = fill_curr
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center" if c_idx in [1, 2, 6] else "left", vertical="center", wrap_text=True)

    auto_fit_columns(ws_nfr, {"A": 16, "B": 22, "C": 35, "D": 30, "E": 40, "F": 20})

    # ----------------------------------------------------
    # SHEET 9: RateCard
    # ----------------------------------------------------
    ws_rate = wb.create_sheet(title="RateCard")

    ws_rate.merge_cells("A1:F1")
    ws_rate["A1"] = "STANDARD PROFESSIONAL SERVICES RATE CARD"
    ws_rate["A1"].font = font_title
    ws_rate.row_dimensions[1].height = 28

    ws_rate.merge_cells("A2:F2")
    ws_rate["A2"] = "Standard hourly and daily rates by seniority and role. Currency: USD (ex GST/Tax). Standard day = 8 productive hours."
    ws_rate["A2"].font = font_subtitle
    ws_rate.row_dimensions[2].height = 18

    headers_rate = ["Role Title", "Seniority Level", "Hourly Rate (USD)", "Daily Rate (USD)", "Weekly Rate (USD)", "Typical Experience Profile"]
    ws_rate.row_dimensions[4].height = 24
    for i, h in enumerate(headers_rate, 1):
        cell = ws_rate.cell(row=4, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")

    rate_data = [
        ("Solution Architect", "Principal", 87.50, 700.00, 3500.00, "12+ years enterprise software architecture, cloud certification (AWS Pro)"),
        ("Project Manager / Scrum Master", "Senior", 68.75, 550.00, 2750.00, "8+ years managing Agile software projects, PMP / PMI-ACP certified"),
        ("Technical Lead", "Lead", 75.00, 600.00, 3000.00, "10+ years backend & distributed systems, architecture governance"),
        ("Senior Backend Engineer", "Senior", 60.00, 480.00, 2400.00, "6+ years Node.js, Go, PostgreSQL, high-throughput microservices"),
        ("Senior Frontend Engineer", "Senior", 57.50, 460.00, 2300.00, "6+ years React, Next.js, modern CSS, enterprise dashboard UX"),
        ("Senior Mobile / PDA Engineer", "Senior", 60.00, 480.00, 2400.00, "6+ years Flutter/Android, hardware barcode integration (Zebra EMDK)"),
        ("QA / Automation Test Lead", "Senior", 50.00, 400.00, 2000.00, "7+ years test automation, Cypress, Postman, performance k6 testing"),
        ("UI/UX Product Designer", "Senior", 52.50, 420.00, 2100.00, "7+ years design systems, mobile ergonomics, retail workflow design"),
        ("DevOps / Cloud Engineer", "Senior", 65.00, 520.00, 2600.00, "6+ years AWS, Kubernetes (EKS), Terraform, CI/CD pipeline automation"),
        ("Business Analyst", "Senior", 55.00, 440.00, 2200.00, "6+ years retail supply chain, functional requirement specification"),
        ("Mid-Level Software Engineer", "Mid", 42.50, 340.00, 1700.00, "3-5 years full-stack development, API integration, unit testing")
    ]

    for r_idx, r_data in enumerate(rate_data, 5):
        ws_rate.row_dimensions[r_idx].height = 24
        fill_curr = fill_zebra if r_idx % 2 == 0 else fill_white
        for c_idx, val in enumerate(r_data, 1):
            cell = ws_rate.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_cell
            cell.fill = fill_curr
            cell.border = thin_border
            if c_idx in [3, 4, 5]:
                cell.number_format = '$#,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif c_idx == 2:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

    auto_fit_columns(ws_rate, {"A": 26, "B": 16, "C": 18, "D": 18, "E": 18, "F": 45})

    # ----------------------------------------------------
    # SHEET 10: Macro Plan & Quotation
    # ----------------------------------------------------
    ws_quote = wb.create_sheet(title="Macro Plan & Quotation")

    ws_quote.merge_cells("A1:G1")
    ws_quote["A1"] = "MACRO IMPLEMENTATION PLAN & DETAILED COMMERCIAL QUOTATION"
    ws_quote["A1"].font = font_title
    ws_quote.row_dimensions[1].height = 28

    ws_quote.merge_cells("A2:G2")
    ws_quote["A2"] = "Phased timeline breakdown, Work Breakdown Structure (WBS), Quotation summary, and Milestone Payment Gates."
    ws_quote["A2"].font = font_subtitle
    ws_quote.row_dimensions[2].height = 18

    # Section 1: Phased Timeline
    ws_quote.merge_cells("A4:G4")
    ws_quote["A4"] = "1. PHASED MACRO ROADMAP & DELIVERABLE MILESTONES (24 WEEKS / 12 SPRINTS)"
    ws_quote["A4"].font = font_section
    ws_quote["A4"].fill = fill_section
    ws_quote["A4"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_quote.row_dimensions[4].height = 24

    headers_phases = ["Phase #", "Phase Name & Objective", "Start (Wk)", "Duration", "Key Activities & Milestones", "Primary Deliverables", "Gate Sign-off"]
    ws_quote.row_dimensions[5].height = 24
    for i, h in enumerate(headers_phases, 1):
        cell = ws_quote.cell(row=5, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")

    phases_data = [
        ("Phase 1", "Inception, Architecture & UX Design", "Week 1", "3 Weeks", "Discovery workshops, architecture blueprint, DB schema design, Zebra PDA ergonomic UI prototypes, AWS environment setup.", "Solution Architecture Document, Interactive Figma Prototype, Sprint Backlog", "Milestone 1 Sign-off"),
        ("Phase 2", "Core OMS & Inventory Ledger Engine", "Week 4", "8 Weeks", "Develop sub-second inventory engine, Shopify Plus webhooks, Redis reservation locks, SAP OData reconciliation, core routing engine.", "OMS Core Services in Staging, Automated API Test Suite, Inventory Lock Engine Demo", "Milestone 2 Sign-off"),
        ("Phase 3", "WMS Lite, Store App & Courier Hub", "Week 12", "7 Weeks", "Develop Zebra PDA scanner wave picking app, store Click & Collect associate app, carrier rating & ZPL thermal label printer integration.", "Android PDA Build, Store Associate App, Courier Hub Connector Suite", "Milestone 3 Sign-off"),
        ("Phase 4", "System Integration, UAT & Pentest", "Week 19", "3 Weeks", "End-to-end integration testing, business user UAT in simulated store/DC, k6 load testing (500 TPS), independent CREST security pentest.", "UAT Acceptance Certificate, Penetration Test Report, Load Test Benchmark Report", "Milestone 4 Sign-off"),
        ("Phase 5", "Production Pilot, Rollout & Hypercare", "Week 22", "3 Weeks", "Production deployment on AWS EKS, Pilot go-live across Sydney DC & 10 flagship stores, staff training, 24/7 on-site hypercare.", "Production Handover Runbook, Staff Training Material, Final Acceptance Certificate", "Final Milestone 5 Gate")
    ]
    r = 6
    for p_row in phases_data:
        ws_quote.row_dimensions[r].height = 30
        for ci, val in enumerate(p_row, 1):
            cell = ws_quote.cell(row=r, column=ci, value=val)
            cell.font = font_cell
            cell.fill = fill_zebra if r % 2 == 0 else fill_white
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center" if ci in [1, 3, 4, 7] else "left", vertical="center", wrap_text=True)
        r += 1

    r += 1
    # Section 2: WBS & Cost Breakdown
    ws_quote.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
    ws_quote.cell(row=r, column=1, value="2. WORK BREAKDOWN STRUCTURE (WBS) & EFFORT ESTIMATION").font = font_section
    ws_quote.cell(row=r, column=1).fill = fill_section
    ws_quote.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_quote.row_dimensions[r].height = 24
    r += 1

    headers_wbs = ["WBS ID", "Deliverable Component", "Est. Man-Days", "Blended Day Rate", "Subtotal (USD)", "Resource Composition", "Billing Type"]
    ws_quote.row_dimensions[r].height = 24
    for i, h in enumerate(headers_wbs, 1):
        cell = ws_quote.cell(row=r, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")
    r += 1

    wbs_data = [
        ("WBS-01", "Phase 1: Architecture, Inception & UI/UX Prototypes", 45, 633.33, 28500.00, "SA (12d), PM (8d), TL (10d), UI/UX (15d)", "Fixed Milestone"),
        ("WBS-02", "Phase 2: Core OMS, Inventory Ledger & SAP/Shopify Sync", 140, 520.00, 72800.00, "Backend (60d), Tech Lead (30d), PM (20d), QA (20d), DevOps (10d)", "Fixed Milestone"),
        ("WBS-03", "Phase 3: WMS Scanner App, Store BOPIS App & Logistics Hub", 110, 496.36, 54600.00, "Mobile (40d), Frontend (30d), Backend (20d), QA (20d)", "Fixed Milestone"),
        ("WBS-04", "Phase 4: End-to-End Testing, Security Pentest & UAT", 50, 492.00, 24600.00, "QA Lead (25d), PM (10d), SA (5d), Security/DevOps (10d)", "Fixed Milestone"),
        ("WBS-05", "Phase 5: Production Deployment, Pilot Rollout & Hypercare", 36, 500.00, 18000.00, "Tech Lead (12d), PM (12d), Mobile (6d), Backend (6d)", "Fixed Milestone")
    ]
    subtotal_start_row = r
    for w_row in wbs_data:
        ws_quote.row_dimensions[r].height = 24
        for ci, val in enumerate(w_row, 1):
            cell = ws_quote.cell(row=r, column=ci, value=val)
            cell.font = font_cell
            cell.fill = fill_zebra if r % 2 == 0 else fill_white
            cell.border = thin_border
            if ci in [4, 5]:
                cell.number_format = '$#,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif ci in [1, 3, 7]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        r += 1

    # Totals
    totals = [
        ("Subtotal Professional Services (381 Man-Days)", f"=SUM(E{subtotal_start_row}:E{r-1})", font_cell_bold),
        ("Project Delivery Contingency Buffer (10%)", f"=E{r}*0.1", font_cell),
        ("TOTAL DELIVERY QUOTATION (USD ex GST/Tax)", f"=E{r}+E{r+1}", font_title)
    ]
    for label, formula, f_style in totals:
        ws_quote.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
        lbl_c = ws_quote.cell(row=r, column=1, value=label)
        lbl_c.font = f_style
        lbl_c.alignment = Alignment(horizontal="right", vertical="center", indent=1)
        for ci in range(1, 5):
            ws_quote.cell(row=r, column=ci).border = thin_border
            ws_quote.cell(row=r, column=ci).fill = fill_sub if "TOTAL" in label else fill_white

        val_c = ws_quote.cell(row=r, column=5, value=formula)
        val_c.font = f_style
        val_c.fill = fill_sub if "TOTAL" in label else fill_white
        val_c.border = thin_border
        val_c.number_format = '$#,##0.00'
        val_c.alignment = Alignment(horizontal="right", vertical="center")

        for ci in range(6, 8):
            ws_quote.cell(row=r, column=ci).border = thin_border
            ws_quote.cell(row=r, column=ci).fill = fill_sub if "TOTAL" in label else fill_white
        ws_quote.row_dimensions[r].height = 26
        r += 1

    r += 1
    # Section 3: Milestone Payment Schedule
    ws_quote.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
    ws_quote.cell(row=r, column=1, value="3. DELIVERABLE-BASED MILESTONE PAYMENT SCHEDULE").font = font_section
    ws_quote.cell(row=r, column=1).fill = fill_section
    ws_quote.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_quote.row_dimensions[r].height = 24
    r += 1

    headers_pay = ["Milestone #", "Payment Trigger & Deliverable Gate", "% Allocation", "Amount (USD)", "Project Target Date", "Invoice Terms"]
    ws_quote.row_dimensions[r].height = 24
    for i, h in enumerate(headers_pay, 1):
        cell = ws_quote.cell(row=r, column=i, value=h)
        cell.font = font_tbl_header
        cell.fill = fill_header
        cell.border = header_border
        cell.alignment = Alignment(horizontal="center", vertical="center")
    r += 1

    payments_data = [
        ("Milestone 1", "Contract Execution & Inception Kick-off", 0.20, 43670.00, "Nov 02, 2026 (Kick-off)", "Due within 14 days of invoice"),
        ("Milestone 2", "Architecture Sign-off & Core OMS Staging Demo", 0.25, 54587.50, "Dec 21, 2026 (End Sprint 3)", "Due within 14 days of gate approval"),
        ("Milestone 3", "Feature Complete: WMS Scanner & Store App Release", 0.30, 65505.00, "Feb 22, 2027 (End Sprint 8)", "Due within 14 days of gate approval"),
        ("Milestone 4", "UAT Sign-off & Pilot Go-Live (Sydney DC + 10 Stores)", 0.15, 32752.50, "Mar 29, 2027 (End Sprint 10)", "Due within 14 days of gate approval"),
        ("Milestone 5", "Final Handover & 90-Day Hypercare Acceptance", 0.10, 21835.00, "Apr 19, 2027 (Final Gate)", "Due within 30 days of sign-off")
    ]
    for pay_row in payments_data:
        ws_quote.row_dimensions[r].height = 24
        for ci, val in enumerate(pay_row, 1):
            cell = ws_quote.cell(row=r, column=ci, value=val)
            cell.font = font_cell
            cell.fill = fill_zebra if r % 2 == 0 else fill_white
            cell.border = thin_border
            if ci == 3:
                cell.number_format = '0.0%'
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif ci == 4:
                cell.number_format = '$#,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif ci in [1, 5]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        r += 1

    auto_fit_columns(ws_quote, {"A": 16, "B": 35, "C": 15, "D": 20, "E": 22, "F": 28, "G": 20})

    wb.save(file_path)
    print(f"✅ Proposal 01 (10 sheets) created at: {file_path}")


if __name__ == "__main__":
    lead_file = "output/sample_leads_proposals/Lead_01_Retail_Omnichannel.xlsx"
    prop_file = "output/sample_leads_proposals/Proposal_01_Retail_Omnichannel.xlsx"
    build_lead_01(lead_file)
    build_proposal_01(prop_file)

