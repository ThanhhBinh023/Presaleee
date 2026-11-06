import { STANDARD_PROPOSAL_SHEETS } from '../../domain/entities/Proposal.js';

/** Neutral blank structure: proposal facts should come from the lead or reviewed user input, never sample content. */
export function getDefaultProposalSheets(projectTitle: string, currency = 'USD'): Array<{
  sheetName: string;
  sheetOrder: number;
  sheetData: Record<string, unknown>;
  aiGenerated: boolean;
}> {
  const emptyContent: Record<string, Record<string, unknown>> = {
    'Overview': { projectName: projectTitle, executiveSummary: '', keyObjectives: [], currency },
    'Scope of Work': { modules: [] },
    'Architecture & Tech Stack': { stack: [], nonFunctionalRequirements: [] },
    'Timeline & Milestones': { totalWeeks: null, milestones: [] },
    'Team & Rate Cards': { roles: [], totalEffortManMonths: null, totalTeamCost: null },
    'Pricing & Quotation': { currency, items: [], subtotal: null, taxPercentage: null, taxAmount: null, grandTotal: null },
    'Assumptions & Dependencies': { items: [] },
    'Risk Management (RAID)': { risks: [] },
    'SLA & Maintenance': { warrantyMonths: null, warrantyTerms: '', incidentMatrix: [] },
    'Appendices & Case Studies': { caseStudies: [] }
  };

  return STANDARD_PROPOSAL_SHEETS.map(sheet => ({
    sheetName: sheet.name,
    sheetOrder: sheet.order,
    sheetData: { title: sheet.title, ...(emptyContent[sheet.name] || {}) },
    aiGenerated: false
  }));
}
