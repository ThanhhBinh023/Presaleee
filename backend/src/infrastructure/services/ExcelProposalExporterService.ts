import ExcelJS from 'exceljs';
import { IExcelExporterService } from '../../domain/repositories/IExcelExporterService.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';

export class ExcelProposalExporterService implements IExcelExporterService {
  async generateProposalWorkbook(proposal: ProposalWithSheets): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Presaleee AI Platform';
    workbook.lastModifiedBy = 'Presaleee Engine';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetsMap = new Map<string, Record<string, any>>();
    for (const sheet of proposal.sheets) {
      sheetsMap.set(sheet.sheetName, sheet.sheetData || {});
    }

    // 1. Overview Sheet
    this.buildOverviewSheet(workbook, proposal, sheetsMap.get('Overview') || {});

    // 2. Scope of Work (WBS)
    this.buildScopeOfWorkSheet(workbook, sheetsMap.get('Scope of Work') || {});

    // 3. Architecture & Tech Stack
    this.buildArchitectureSheet(workbook, sheetsMap.get('Architecture & Tech Stack') || {});

    // 4. Timeline & Milestones
    this.buildTimelineSheet(workbook, sheetsMap.get('Timeline & Milestones') || {});

    // 5. Team & Rate Cards
    this.buildTeamSheet(workbook, sheetsMap.get('Team & Rate Cards') || {}, proposal.currency || 'USD');

    // 6. Pricing & Quotation
    this.buildPricingSheet(workbook, sheetsMap.get('Pricing & Quotation') || {}, proposal.currency || 'USD');

    // 7. Assumptions & Dependencies
    this.buildAssumptionsSheet(workbook, sheetsMap.get('Assumptions & Dependencies') || {});

    // 8. Risk Management (RAID)
    this.buildRaidSheet(workbook, sheetsMap.get('Risk Management (RAID)') || {});

    // 9. SLA & Maintenance
    this.buildSlaSheet(workbook, sheetsMap.get('SLA & Maintenance') || {});

    // 10. Appendices & Case Studies
    this.buildAppendicesSheet(workbook, sheetsMap.get('Appendices & Case Studies') || {});

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // --- Styling Helpers ---
  private readonly PRIMARY_HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Dark Slate Navy
  };

  private readonly ACCENT_HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Secondary Slate
  };

  private readonly ZEBRA_EVEN_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' } // Soft gray
  };

  private readonly BRAND_EMERALD_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' } // Emerald Green
  };

  private readonly THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  private applyTitleBanner(ws: ExcelJS.Worksheet, title: string, subtitle?: string): void {
    ws.addRow([]);
    const titleRow = ws.addRow([`  ${title.toUpperCase()}`]);
    titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    ws.mergeCells(`A2:F2`);

    if (subtitle) {
      const subRow = ws.addRow([`  ${subtitle}`]);
      subRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      ws.mergeCells(`A3:F3`);
      ws.addRow([]);
    } else {
      ws.addRow([]);
    }
  }

  private applyHeaderRow(row: ExcelJS.Row, fill: ExcelJS.Fill = this.PRIMARY_HEADER_FILL): void {
    row.height = 28;
    row.eachCell((cell) => {
      cell.fill = fill;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = this.THIN_BORDER;
    });
  }

  private autoFitColumns(ws: ExcelJS.Worksheet, minWidth = 12): void {
    ws.columns.forEach((column) => {
      let maxLen = minWidth;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const val = cell.value ? cell.value.toString() : '';
        // If it's a merged cell spanning wide, don't let it blow up column width
        if (val.length > maxLen && val.length < 60) {
          maxLen = val.length;
        }
      });
      column.width = Math.min(maxLen + 3, 50);
    });
  }

  // --- Sheet 1: Overview ---
  private buildOverviewSheet(wb: ExcelJS.Workbook, proposal: ProposalWithSheets, data: Record<string, any>): void {
    const ws = wb.addWorksheet('01. Overview');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'PRESALEEE — EXECUTIVE SUMMARY & PROPOSAL OVERVIEW', `Project Version: ${proposal.version || 'v1.0'} | Status: ${proposal.status}`);

    const metadataTable = [
      ['Project Title', proposal.title],
      ['Prepared For', data.clientName || 'Valued Client'],
      ['Delivery Model', data.deliveryMethodology || 'Agile Scrum Delivery'],
      ['Proposal Date', data.date || new Date().toISOString().split('T')[0]],
      ['Estimated Timeline', `${proposal.estimatedTimelineWeeks || data.timelineWeeks || 16} Weeks`],
      ['Total Commercial Value', `${proposal.currency || 'USD'} ${Number(proposal.totalCost || 0).toLocaleString()}`]
    ];

    ws.addRow(['PROJECT METADATA & PARAMETERS']);
    const metaHeader = ws.lastRow!;
    metaHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    metaHeader.getCell(1).fill = this.PRIMARY_HEADER_FILL;
    metaHeader.getCell(2).fill = this.PRIMARY_HEADER_FILL;

    for (const [k, v] of metadataTable) {
      const r = ws.addRow([k, v]);
      r.height = 20;
      r.getCell(1).font = { name: 'Calibri', bold: true, color: { argb: 'FF334155' } };
      r.getCell(1).fill = this.ZEBRA_EVEN_FILL;
      r.getCell(1).border = this.THIN_BORDER;
      r.getCell(2).border = this.THIN_BORDER;
    }

    ws.addRow([]);

    // Executive summary text
    ws.addRow(['EXECUTIVE SUMMARY']);
    const execHeader = ws.lastRow!;
    execHeader.getCell(1).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    execHeader.getCell(1).fill = this.ACCENT_HEADER_FILL;
    ws.mergeCells(`A${execHeader.number}:F${execHeader.number}`);

    const summaryText = data.executiveSummary || 'Enterprise software delivery proposal prepared by Presaleee engineering.';
    const execRow = ws.addRow([summaryText]);
    execRow.height = 45;
    execRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    ws.mergeCells(`A${execRow.number}:F${execRow.number}`);

    ws.addRow([]);

    // Key Objectives
    ws.addRow(['KEY BUSINESS OBJECTIVES']);
    const objHeader = ws.lastRow!;
    objHeader.getCell(1).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    objHeader.getCell(1).fill = this.ACCENT_HEADER_FILL;
    ws.mergeCells(`A${objHeader.number}:F${objHeader.number}`);

    const objectives = Array.isArray(data.keyObjectives) ? data.keyObjectives : [];
    for (let i = 0; i < objectives.length; i++) {
      const r = ws.addRow([`•  ${objectives[i]}`]);
      r.height = 22;
      r.getCell(1).font = { name: 'Calibri', color: { argb: 'FF1E293B' } };
      ws.mergeCells(`A${r.number}:F${r.number}`);
    }

    this.autoFitColumns(ws);
  }

  // --- Sheet 2: Scope of Work ---
  private buildScopeOfWorkSheet(wb: ExcelJS.Workbook, data: Record<string, any>): void {
    const ws = wb.addWorksheet('02. Scope of Work');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'SCOPE OF WORK (WBS & FUNCTIONAL SPECIFICATIONS)', 'Detailed Breakdown of Core Modules, Features, and Effort');

    const header = ws.addRow(['WBS Code', 'Module Name', 'Feature / User Story Scope', 'Complexity', 'Priority', 'Est. Man-Days']);
    this.applyHeaderRow(header);

    const modules = Array.isArray(data.modules) ? data.modules : [];
    let rowIndex = 0;
    for (const m of modules) {
      rowIndex++;
      const row = ws.addRow([
        m.wbs || `1.${rowIndex}`,
        m.module || '',
        m.feature || '',
        m.complexity || 'Medium',
        m.priority || 'Must Have',
        m.estimatedDays || 0
      ]);
      row.height = 24;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'right' };

      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (rowIndex % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    this.autoFitColumns(ws);
  }

  // --- Sheet 3: Architecture & Tech Stack ---
  private buildArchitectureSheet(wb: ExcelJS.Workbook, data: Record<string, any>): void {
    const ws = wb.addWorksheet('03. Architecture & Tech');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'SYSTEM ARCHITECTURE & TECHNICAL SPECIFICATIONS', 'Solution Components, Technology Stack, and Non-Functional Requirements');

    const stackHeader = ws.addRow(['Architecture Layer', 'Chosen Technology & Framework', 'Architectural Rationale & Advantage']);
    this.applyHeaderRow(stackHeader);

    const stack = Array.isArray(data.stack) ? data.stack : [];
    let idx = 0;
    for (const item of stack) {
      idx++;
      const row = ws.addRow([item.layer || '', item.technology || '', item.rationale || '']);
      row.height = 24;
      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (idx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    ws.addRow([]);

    const nfrHeader = ws.addRow(['Non-Functional Category', 'Target Metric & Quality Attribute Requirement', 'Verification Method']);
    this.applyHeaderRow(nfrHeader, this.ACCENT_HEADER_FILL);

    const nfrs = Array.isArray(data.nonFunctionalRequirements) ? data.nonFunctionalRequirements : [];
    let nfrIdx = 0;
    for (const n of nfrs) {
      nfrIdx++;
      const row = ws.addRow([n.category || '', n.requirement || '', 'Automated CI / Benchmark Load Test']);
      row.height = 24;
      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (nfrIdx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    this.autoFitColumns(ws);
  }

  // --- Sheet 4: Timeline & Milestones ---
  private buildTimelineSheet(wb: ExcelJS.Workbook, data: Record<string, any>): void {
    const ws = wb.addWorksheet('04. Timeline & Milestones');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'IMPLEMENTATION TIMELINE & MILESTONE SCHEDULE', `Total Planned Duration: ${data.totalWeeks || 16} Weeks`);

    const header = ws.addRow(['Phase', 'Milestone Name', 'Duration (Weeks)', 'Start Week', 'End Week', 'Key Deliverables & Acceptance Trigger']);
    this.applyHeaderRow(header);

    const milestones = Array.isArray(data.milestones) ? data.milestones : [];
    let idx = 0;
    for (const m of milestones) {
      idx++;
      const row = ws.addRow([
        m.phase || '',
        m.milestone || '',
        m.durationWeeks || 0,
        m.startWeek || '',
        m.endWeek || '',
        m.deliverables || ''
      ]);
      row.height = 26;
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (idx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    this.autoFitColumns(ws);
  }

  // --- Sheet 5: Team & Rate Cards ---
  private buildTeamSheet(wb: ExcelJS.Workbook, data: Record<string, any>, currency: string): void {
    const ws = wb.addWorksheet('05. Team & Rate Cards');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'PROJECT TEAM COMPOSITION & RATE CARD ALLOCATION', `Staffing Allocation & Commercial Cost Structure (${currency})`);

    const header = ws.addRow(['Engineering Role', 'Seniority Level', 'Allocation (%)', 'Man-Months', `Monthly Rate (${currency})`, `Total Line Cost (${currency})`]);
    this.applyHeaderRow(header);

    const roles = Array.isArray(data.roles) ? data.roles : [];
    let idx = 0;
    let startRow = 6;
    for (const r of roles) {
      idx++;
      const row = ws.addRow([
        r.role || '',
        r.level || '',
        r.allocation || '100%',
        Number(r.manMonths || 0),
        Number(r.monthlyRate || 0),
        Number(r.totalCost || (r.manMonths * r.monthlyRate) || 0)
      ]);
      row.height = 24;
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'right' };

      row.getCell(4).numFmt = '#,##0.0';
      row.getCell(5).numFmt = '$#,##0.00';
      row.getCell(6).numFmt = '$#,##0.00';

      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (idx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    // Summary Row
    const endRow = startRow + idx - 1;
    const summaryRow = ws.addRow([
      'TOTAL STAFFING EFFORT & COST',
      '',
      '',
      { formula: `SUM(D${startRow}:D${endRow})` },
      '',
      { formula: `SUM(F${startRow}:F${endRow})` }
    ]);
    summaryRow.height = 28;
    summaryRow.font = { name: 'Calibri', bold: true, color: { argb: 'FF0F172A' } };
    summaryRow.getCell(4).numFmt = '#,##0.0';
    summaryRow.getCell(6).numFmt = '$#,##0.00';
    summaryRow.getCell(4).alignment = { horizontal: 'right' };
    summaryRow.getCell(6).alignment = { horizontal: 'right' };
    summaryRow.eachCell((c) => {
      c.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
      c.fill = this.ZEBRA_EVEN_FILL;
    });

    this.autoFitColumns(ws);
  }

  // --- Sheet 6: Pricing & Quotation ---
  private buildPricingSheet(wb: ExcelJS.Workbook, data: Record<string, any>, currency: string): void {
    const ws = wb.addWorksheet('06. Pricing & Quotation');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'COMMERCIAL PROPOSAL & PAYMENT SCHEDULE', `Financial Terms & Deliverable Milestones (${currency})`);

    const header = ws.addRow(['Payment Milestone / Tranche', 'Milestone Deliverable Description', 'Percentage (%)', `Amount (${currency})`, 'Invoice Trigger / Sign-off Condition']);
    this.applyHeaderRow(header);

    const items = Array.isArray(data.items) ? data.items : [];
    let idx = 0;
    let startRow = 6;
    for (const item of items) {
      idx++;
      const row = ws.addRow([
        item.milestone || '',
        item.description || item.milestone || '',
        Number(item.percentage || 0) / 100,
        Number(item.amount || 0),
        item.trigger || ''
      ]);
      row.height = 26;
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(3).numFmt = '0.0%';
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(4).numFmt = '$#,##0.00';

      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (idx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    const endRow = startRow + idx - 1;

    // Subtotal
    const subtotalRow = ws.addRow(['Subtotal (Net Professional Services)', '', '', { formula: `SUM(D${startRow}:D${endRow})` }, '']);
    subtotalRow.height = 24;
    subtotalRow.font = { name: 'Calibri', bold: true };
    subtotalRow.getCell(4).numFmt = '$#,##0.00';
    subtotalRow.getCell(4).alignment = { horizontal: 'right' };

    // Tax Row (10% VAT)
    const taxRow = ws.addRow(['Value Added Tax (VAT 10%)', '', '10.0%', { formula: `D${subtotalRow.number}*0.1` }, 'Statutory Tax']);
    taxRow.height = 24;
    taxRow.getCell(4).numFmt = '$#,##0.00';
    taxRow.getCell(4).alignment = { horizontal: 'right' };

    // Grand Total Row
    const totalRow = ws.addRow(['TOTAL CONTRACT VALUE (GROSS)', '', '', { formula: `D${subtotalRow.number}+D${taxRow.number}` }, 'Payment in Full']);
    totalRow.height = 30;
    totalRow.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.eachCell((c) => {
      c.fill = this.BRAND_EMERALD_FILL;
      c.border = { top: { style: 'medium' }, bottom: { style: 'medium' } };
    });
    totalRow.getCell(4).numFmt = '$#,##0.00';
    totalRow.getCell(4).alignment = { horizontal: 'right' };

    this.autoFitColumns(ws);
  }

  // --- Sheet 7: Assumptions & Dependencies ---
  private buildAssumptionsSheet(wb: ExcelJS.Workbook, data: Record<string, any>): void {
    const ws = wb.addWorksheet('07. Assumptions & Dep.');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'PROJECT ASSUMPTIONS & CLIENT DEPENDENCIES', 'Governance Framework, Operational Prerequisites, and Customer Responsibilities');

    const header = ws.addRow(['Ref ID', 'Category', 'Assumption / Prerequisite Description', 'Impact on Schedule / Cost']);
    this.applyHeaderRow(header);

    const items = Array.isArray(data.items) ? data.items : [];
    let idx = 0;
    for (const item of items) {
      idx++;
      const row = ws.addRow([item.id || `ASM-${idx}`, item.category || 'General', item.description || '', item.impact || 'Medium']);
      row.height = 26;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };

      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (idx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    this.autoFitColumns(ws);
  }

  // --- Sheet 8: Risk Management (RAID) ---
  private buildRaidSheet(wb: ExcelJS.Workbook, data: Record<string, any>): void {
    const ws = wb.addWorksheet('08. Risk Management (RAID)');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'RAID LOG & RISK MITIGATION STRATEGIES', 'Risk Identification, Severity Matrix, and Contingency Planning');

    const header = ws.addRow(['Risk ID', 'Risk Description & Root Cause', 'Probability', 'Impact', 'Risk Score', 'Proactive Mitigation & Contingency Strategy']);
    this.applyHeaderRow(header);

    const risks = Array.isArray(data.risks) ? data.risks : [];
    let idx = 0;
    for (const r of risks) {
      idx++;
      const row = ws.addRow([
        r.id || `RSK-${idx}`,
        r.risk || '',
        r.probability || 'Medium',
        r.impact || 'Medium',
        r.score || 9,
        r.mitigation || ''
      ]);
      row.height = 28;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };

      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (idx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    this.autoFitColumns(ws);
  }

  // --- Sheet 9: SLA & Maintenance ---
  private buildSlaSheet(wb: ExcelJS.Workbook, data: Record<string, any>): void {
    const ws = wb.addWorksheet('09. SLA & Maintenance');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'SERVICE LEVEL AGREEMENT (SLA) & SUPPORT MATRIX', `Warranty Period: ${data.warrantyMonths || 3} Months Post-Go-Live`);

    const header = ws.addRow(['Incident Severity Level', 'Issue Definition & Impact Criteria', 'Initial Response Target', 'Defect Resolution Target']);
    this.applyHeaderRow(header);

    const matrix = Array.isArray(data.incidentMatrix) ? data.incidentMatrix : [];
    let idx = 0;
    for (const item of matrix) {
      idx++;
      const row = ws.addRow([
        item.priority || '',
        item.description || '',
        item.responseTime || '< 2 Hours',
        item.resolutionTarget || '< 8 Hours'
      ]);
      row.height = 26;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (idx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    this.autoFitColumns(ws);
  }

  // --- Sheet 10: Appendices & Case Studies ---
  private buildAppendicesSheet(wb: ExcelJS.Workbook, data: Record<string, any>): void {
    const ws = wb.addWorksheet('10. Case Studies');
    ws.views = [{ showGridLines: true }];

    this.applyTitleBanner(ws, 'CORPORATE TRACK RECORD & RELEVANT CASE STUDIES', 'Validated Enterprise Credentials and Similar Solution Deployments');

    const header = ws.addRow(['Client Engagement / Domain', 'Industry Sector', 'Technology Architecture Deployed', 'Business Impact & ROI']);
    this.applyHeaderRow(header);

    const caseStudies = Array.isArray(data.caseStudies) ? data.caseStudies : [];
    let idx = 0;
    for (const cs of caseStudies) {
      idx++;
      const row = ws.addRow([
        cs.client || '',
        cs.domain || '',
        cs.stack || '',
        cs.outcome || ''
      ]);
      row.height = 28;
      row.getCell(2).alignment = { horizontal: 'center' };

      row.eachCell((c) => {
        c.border = this.THIN_BORDER;
        if (idx % 2 === 0) c.fill = this.ZEBRA_EVEN_FILL;
      });
    }

    this.autoFitColumns(ws);
  }
}
