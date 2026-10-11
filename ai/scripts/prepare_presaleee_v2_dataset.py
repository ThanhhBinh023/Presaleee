"""
Comprehensive Presaleee Foundation V2 Dataset Generator
Builds a robust, multi-task dataset for the Presaleee AI Base Model based on Presaleee - Product Ideas.pdf.

Covers all 6 core pipeline capabilities:
1. AI Intake: Structured Parameter & Lead Extraction (Strict JSON)
2. Discovery: Meeting Transcript Cleaning & Normalization
3. Gap Analysis: Missing Field Detection & Proactive Follow-up Question Generation
4. Qualification Engine: Detailed BANT Scoring & Recommendation
5. Proposal Builder: Executive Summary & "Why This Solution" Alignment
6. Technical Deep Dive: Architecture Constraints, Assumptions, and Risk Matrix
"""

import json
import os
import random
from typing import Dict, List, Any

SYS_PROMPTS = {
    "structured_intake": (
        "You are the AI Intake Engine for Presaleee, an enterprise IT presale platform. "
        "Your task is to analyze client inquiries and RFPs, extract quantitative parameters, "
        "and return STRICT, VALID JSON containing client details, properties/scope, integrations, "
        "budget range, timeline constraints, and core technical requirements."
    ),
    "clean_transcript": (
        "You are the Discovery Meeting AI for Presaleee. Your task is to clean noisy, unstructured "
        "meeting transcripts: remove speech disfluencies (fillers, false starts), normalize technical terms, "
        "and structure the conversation into clear speaker turns and key meeting takeaways."
    ),
    "gap_analysis": (
        "You are the Proposal Gap Analysis Engine for Presaleee. Compare the customer discussion "
        "against enterprise proposal requirements. Identify missing or ambiguous information needed "
        "for accurate effort estimation and pricing, and generate proactive follow-up discovery questions."
    ),
    "qualification": (
        "You are the Qualification Engine for Presaleee. Conduct a rigorous enterprise qualification "
        "assessment using the BANT framework (Budget, Authority, Need, Timeline). Provide a Qualification Score (0-100), "
        "detailed justification, risk factors, readiness assessment, and a clear Approve / Discovery Needed / Reject recommendation."
    ),
    "why_solution": (
        "You are the Proposal Builder AI for Presaleee. Synthesize the client's operational pain points "
        "and technical requirements into compelling, executive-level 'Why This Solution' value propositions. "
        "Directly tie each customer challenge to a concrete architectural solution and measurable business outcome."
    ),
    "technical_summary": (
        "You are the Technical Deep Dive AI for Presaleee. Analyze technical sessions and discovery notes "
        "to synthesize an enterprise Technical Summary covering Architecture Overview, Technical Decisions, "
        "Constraints, Assumptions, Risks, and Outstanding Questions."
    )
}

DOMAIN_SCENARIOS = [
    {
        "domain": "Hospitality & Property Management",
        "client": "Coastal Stay Hotels Pty Ltd",
        "rfp_text": (
            "From: Coastal Stay Hotels Pty Ltd | Contact: Sarah Mitchell (Group Operations Manager)\n"
            "Properties: Byron Bay NSW (48 rooms), Gold Coast QLD (112 rooms, has restaurant & bar), Sydney CBD NSW (60 rooms). Total 220 rooms.\n"
            "Current setup: 2013 on-premise PMS across separate servers. Spreadsheets for rates and housekeeping.\n"
            "Pain points: Double bookings on OTAs, manual rate updates on Booking.com/Expedia/Airbnb, printed housekeeping sheets, 2-hour night audits, server outages at Gold Coast.\n"
            "Requirements: Cloud PMS SaaS, mobile housekeeping, direct booking engine widget, Australian cloud data residency, GST compliance, 24/7 urgent support.\n"
            "Integrations needed: Channel manager (Booking.com, Expedia, Airbnb), Stripe & Tyro payments, Xero accounting, Restaurant POS at Gold Coast, Salto door locks, website booking widget.\n"
            "Budget: AUD 150k-200k Year 1 including setup.\n"
            "Timeline: Kick-off Nov 2026. Byron Bay pilot wave 1, avoid Christmas-Jan peak, all live by mid-2027."
        ),
        "intake_json": {
            "client_name": "Coastal Stay Hotels Pty Ltd",
            "contact_person": "Sarah Mitchell (Group Operations Manager)",
            "industry": "Hospitality",
            "scope_summary": "Cloud Hotel PMS rollout across 3 properties (220 rooms total)",
            "properties": [
                {"name": "Byron Bay", "state": "NSW", "rooms": 48, "wave": "Wave 1 (Pilot)"},
                {"name": "Gold Coast", "state": "QLD", "rooms": 112, "wave": "Wave 2", "notes": "Restaurant and bar"},
                {"name": "Sydney CBD", "state": "NSW", "rooms": 60, "wave": "Wave 3"}
            ],
            "total_rooms": 220,
            "integrations": [
                "Channel Manager (Booking.com, Expedia, Airbnb)",
                "Payments (Stripe, Tyro)",
                "Accounting (Xero)",
                "Restaurant POS (Gold Coast)",
                "Door Locks (Salto)",
                "Website Booking Engine"
            ],
            "budget": {"min_aud": 150000, "max_aud": 200000, "period": "Year 1 including setup"},
            "timeline": {"start": "Early November 2026", "freeze": "Christmas - January peak", "completion": "Mid-2027"},
            "key_requirements": ["Mobile housekeeping", "Australia data hosting", "GST compliance", "24/7 hypercare support"]
        },
        "raw_transcript": (
            "Sarah (Client): Um, yeah, so like right now... uh, each hotel has its own server in the back office. "
            "And last month the Gold Coast server just died, y'know? And our front desk had to, like, write guest check-ins on paper sheets for five hours.\n"
            "Presale Lead: That sounds painful. What about your channel distribution?\n"
            "Sarah (Client): Oh gosh, don't get me started. Our staff literally log in to Booking.com, then Expedia, then Airbnb one by one to change prices. "
            "We had two awful double bookings over New Year's because the calendar sync lagged."
        ),
        "clean_transcript": (
            "Sarah Mitchell (Client): Currently, each property operates an isolated on-premise server. Last month, our Gold Coast server suffered an outage, forcing front desk personnel to process manual paper check-ins for five hours.\n"
            "Presale Lead: That creates significant operational risk. How are you currently managing online channel distribution?\n"
            "Sarah Mitchell (Client): It is entirely manual. Staff manually update room inventory and rates across Booking.com, Expedia, and Airbnb individually. We experienced two major double-booking incidents last peak season due to inventory sync latency."
        ),
        "missing_gaps": [
            "Specific restaurant POS vendor and API accessibility at Gold Coast",
            "Historical guest profile and reservation data migration scope (how many years of data)",
            "Salto door lock server deployment model (Salto Space on-prem vs Salto KS cloud)",
            "Detailed user role permissions matrix across property managers vs head office"
        ],
        "follow_up_questions": [
            "Which restaurant POS software version is running at the Gold Coast property, and do you have active API access documentation?",
            "How many years of historical guest folios and future reservations need to be migrated from the legacy 2013 PMS?",
            "Are your Salto door locks currently managed on an on-premise encoder server or via the Salto KS cloud platform?",
            "What specific financial metrics and KPIs does head office require on the unified group dashboard?"
        ],
        "qualification_eval": (
            "### Presaleee Qualification Assessment\n"
            "- **Qualification Score**: 92/100 (Status: APPROVED - High Priority Deal)\n"
            "- **Budget Fit**: High. Client budget (AUD $150k-$200k) directly aligns with modeled Year 1 TCO ($173,697 ex GST).\n"
            "- **Authority**: Strong. Sarah Mitchell is Group Operations Manager with direct access to CTO/Owner for commercial sign-off.\n"
            "- **Need Urgency**: Critical. Legacy PMS vendor retiring support in 2027; frequent server crashes and double-booking penalties.\n"
            "- **Timeline Feasibility**: Realistic. 26-week phased rollout starting Nov 2026, Byron Bay pilot avoids Christmas peak.\n"
            "- **Key Risks**: Data migration fidelity from 2013 legacy database; POS hardware compatibility at Gold Coast.\n"
            "- **Next Step**: Deliver formal Proposal & Pricing Schedule; arrange technical workshop on POS and door lock APIs."
        ),
        "why_solution_points": (
            "### Why TestPulse / Cloud PMS is the Right Solution for Coastal Stay Hotels:\n"
            "1. **Elimination of Single Points of Failure**: Centralized cloud SaaS replaces fragile on-premise servers across Byron Bay, Gold Coast, and Sydney, providing 99.9% SLA uptime and zero server maintenance overhead.\n"
            "2. **Real-time Two-way Channel Automation**: Direct two-way synchronization with Booking.com, Expedia, and Airbnb updates rates and availability in under 3 seconds, permanently preventing costly double bookings.\n"
            "3. **Operational Labor Reduction**: Native mobile housekeeping updates room turnover status instantly to front desk; automated night audit reduces daily reconciliation from 2 hours to under 5 minutes.\n"
            "4. **Unified HQ Visibility**: Consolidated multi-property executive dashboard provides head office with live RevPAR, ADR, and occupancy metrics across all 220 rooms without manual spreadsheets.\n"
            "5. **De-risked Phased Migration**: Structured 26-week wave rollout starts with a Byron Bay pilot in November and freezes during the Dec-Jan holiday peak, protecting hotel revenues during maximum occupancy."
        ),
        "tech_summary": (
            "### Technical Deep Dive Summary\n"
            "- **Architecture**: Multi-tenant AWS Sydney (ap-southeast-2) with tenant data isolation; PostgreSQL transactional database with Redis cache.\n"
            "- **Integration Protocols**: REST APIs with webhooks for Stripe, Xero, and Salto KS; custom socket bridge for on-premise legacy POS if required.\n"
            "- **Constraints**: All guest PII and PCI-DSS tokenized card data must reside within Australian borders.\n"
            "- **Assumptions**: Client provides CSV/SQL dump of legacy 2013 PMS 4 weeks prior to Wave 1 pilot.\n"
            "- **Outstanding Questions**: Confirmation of Salto firmware version across Byron Bay and Sydney doors."
        )
    },
    {
        "domain": "FinTech & Payment Orchestration",
        "client": "NovaPay Global Financial",
        "rfp_text": (
            "Client: NovaPay Global Financial | Contact: David Vance (Head of Core Banking)\n"
            "Current setup: Multi-provider payment gateway processing $40M monthly volume across US, UK, and Australia.\n"
            "Pain points: Transaction routing failures causing 2.4% false decline rates, lack of smart retry logic, disjointed chargeback reconciliation, vendor lock-in with primary acquirer.\n"
            "Requirements: Unified payment orchestration platform with dynamic routing, automatic card tokenization (vault), 3DS2 frictionless authentication, automated settlement reconciliation.\n"
            "Integrations: Stripe, Adyen, Checkout.com, Worldpay, Salesforce Financial Services Cloud, Snowflake BI warehouse.\n"
            "Budget: $80,000 - $120,000 annual SaaS subscription + $60,000 implementation.\n"
            "Timeline: RFP close end of Q3; pilot rollout in UK by Q1 2027; global completion Q2 2027."
        ),
        "intake_json": {
            "client_name": "NovaPay Global Financial",
            "contact_person": "David Vance (Head of Core Banking)",
            "industry": "FinTech / Payments",
            "scope_summary": "Global Multi-Acquirer Payment Orchestration & Smart Routing Engine",
            "transaction_volume": "$40M monthly volume across US, UK, Australia",
            "integrations": ["Stripe", "Adyen", "Checkout.com", "Worldpay", "Salesforce FSC", "Snowflake"],
            "budget": {"subscription_aud": 100000, "services_aud": 60000, "total_budget": 160000},
            "timeline": {"pilot_rollout": "Q1 2027 (UK)", "global_go_live": "Q2 2027"},
            "key_requirements": ["Smart dynamic routing", "Card token vault", "3DS2 compliance", "Automated reconciliation"]
        },
        "raw_transcript": (
            "David (Client): Uh, our biggest bleeding wound is false declines. Right now, when Worldpay has latency spikes, "
            "transactions just drop dead. We lose like... maybe $800,000 a month in GMV just from dumb authorization failures.\n"
            "Presale Lead: Does your current stack have fallback routing?\n"
            "David (Client): No, zero fallback. It's hardcoded. We need smart cascading—if Adyen declines with a soft 05, "
            "immediately retry via Checkout.com with zero customer friction."
        ),
        "clean_transcript": (
            "David Vance (Client): Our most acute operational bottleneck is false declines. During provider latency spikes, transactions fail without retry mechanisms, resulting in an estimated $800,000 monthly loss in Gross Merchandise Value.\n"
            "Presale Lead: Does your existing infrastructure support dynamic fallback routing?\n"
            "David Vance (Client): No, transaction routing is currently static and hardcoded. We require algorithmic cascading routing—if an authorization receives a soft decline from Adyen, the engine must immediately failover to Checkout.com seamlessly."
        ),
        "missing_gaps": [
            "Current PCI-DSS Level 1 audit certificate ownership (who holds network tokens)",
            "Detailed breakdown of international vs domestic card split across currencies (USD, GBP, AUD)",
            "Batch vs real-time settlement ingestion requirements for Snowflake reporting",
            "Desired latency threshold for 3DS2 biometric authentication callbacks"
        ],
        "follow_up_questions": [
            "Does NovaPay currently host its own PCI-DSS Level 1 token vault, or do you expect the orchestration platform to custody tokenized PANs?",
            "What is the exact transaction volume distribution between domestic interchange and cross-border payment rails?",
            "What is the required API latency SLA for end-to-end authorization routing (e.g., under 400ms)?",
            "How frequently must dispute and chargeback status webhooks sync into Salesforce Financial Services Cloud?"
        ],
        "qualification_eval": (
            "### Presaleee Qualification Assessment\n"
            "- **Qualification Score**: 95/100 (Status: APPROVED - Enterprise Strategic Deal)\n"
            "- **Budget Fit**: Excellent. $160k budget easily accommodates Tier-1 enterprise routing license and implementation.\n"
            "- **Authority**: Strong. Head of Core Banking has signing mandate backed by Chief Risk Officer.\n"
            "- **Need Urgency**: Severe. Recovering $800k monthly lost GMV creates immediate 6x ROI within 90 days.\n"
            "- **Timeline Feasibility**: 6-month timeline to UK pilot is well within standard deployment benchmarks.\n"
            "- **Key Risks**: Complex cryptographic key exchange for network token migration from legacy gateways.\n"
            "- **Next Step**: Schedule Technical Architecture Deep Dive on Network Token Vault migration."
        ),
        "why_solution_points": (
            "### Why Our Payment Orchestration Platform is the Ideal Solution for NovaPay:\n"
            "1. **Intelligent Cascading Routing**: Recovers up to 4.2% of previously lost authorizations by dynamically failing over soft declines to secondary acquiring banks within 350 milliseconds.\n"
            "2. **Agnostic Token Vault**: Decouples payment credentials from individual processors, eliminating vendor lock-in and empowering NovaPay to route volume to the lowest-cost interchange provider.\n"
            "3. **Frictionless 3DS2 Engine**: Uses risk-based biometric scoring to maximize frictionless exemptions, lifting mobile checkout conversion rates by 12%.\n"
            "4. **Automated End-of-Day Settlement**: Reconciles processing fees, interchange costs, and chargebacks directly into Snowflake and Salesforce FSC, reducing manual finance overhead by 80%."
        ),
        "tech_summary": (
            "### Technical Deep Dive Summary\n"
            "- **Architecture**: Active-Active multi-region deployment (AWS us-east-1 and eu-west-1) with sub-100ms internal latency.\n"
            "- **Compliance**: Certified PCI-DSS Level 1 Service Provider; hardware security module (HSM) encryption.\n"
            "- **Constraints**: Zero downtime zero data-loss failover; strict idempotency keys on every transaction POST.\n"
            "- **Assumptions**: Acquirers support API v3 network tokenization rails.\n"
            "- **Outstanding Questions**: Confirmation of NovaPay's Webhook retry backoff policy."
        )
    },
    {
        "domain": "Healthcare & Telehealth",
        "client": "CarePath Medical Network",
        "rfp_text": (
            "Client: CarePath Medical Network | Contact: Dr. Elena Rostova (Chief Medical Information Officer)\n"
            "Properties: 18 regional outpatient clinics, 240 physicians, 85,000 active patient records.\n"
            "Current setup: Fragmented legacy client-server EMR (EHR) installed 2011; doctors dictate notes on dictaphones, medical records scanned manually.\n"
            "Pain points: Doctor burnout from 3+ hours daily documentation, no patient self-scheduling, siloed lab result integrations, patient data breach compliance vulnerability.\n"
            "Requirements: Modern cloud EHR/EMR, ambient AI clinical scribe, HIPAA & HL7 FHIR v4 interoperability, tele-health video consults, patient mobile portal.\n"
            "Integrations: Epic Health grid, Quest Diagnostics lab feed, Cerner pharmacy hub, Twilio video, Stripe copayments.\n"
            "Budget: $180,000 - $250,000 Year 1.\n"
            "Timeline: Phased clinic rollout starting Q1 2027; full completion within 9 months."
        ),
        "intake_json": {
            "client_name": "CarePath Medical Network",
            "contact_person": "Dr. Elena Rostova (CMIO)",
            "industry": "Healthcare & Telehealth",
            "scope_summary": "Cloud EHR Modernization with Ambient AI Clinical Scribing across 18 Clinics",
            "scale": "18 outpatient clinics, 240 clinicians, 85k active patient charts",
            "integrations": ["Epic Health", "Quest Diagnostics", "Cerner Pharmacy", "Twilio Video", "Stripe Healthcare"],
            "budget": {"min_usd": 180000, "max_usd": 250000, "currency": "USD"},
            "timeline": {"start": "Q1 2027", "duration_months": 9},
            "key_requirements": ["Ambient AI scribe", "HL7 FHIR v4", "HIPAA BAA", "Patient mobile app", "Telehealth video"]
        },
        "raw_transcript": (
            "Dr. Elena: Our doctors are drowning. They spend 2 to 3 hours every single night doing pajama charting because our EMR is so clunky. "
            "Two senior pediatricians quit last month purely due to documentation burnout.\n"
            "Presale Lead: How are lab results currently delivered into patient charts?\n"
            "Dr. Elena: Fax! Literally PDF faxes that nurses have to manually scan and upload. It's embarrassing and dangerous for patient care."
        ),
        "clean_transcript": (
            "Dr. Elena Rostova (Client): Our clinicians face severe administrative burden, spending 2 to 3 hours nightly on post-shift charting due to legacy EMR inefficiencies. This has directly driven physician turnover.\n"
            "Presale Lead: How are external lab diagnostic results currently ingested into clinical charts?\n"
            "Dr. Elena Rostova (Client): Diagnostic reports are received via manual PDF fax transmissions requiring physical scanning and manual tagging by nursing staff, introducing clinical turnaround latency."
        ),
        "missing_gaps": [
            "Legacy EMR database schema export capability (MS SQL vs proprietary binary format)",
            "State medical board regulations on electronic prescription of controlled substances (EPCS)",
            "Single Sign-On (SSO) identity provider (Okta, Azure AD, Imprivata badge tap)",
            "Required retention period for medical audit logs (e.g., 7 years vs 10 years)"
        ],
        "follow_up_questions": [
            "Does CarePath's legacy EMR database support direct HL7 CCDA export for patient history migration?",
            "Are physicians using Imprivata badge-tap hardware for clinical workstation authentication in exam rooms?",
            "What specific EHR integration standards are required for state prescription monitoring programs (PMP)?",
            "How many telehealth concurrent video consult sessions are anticipated across the 18 clinics?"
        ],
        "qualification_eval": (
            "### Presaleee Qualification Assessment\n"
            "- **Qualification Score**: 94/100 (Status: APPROVED - Enterprise Healthcare Lead)\n"
            "- **Budget Fit**: High. Budget of $180k-$250k covers multi-clinic licensing and ambient AI voice modules.\n"
            "- **Authority**: Verified. Dr. Rostova holds CMIO veto authority with unanimous board support.\n"
            "- **Need Urgency**: Extreme. Physician retention crisis and clinical risk from manual faxed lab results.\n"
            "- **Timeline Feasibility**: 9-month clinic-by-clinic wave rollout allows thorough clinical staff training.\n"
            "- **Key Risks**: HIPAA Business Associate Agreement (BAA) execution; historical chart migration accuracy.\n"
            "- **Next Step**: Prepare HIPAA Security Architecture overview and schedule ambient AI demo session."
        ),
        "why_solution_points": (
            "### Why CarePath Cloud EHR is the Definitive Solution:\n"
            "1. **Ambient AI Clinical Documentation**: Listens to patient-doctor dialogue in real time and drafts structured SOAP notes, returning 2+ hours daily to every physician and stopping pajama charting.\n"
            "2. **Automated HL7/FHIR Diagnostic Ingestion**: Connects directly to Quest Diagnostics and Cerner, populating lab and pharmacy orders digitally in seconds and completely eliminating paper faxes.\n"
            "3. **Unified Patient Engagement App**: Mobile scheduling, digital intake forms, and integrated Twilio telehealth video reduce clinic no-show rates by 35%.\n"
            "4. **HIPAA & SOC2 Compliant Security**: End-to-end data encryption in transit and at rest with automated audit trails meets all healthcare regulatory requirements out of the box."
        ),
        "tech_summary": (
            "### Technical Deep Dive Summary\n"
            "- **Architecture**: HIPAA-compliant AWS GovCloud / dedicated VPC with encrypted KMS keys.\n"
            "- **Standards**: HL7 FHIR v4 APIs, SMART-on-FHIR authorization, DICOM image viewer integration.\n"
            "- **Constraints**: Zero patient data training on public models; strict role-based clinical access controls.\n"
            "- **Assumptions**: Clinic network bandwidth satisfies minimum 25 Mbps upload for HD telehealth consults.\n"
            "- **Outstanding Questions**: Validation of Quest Diagnostics lab test compendium interface codes."
        )
    },
    {
        "domain": "Logistics & Supply Chain",
        "client": "Apex Freight Logistics",
        "rfp_text": (
            "Client: Apex Freight Logistics | Contact: Marcus Brody (VP Fleet Operations)\n"
            "Fleet: 320 semi-trucks, 6 central cross-dock distribution hubs across North America.\n"
            "Current setup: Legacy AS/400 dispatch system with phone/radio driver check-ins.\n"
            "Pain points: Empty backhaul miles running at 28%, delayed proof-of-delivery (POD) scanning taking 5 days to invoice, zero real-time GPS tracking for retail clients.\n"
            "Requirements: Cloud TMS (Transportation Management System), driver mobile app with OCR POD scanning, dynamic AI route optimization, EDI 204/214/210 automation.\n"
            "Integrations: Geotab ELD telematics, SAP ERP, EDI broker, DAT freight load board.\n"
            "Budget: $130,000 - $180,000 Year 1.\n"
            "Timeline: Complete pilot on 50 trucks in 90 days; full fleet live in 6 months."
        ),
        "intake_json": {
            "client_name": "Apex Freight Logistics",
            "contact_person": "Marcus Brody (VP Fleet Operations)",
            "industry": "Logistics & Fleet Management",
            "scope_summary": "Cloud TMS & AI Route Optimization Deployment across 320 Fleet Trucks",
            "scale": "320 semi-trucks, 6 distribution cross-docks",
            "integrations": ["Geotab ELD", "SAP ERP", "EDI 204/214/210", "DAT Load Board"],
            "budget": {"min_usd": 130000, "max_usd": 180000, "currency": "USD"},
            "timeline": {"pilot_duration": "90 days (50 trucks)", "full_rollout": "6 months"},
            "key_requirements": ["Driver OCR POD app", "AI dynamic route optimization", "Real-time Geotab GPS sync"]
        ),
        "raw_transcript": (
            "Marcus: Our empty miles are killing our gross margins. 28% of our return trips are deadhead runs with empty trailers because dispatchers are juggling spreadsheets and phone calls.\n"
            "Presale Lead: How fast can you invoice clients currently?\n"
            "Marcus: It takes 4 to 6 days just to get a signed bill of lading back from drivers so accounting can type it into SAP. Our DSO is through the roof."
        ),
        "clean_transcript": (
            "Marcus Brody (Client): Deadhead mileage is severely eroding profitability, with 28% of return legs running with empty trailers due to manual spreadsheet dispatching.\n"
            "Presale Lead: What is your current order-to-cash turnaround for proof-of-delivery billing?\n"
            "Marcus Brody (Client): Invoice generation requires 4 to 6 business days while physical bills of lading are mailed and transcribed into SAP, significantly inflating Days Sales Outstanding (DSO)."
        ),
        "missing_gaps": [
            "Geotab telematics API tier and streaming frequency limits",
            "Custom SAP IDoc interfaces vs direct RFC connection protocols",
            "Driver mobile device fleet type (company-issued tablets vs BYOD smartphones)",
            "Specific SLA terms for EDI 214 shipment status exception alerts"
        ],
        "follow_up_questions": [
            "What specific EDI communication protocol does your team use (AS2, FTP/SFTP, or managed VAN)?",
            "Are driver mobile devices standardized on Android enterprise hardware or heterogeneous personal smartphones?",
            "What criteria determine route optimization priorities (fuel minimization, driver HOS limits, or strict delivery windows)?",
            "What version of SAP ERP is running, and are standardized IDoc connectors currently licensed?"
        ],
        "qualification_eval": (
            "### Presaleee Qualification Assessment\n"
            "- **Qualification Score**: 91/100 (Status: APPROVED - High Impact Logistics Deal)\n"
            "- **Budget Fit**: Strong. Budget of $130k-$180k aligns with fleet tier licensing and telematics adapters.\n"
            "- **Authority**: Validated. VP Fleet Operations commands direct operational capital allocation.\n"
            "- **Need Urgency**: High. Reducing 28% deadhead miles directly pays for the entire software contract in 60 days.\n"
            "- **Timeline Feasibility**: 90-day pilot on 50 trucks provides rapid proof-of-concept validation.\n"
            "- **Key Risks**: Driver change management and adoption of mobile OCR scanning workflows.\n"
            "- **Next Step**: Provide Geotab Integration Whitepaper and schedule interactive TMS dispatch demo."
        ),
        "why_solution_points": (
            "### Why Cloud TMS is the Right Solution for Apex Freight:\n"
            "1. **AI Route & Backhaul Optimization**: Matches empty return trailers with profitable DAT freight loads in real time, cutting deadhead miles from 28% down to under 12%.\n"
            "2. **Instant Mobile POD Capture**: Drivers scan bills of lading via camera OCR; data automatically creates verified invoices in SAP within 2 minutes of delivery, slashing DSO by 5 days.\n"
            "3. **Native Geotab ELD Streaming**: Ingests vehicle telematics, engine diagnostics, and Hours of Service (HOS) data continuously to ensure DOT compliance without manual driver check-in calls.\n"
            "4. **Automated B2B EDI Exchange**: Automatically ingests EDI 204 load tenders and dispatches EDI 214 tracking updates, meeting tier-1 retail shipper requirements seamlessly."
        ),
        "tech_summary": (
            "### Technical Deep Dive Summary\n"
            "- **Architecture**: Event-driven serverless architecture using Kafka streaming for fleet GPS tracking.\n"
            "- **Mobile**: Native iOS and Android application with offline SQLite caching for dead-zone rural corridors.\n"
            "- **Constraints**: Real-time vehicle location latency under 10 seconds; strict sub-second geofence triggers.\n"
            "- **Assumptions**: Geotab hardware installed and provisioned across all 320 fleet trucks prior to phase 2.\n"
            "- **Outstanding Questions**: Confirmation of SAP ECC 6.0 vs S/4HANA migration timeline."
        )
    }
]


def create_instruction_examples() -> List[Dict[str, Any]]:
    examples = []
    for scenario in DOMAIN_SCENARIOS:
        client = scenario["client"]
        rfp = scenario["rfp_text"]
        intake_json = scenario["intake_json"]
        raw_tr = scenario["raw_transcript"]
        clean_tr = scenario["clean_transcript"]
        gaps = scenario["missing_gaps"]
        questions = scenario["follow_up_questions"]
        qual = scenario["qualification_eval"]
        why = scenario["why_solution_points"]
        tech = scenario["tech_summary"]

        # TASK 1: Structured AI Intake (JSON Output)
        examples.append({
            "task": "structured_intake",
            "messages": [
                {"role": "system", "content": SYS_PROMPTS["structured_intake"]},
                {"role": "user", "content": f"Extract all quantitative and qualitative parameters from this inquiry and return STRICT JSON:\n\n{rfp}"},
                {"role": "assistant", "content": json.dumps(intake_json, indent=2, ensure_ascii=False)}
            ]
        })

        # TASK 2: Clean Transcript
        examples.append({
            "task": "clean_transcript",
            "messages": [
                {"role": "system", "content": SYS_PROMPTS["clean_transcript"]},
                {"role": "user", "content": f"Clean and structure this raw meeting transcript, removing filler words and normalizing technical terms:\n\n{raw_tr}"},
                {"role": "assistant", "content": clean_tr}
            ]
        })

        # TASK 3: Gap Analysis & Proactive Question Generation
        gap_response = (
            f"### Proposal Gap Analysis for {client}\n"
            f"Based on the discovery discussion and enterprise proposal requirements, the following critical data points are MISSING:\n"
            + "\n".join([f"- **Missing**: {g}" for g in gaps])
            + f"\n\n### Suggested Proactive Follow-up Questions for Next Discovery Session:\n"
            + "\n".join([f"{i+1}. {q}" for i, q in enumerate(questions)])
        )
        examples.append({
            "task": "gap_analysis",
            "messages": [
                {"role": "system", "content": SYS_PROMPTS["gap_analysis"]},
                {"role": "user", "content": f"Analyze this sales transcript and identify missing information needed for proposal estimation. Generate proactive discovery questions:\n\n{clean_tr}"},
                {"role": "assistant", "content": gap_response}
            ]
        })

        # TASK 4: Qualification Engine (BANT)
        examples.append({
            "task": "qualification",
            "messages": [
                {"role": "system", "content": SYS_PROMPTS["qualification"]},
                {"role": "user", "content": f"Evaluate this lead for {client} using the BANT framework and provide a Qualification Score and recommendation:\n\n{rfp}"},
                {"role": "assistant", "content": qual}
            ]
        })

        # TASK 5: Proposal Builder - "Why This Solution"
        examples.append({
            "task": "why_solution",
            "messages": [
                {"role": "system", "content": SYS_PROMPTS["why_solution"]},
                {"role": "user", "content": f"Synthesize customer pain points and formulate a high-impact 'Why This Solution' executive brief for the proposal for {client}:\n\n{rfp}"},
                {"role": "assistant", "content": why}
            ]
        })

        # TASK 6: Technical Deep Dive Summary
        examples.append({
            "task": "technical_summary",
            "messages": [
                {"role": "system", "content": SYS_PROMPTS["technical_summary"]},
                {"role": "user", "content": f"Synthesize a Technical Deep Dive Summary covering architecture, decisions, constraints, assumptions, and risks for {client}:\n\n{clean_tr}"},
                {"role": "assistant", "content": tech}
            ]
        })

    return examples


def build_full_dataset(output_dir: str = "data_v2"):
    os.makedirs(output_dir, exist_ok=True)
    base_examples = create_instruction_examples()

    augmented_train = []
    augmented_val = []

    # Scale to ~2,400 balanced training examples
    for _ in range(80):
        for ex in base_examples:
            augmented_train.append(ex)

    for _ in range(20):
        for ex in base_examples:
            augmented_val.append(ex)

    random.seed(42)
    random.shuffle(augmented_train)
    random.shuffle(augmented_val)

    train_file = os.path.join(output_dir, "train_v2.jsonl")
    val_file = os.path.join(output_dir, "val_v2.jsonl")

    with open(train_file, "w", encoding="utf-8") as f:
        for ex in augmented_train:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    with open(val_file, "w", encoding="utf-8") as f:
        for ex in augmented_val:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"Generated V2 Dataset successfully!")
    print(f"- Train Samples: {len(augmented_train)} ({train_file})")
    print(f"- Val Samples:   {len(augmented_val)} ({val_file})")


if __name__ == "__main__":
    build_full_dataset()

