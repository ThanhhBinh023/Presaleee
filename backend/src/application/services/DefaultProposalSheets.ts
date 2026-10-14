import { STANDARD_PROPOSAL_SHEETS } from '../../domain/entities/Proposal.js';

export function getDefaultProposalSheets(projectTitle: string, currency: string = 'USD'): Array<{
  sheetName: string;
  sheetOrder: number;
  sheetData: Record<string, any>;
  aiGenerated: boolean;
}> {
  return [
    {
      sheetName: 'Overview',
      sheetOrder: 1,
      aiGenerated: false,
      sheetData: {
        title: 'Executive Summary & Project Overview',
        projectName: projectTitle,
        clientName: 'Enterprise Client',
        date: new Date().toISOString().split('T')[0],
        executiveSummary: `This proposal outlines the technical solution, delivery roadmap, and commercial terms for the ${projectTitle} initiative. Presaleee engineering team provides an end-to-end IT service delivery model designed for high scalability, compliance, and enterprise velocity.`,
        keyObjectives: [
          'Modernize legacy workflow with cloud-native microservices architecture',
          'Embed intelligent AI Copilot for automated decision-making and operational efficiency',
          'Ensure 99.95% uptime and bank-grade data security with role-based access control',
          'Accelerate time-to-market with 2-week agile sprint delivery cycles'
        ],
        deliveryMethodology: 'Agile Scrum (2-week sprint cadence with bi-weekly demo & sprint review)',
        currency
      }
    },
    {
      sheetName: 'Scope of Work',
      sheetOrder: 2,
      aiGenerated: false,
      sheetData: {
        title: 'Scope of Work (WBS & Functional Specifications)',
        modules: [
          { wbs: '1.0', module: 'Authentication & Access Control', feature: 'SSO, MFA, Role-based Access Control (RBAC), Session Audit', complexity: 'Medium', priority: 'Must Have', estimatedDays: 12 },
          { wbs: '2.0', module: 'Core Workflow & Transaction Engine', feature: 'End-to-end business process execution, state transitions, validation', complexity: 'High', priority: 'Must Have', estimatedDays: 28 },
          { wbs: '3.0', module: 'AI Copilot & RAG Pipeline', feature: 'Vector search (pgvector), document ingestion, intelligent auto-completion', complexity: 'High', priority: 'Must Have', estimatedDays: 24 },
          { wbs: '4.0', module: 'Reporting & Analytics Dashboard', feature: 'Real-time telemetry, customizable KPI widgets, Excel/PDF export', complexity: 'Medium', priority: 'Should Have', estimatedDays: 16 },
          { wbs: '5.0', module: 'Integration Gateway', feature: 'RESTful API endpoints, Webhooks, 3rd party payment & CRM connectors', complexity: 'Medium', priority: 'Must Have', estimatedDays: 18 }
        ]
      }
    },
    {
      sheetName: 'Architecture & Tech Stack',
      sheetOrder: 3,
      aiGenerated: false,
      sheetData: {
        title: 'Technical Architecture & Non-Functional Requirements',
        stack: [
          { layer: 'Frontend Layer', technology: 'React 19, TypeScript, Vite, TailwindCSS', rationale: 'High performance client-side rendering with strict static typing' },
          { layer: 'API & Orchestration', technology: 'Node.js, Express, Clean Architecture, TypeScript', rationale: 'Maintainable, decoupled domain logic and high concurrency throughput' },
          { layer: 'AI & Inference Engine', technology: 'Python FastAPI, Qwen1.5-4B LoRA, Gemini Cloud Embedding', rationale: 'Hybrid edge-cloud AI architecture with domain-specific fine-tuning' },
          { layer: 'Primary Database & Vector', technology: 'PostgreSQL 16 + pgvector, Supabase', rationale: 'ACID transactional guarantee coupled with native HNSW vector similarity search' },
          { layer: 'Caching & Background Job', technology: 'Redis, BullMQ', rationale: 'Low-latency distributed cache and resilient async background queues' },
          { layer: 'Cloud Infrastructure & CI/CD', technology: 'AWS / Docker, GitHub Actions, Terraform', rationale: 'Immutable container deployment with automated lint, test, and build pipelines' }
        ],
        nonFunctionalRequirements: [
          { category: 'Performance', requirement: 'P95 API latency under 250ms for core endpoints; AI stream TTFT under 800ms' },
          { category: 'Availability', requirement: '99.9% uptime SLA with active-passive multi-AZ database replication' },
          { category: 'Security', requirement: 'TLS 1.3 in transit, AES-256 at rest, OWASP Top 10 compliance audit' },
          { category: 'Scalability', requirement: 'Horizontal auto-scaling supporting up to 5,000 concurrent active users' }
        ]
      }
    },
    {
      sheetName: 'Timeline & Milestones',
      sheetOrder: 4,
      aiGenerated: false,
      sheetData: {
        title: 'Implementation Timeline & Milestone Roadmap',
        totalWeeks: 16,
        milestones: [
          { phase: 'Phase 1', milestone: 'Discovery, UI/UX & Architecture Design', durationWeeks: 3, startWeek: 'W1', endWeek: 'W3', deliverables: 'SRS Document, Figma Clickable Prototype, Architecture Design Blueprint' },
          { phase: 'Phase 2', milestone: 'Core Foundation & Database Setup', durationWeeks: 3, startWeek: 'W4', endWeek: 'W6', deliverables: 'DB Migrations, Auth Service, Basic CRUD APIs, CI/CD Pipeline' },
          { phase: 'Phase 3', milestone: 'Business Logic & AI Engine Integration', durationWeeks: 5, startWeek: 'W7', endWeek: 'W11', deliverables: 'Core Feature Modules, Vector Search RAG, LLM Integration' },
          { phase: 'Phase 4', milestone: 'Testing, Security Hardening & UAT', durationWeeks: 3, startWeek: 'W12', endWeek: 'W14', deliverables: 'End-to-End Test Suite, Penetration Testing Report, Staging Deployment' },
          { phase: 'Phase 5', milestone: 'Production Cutover & Hypercare', durationWeeks: 2, startWeek: 'W15', endWeek: 'W16', deliverables: 'Production Go-Live, Admin Training, 2-week 24/7 hypercare support' }
        ]
      }
    },
    {
      sheetName: 'Team & Rate Cards',
      sheetOrder: 5,
      aiGenerated: false,
      sheetData: {
        title: 'Team Composition & Role Allocation',
        roles: [
          { role: 'Project Manager (PM)', level: 'Senior', allocation: '50%', manMonths: 2.0, monthlyRate: 4500, totalCost: 9000 },
          { role: 'Solution Architect (SA)', level: 'Principal', allocation: '50%', manMonths: 2.0, monthlyRate: 6000, totalCost: 12000 },
          { role: 'Senior Fullstack Engineer', level: 'Senior', allocation: '100%', manMonths: 4.0, monthlyRate: 4000, totalCost: 16000 },
          { role: 'AI / Backend Engineer', level: 'Senior', allocation: '100%', manMonths: 4.0, monthlyRate: 4200, totalCost: 16800 },
          { role: 'Frontend Engineer', level: 'Mid', allocation: '100%', manMonths: 4.0, monthlyRate: 3000, totalCost: 12000 },
          { role: 'QA & Automation Engineer', level: 'Mid', allocation: '100%', manMonths: 3.0, monthlyRate: 2500, totalCost: 7500 }
        ],
        totalEffortManMonths: 19.0,
        totalTeamCost: 73300
      }
    },
    {
      sheetName: 'Pricing & Quotation',
      sheetOrder: 6,
      aiGenerated: false,
      sheetData: {
        title: 'Commercial Quotation & Payment Milestones',
        currency,
        items: [
          { milestone: 'M1: Project Initiation & Architecture Sign-off', percentage: 20, amount: 14660, trigger: 'Contract signing & Architecture Blueprint approval' },
          { milestone: 'M2: Sprint Review & Alpha Release (Core Features)', percentage: 30, amount: 21990, trigger: 'Core Engine demo & API integration complete' },
          { milestone: 'M3: Beta Release & User Acceptance Testing (UAT)', percentage: 30, amount: 21990, trigger: 'UAT testing sign-off in staging environment' },
          { milestone: 'M4: Production Deployment & Final Acceptance', percentage: 20, amount: 14660, trigger: 'Successful production deployment and warranty handover' }
        ],
        subtotal: 73300,
        taxPercentage: 10,
        taxAmount: 7330,
        grandTotal: 80630
      }
    },
    {
      sheetName: 'Assumptions & Dependencies',
      sheetOrder: 7,
      aiGenerated: false,
      sheetData: {
        title: 'Project Assumptions & Client Dependencies',
        items: [
          { id: 'ASM-01', category: 'Client Dependency', description: 'Client designates single Point of Contact (Product Owner) with authority to approve sprint deliverables within 3 business days', impact: 'Medium' },
          { id: 'ASM-02', category: 'Infrastructure', description: 'Client provides required cloud infrastructure accounts (AWS/GCP/Azure) and API keys 1 week prior to Sprint 1 start', impact: 'High' },
          { id: 'ASM-03', category: 'Integration', description: 'Third-party APIs and sandbox environments are provided with complete OpenAPI/Swagger documentation', impact: 'High' },
          { id: 'ASM-04', category: 'Scope Governance', description: 'Any feature request outside the approved Scope of Work (Sheet 2) follows the formal Change Request (CR) process', impact: 'Medium' }
        ]
      }
    },
    {
      sheetName: 'Risk Management (RAID)',
      sheetOrder: 8,
      aiGenerated: false,
      sheetData: {
        title: 'Risk Management & Mitigation Strategy (RAID Log)',
        risks: [
          { id: 'RSK-01', risk: 'Delays in 3rd-party API Sandbox access', probability: 'Medium', impact: 'High', score: 12, mitigation: 'Implement mock server adapter layer in Sprint 1 to decouple backend development from external vendor schedule' },
          { id: 'RSK-02', risk: 'LLM response latency or rate limits during peak usage', probability: 'Low', impact: 'Medium', score: 6, mitigation: 'Implement semantic vector caching and asynchronous background streaming with fallback prompts' },
          { id: 'RSK-03', risk: 'Scope creep during UAT sprint', probability: 'Medium', impact: 'Medium', score: 9, mitigation: 'Strict sign-off criteria tied to Sheet 2 WBS acceptance document; backlog items deferred to Phase 2' }
        ]
      }
    },
    {
      sheetName: 'SLA & Maintenance',
      sheetOrder: 9,
      aiGenerated: false,
      sheetData: {
        title: 'Service Level Agreement (SLA) & Warranty Support',
        warrantyMonths: 3,
        warrantyTerms: 'Includes critical bug fixes, security patch updates, and minor operational adjustments at no additional charge.',
        incidentMatrix: [
          { priority: 'P1 - Critical', description: 'Production outage or core business workflow completely blocked', responseTime: '< 1 Hour', resolutionTarget: '< 4 Hours' },
          { priority: 'P2 - High', description: 'Major feature degraded without immediate workaround', responseTime: '< 2 Hours', resolutionTarget: '< 8 Hours' },
          { priority: 'P3 - Medium', description: 'Minor bug with acceptable business workaround available', responseTime: '< 4 Hours', resolutionTarget: '< 24 Hours' },
          { priority: 'P4 - Low', description: 'Cosmetic UI glitch or minor documentation discrepancy', responseTime: '< 8 Hours', resolutionTarget: 'Next Sprint Release' }
        ]
      }
    },
    {
      sheetName: 'Appendices & Case Studies',
      sheetOrder: 10,
      aiGenerated: false,
      sheetData: {
        title: 'Relevant Case Studies & Corporate Credentials',
        caseStudies: [
          { client: 'FinTech Enterprise Banking App', domain: 'Banking & Financial Services', stack: 'React, Node.js, PostgreSQL, Biometric Auth', outcome: 'Delivered in 18 weeks, 4.8-star App Store rating, 1.2M active users' },
          { client: 'Omnichannel Retail & Warehouse POS', domain: 'Retail & E-commerce', stack: 'Next.js, FastAPI, pgvector, Stripe', outcome: 'Reduced checkout wait time by 40%, processed $80M GMV annually' },
          { client: 'Logistics Real-Time Telemetry Platform', domain: 'Supply Chain & Logistics', stack: 'Vue 3, Go, Kafka, TimescaleDB', outcome: 'Real-time GPS tracking of 5,000 fleet vehicles with 99.98% telemetry reliability' }
        ]
      }
    }
  ];
}
