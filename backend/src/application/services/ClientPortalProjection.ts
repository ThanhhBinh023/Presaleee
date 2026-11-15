/**
 * The client portal must never carry the internal cost model. Proposal sheets hold both the price
 * a client pays (grandTotal, milestone amounts) and how that price was built (rates per role, team
 * cost, infrastructure cost, contingency buffer), so the portal surface projects sheets down to the
 * first group before they leave the process — for GET, for the AI context, and for the client PDF.
 */

const REDACTED_KEYS: ReadonlySet<string> = new Set([
  'monthlyRate', 'hourlyRate', 'dailyRate', 'monthlyRateOverride', 'rateSource',
  'totalCost', 'totalTeamCost', 'teamCost', 'infrastructureCost', 'contingencyBuffer',
  'unitCost', 'internalCost', 'costPrice', 'salary', 'margin', 'marginPct',
  'trigger', 'internalNotes'
]);

// Pricing rows written before this projection existed embed a rate in prose: "5 man-months at 4500 USD per month".
const RATE_IN_PROSE = /\bat\s+[\d.,]+\s*(?:USD|VND|EUR|GBP)?\s*per\s+month/gi;

function redactStrings(value: string): string {
  return value.replace(RATE_IN_PROSE, 'priced from the internal rate card');
}

function project(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(project);
  if (typeof value === 'string') return redactStrings(value);
  if (value === null || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(key)) continue;
    output[key] = project(child);
  }
  return output;
}

export function projectSheetsForClient<T extends { sheetData: Record<string, any> }>(sheets: T[]): T[] {
  return sheets.map(sheet => ({ ...sheet, sheetData: project(sheet.sheetData ?? {}) as Record<string, any> }));
}

export function projectProposalForClient<T extends { sheets: Array<{ sheetData: Record<string, any> }> }>(proposal: T): T {
  return { ...proposal, sheets: projectSheetsForClient(proposal.sheets) };
}
