import ExcelJS from 'exceljs';
import { AdminPlatformAnalytics } from '../../domain/entities/Dashboard.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vfsFonts = require('pdfmake/build/vfs_fonts');

pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(() => false);
pdfmake.setFonts({
  Roboto: {
    normal: Buffer.from(vfsFonts['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(vfsFonts['Roboto-Medium.ttf'], 'base64'),
    italics: Buffer.from(vfsFonts['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(vfsFonts['Roboto-MediumItalic.ttf'], 'base64'),
  },
});

export class AdminReportExportService {
  /**
   * Generates a beautifully styled, multi-sheet Excel (.xlsx) report
   */
  async exportExcel(analytics: AdminPlatformAnalytics, orgName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Presaleee Platform Admin';
    workbook.created = new Date();

    const PURPLE_HEADER_FILL: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B1E7A' }, // Deep Purple
    };

    const SUBHEADER_FILL: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F0F9' }, // Light Purple Tint
    };

    const BORDER_THIN: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };

    // ==========================================
    // SHEET 1: Executive Overview
    // ==========================================
    const wsOverview = workbook.addWorksheet('Executive Overview', {
      views: [{ showGridLines: true }],
    });

    wsOverview.columns = [
      { width: 4 },
      { width: 28 },
      { width: 36 },
      { width: 20 },
      { width: 20 },
    ];

    wsOverview.mergeCells('B2:E2');
    const titleCell = wsOverview.getCell('B2');
    titleCell.value = 'PRESALEEE PLATFORM EXECUTIVE REPORT';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF3B1E7A' } };

    wsOverview.getCell('B3').value = `Organization: ${orgName}`;
    wsOverview.getCell('B3').font = { size: 10, bold: true, color: { argb: 'FF4B5563' } };
    wsOverview.getCell('D3').value = `Time Horizon: ${analytics.timeHorizon.toUpperCase()} · Generated: ${new Date(analytics.generatedAt).toLocaleString('vi-VN')}`;
    wsOverview.getCell('D3').font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };

    wsOverview.getCell('B5').value = '1. CORE EXECUTIVE METRICS (KPIS)';
    wsOverview.getCell('B5').font = { size: 11, bold: true, color: { argb: 'FF1F2937' } };

    const kpiHeaderRow = wsOverview.getRow(6);
    kpiHeaderRow.values = ['', 'Metric Name', 'Metric Description', 'Value', 'Unit'];
    kpiHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    for (let c = 2; c <= 5; c++) {
      const cell = kpiHeaderRow.getCell(c);
      cell.fill = PURPLE_HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: c === 4 ? 'right' : 'left' };
      cell.border = BORDER_THIN;
    }

    const kpiData = [
      ['Total Deal Intakes', 'Total commercial opportunities evaluated', analytics.intakeAnalytics.totalIntakes, 'Leads'],
      ['Active Deal Pipeline', 'Leads currently active in evaluation funnel', analytics.leadPipelineAnalytics.totalLeads, 'Deals'],
      ['Average BANT Score', 'Mean technical and commercial qualification score', analytics.workspaceBantAnalytics.averageScore, '/ 100 pts'],
      ['Total Scored Deals', 'Opportunities evaluated with full BANT criteria', analytics.workspaceBantAnalytics.totalScored, 'Deals'],
      ['Discovery Meetings', 'Structured client discovery sessions conducted', analytics.discoveryMeetingAnalytics.totalMeetings, 'Sessions'],
      ['Active Client Portal Links', 'Secure proposal links currently active for clients', analytics.portalSessionAnalytics?.activeSessions ?? 0, 'Sessions'],
      ['Total Portal Sessions Issued', 'All-time client portal access links', analytics.portalSessionAnalytics?.totalSessions ?? 0, 'Sessions'],
      ['Active System Users', 'Presale team members and administrators', analytics.systemResourceTelemetry.totalActiveUsers, 'Users'],
      ['Total Proposals In Platform', 'Proposals generated & managed in studio', analytics.systemResourceTelemetry.totalProposals, 'Documents'],
      ['Audit Events Recorded', 'Immutable security and governance ledger events', analytics.systemResourceTelemetry.auditEventsCount, 'Events'],
    ];

    let rowCursor = 7;
    kpiData.forEach((row, i) => {
      const r = wsOverview.getRow(rowCursor);
      r.values = ['', row[0], row[1], row[2], row[3]];
      r.font = { size: 10 };
      for (let c = 2; c <= 5; c++) {
        const cell = r.getCell(c);
        cell.border = BORDER_THIN;
        if (i % 2 === 1) cell.fill = SUBHEADER_FILL;
        if (c === 4) {
          cell.alignment = { horizontal: 'right' };
          cell.font = { size: 10, bold: true, color: { argb: 'FF1E1B4B' } };
        }
      }
      rowCursor++;
    });

    rowCursor += 2;
    wsOverview.getCell(`B${rowCursor}`).value = '2. BANT SCORE DISTRIBUTION';
    wsOverview.getCell(`B${rowCursor}`).font = { size: 11, bold: true, color: { argb: 'FF1F2937' } };
    rowCursor++;

    const scoreHeader = wsOverview.getRow(rowCursor);
    scoreHeader.values = ['', 'Tier Category', 'Score Range', 'Count', 'Percentage'];
    scoreHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    for (let c = 2; c <= 5; c++) {
      const cell = scoreHeader.getCell(c);
      cell.fill = PURPLE_HEADER_FILL;
      cell.border = BORDER_THIN;
      if (c >= 4) cell.alignment = { horizontal: 'right' };
    }
    rowCursor++;

    analytics.workspaceBantAnalytics.scoreDistribution.forEach((tier) => {
      const r = wsOverview.getRow(rowCursor);
      r.values = ['', tier.label, tier.range, tier.count, `${tier.percentage}%`];
      r.font = { size: 10 };
      for (let c = 2; c <= 5; c++) {
        const cell = r.getCell(c);
        cell.border = BORDER_THIN;
        if (c >= 4) {
          cell.alignment = { horizontal: 'right' };
          cell.font = { size: 10, bold: true };
        }
      }
      rowCursor++;
    });

    // ==========================================
    // SHEET 2: BANT Evaluation & Leads
    // ==========================================
    const wsBant = workbook.addWorksheet('BANT Evaluation', {
      views: [{ showGridLines: true }],
    });

    wsBant.columns = [
      { width: 4 },
      { width: 40 },
      { width: 28 },
      { width: 14 },
      { width: 18 },
      { width: 22 },
    ];

    wsBant.mergeCells('B2:F2');
    wsBant.getCell('B2').value = 'BANT SCORED OPPORTUNITIES (TOP LEADS)';
    wsBant.getCell('B2').font = { size: 14, bold: true, color: { argb: 'FF3B1E7A' } };

    const bantHeaderRow = wsBant.getRow(4);
    bantHeaderRow.values = ['', 'Opportunity / Deal Title', 'Client Enterprise', 'BANT Score', 'Status', 'Evaluation Date'];
    bantHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    for (let c = 2; c <= 6; c++) {
      const cell = bantHeaderRow.getCell(c);
      cell.fill = PURPLE_HEADER_FILL;
      cell.border = BORDER_THIN;
      if (c === 4) cell.alignment = { horizontal: 'center' };
    }

    analytics.workspaceBantAnalytics.scoredLeads.forEach((lead, i) => {
      const r = wsBant.getRow(5 + i);
      r.values = [
        '',
        lead.title,
        lead.clientName || 'N/A',
        lead.bantScore,
        lead.status,
        new Date(lead.createdAt).toLocaleDateString('vi-VN'),
      ];
      r.font = { size: 10 };
      for (let c = 2; c <= 6; c++) {
        const cell = r.getCell(c);
        cell.border = BORDER_THIN;
        if (i % 2 === 1) cell.fill = SUBHEADER_FILL;
        if (c === 4) {
          cell.alignment = { horizontal: 'center' };
          cell.font = { size: 10, bold: true, color: { argb: lead.bantScore >= 80 ? 'FF047857' : lead.bantScore >= 70 ? 'FF1E40AF' : 'FFB45309' } };
        }
      }
    });

    // ==========================================
    // SHEET 3: Pipeline & Sources
    // ==========================================
    const wsPipeline = workbook.addWorksheet('Pipeline & Sources', {
      views: [{ showGridLines: true }],
    });

    wsPipeline.columns = [
      { width: 4 },
      { width: 28 },
      { width: 14 },
      { width: 16 },
      { width: 6 },
      { width: 28 },
      { width: 14 },
      { width: 16 },
    ];

    wsPipeline.mergeCells('B2:D2');
    wsPipeline.getCell('B2').value = 'PIPELINE STAGE BREAKDOWN';
    wsPipeline.getCell('B2').font = { size: 13, bold: true, color: { argb: 'FF3B1E7A' } };

    wsPipeline.mergeCells('F2:H2');
    wsPipeline.getCell('F2').value = 'DEAL SOURCE BREAKDOWN';
    wsPipeline.getCell('F2').font = { size: 13, bold: true, color: { argb: 'FF3B1E7A' } };

    const pipeHeader = wsPipeline.getRow(4);
    pipeHeader.getCell(2).value = 'Stage / Status';
    pipeHeader.getCell(3).value = 'Count';
    pipeHeader.getCell(4).value = 'Share (%)';
    pipeHeader.getCell(6).value = 'Source Channel';
    pipeHeader.getCell(7).value = 'Count';
    pipeHeader.getCell(8).value = 'Share (%)';

    [2, 3, 4, 6, 7, 8].forEach((c) => {
      const cell = pipeHeader.getCell(c);
      cell.fill = PURPLE_HEADER_FILL;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = BORDER_THIN;
      if ([3, 4, 7, 8].includes(c)) cell.alignment = { horizontal: 'right' };
    });

    const maxRows = Math.max(
      analytics.leadPipelineAnalytics.statusBreakdown.length,
      analytics.leadPipelineAnalytics.sourceBreakdown.length
    );

    for (let i = 0; i < maxRows; i++) {
      const r = wsPipeline.getRow(5 + i);
      const st = analytics.leadPipelineAnalytics.statusBreakdown[i];
      const src = analytics.leadPipelineAnalytics.sourceBreakdown[i];

      if (st) {
        r.getCell(2).value = st.status;
        r.getCell(3).value = st.count;
        r.getCell(4).value = `${st.percentage}%`;
        r.getCell(3).alignment = { horizontal: 'right' };
        r.getCell(4).alignment = { horizontal: 'right' };
      }
      if (src) {
        r.getCell(6).value = src.source;
        r.getCell(7).value = src.count;
        r.getCell(8).value = `${src.percentage}%`;
        r.getCell(7).alignment = { horizontal: 'right' };
        r.getCell(8).alignment = { horizontal: 'right' };
      }

      [2, 3, 4, 6, 7, 8].forEach((c) => {
        const cell = r.getCell(c);
        cell.border = BORDER_THIN;
        cell.font = { size: 10 };
        if (i % 2 === 1) cell.fill = SUBHEADER_FILL;
      });
    }

    // ==========================================
    // SHEET 4: Client Portal Sessions
    // ==========================================
    const wsPortal = workbook.addWorksheet('Portal Sessions Telemetry', {
      views: [{ showGridLines: true }],
    });

    wsPortal.columns = [
      { width: 4 },
      { width: 36 },
      { width: 22 },
      { width: 28 },
      { width: 14 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 12 },
    ];

    wsPortal.mergeCells('B2:I2');
    wsPortal.getCell('B2').value = 'CLIENT PORTAL TELEMETRY & SECURITY AUDIT';
    wsPortal.getCell('B2').font = { size: 14, bold: true, color: { argb: 'FF3B1E7A' } };

    const portalHeader = wsPortal.getRow(4);
    portalHeader.values = [
      '',
      'Proposal / Deal Title',
      'Client Recipient',
      'Recipient Email',
      'Status',
      'Created At',
      'Expires At',
      'Last Accessed',
      'Comments',
    ];
    portalHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    for (let c = 2; c <= 9; c++) {
      const cell = portalHeader.getCell(c);
      cell.fill = PURPLE_HEADER_FILL;
      cell.border = BORDER_THIN;
      if (c === 5 || c === 9) cell.alignment = { horizontal: 'center' };
    }

    const sessions = analytics.portalSessionAnalytics?.sessions || [];
    if (sessions.length === 0) {
      const r = wsPortal.getRow(5);
      r.getCell(2).value = 'No client portal sessions recorded in this time horizon.';
      r.getCell(2).font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    } else {
      sessions.forEach((s, i) => {
        const r = wsPortal.getRow(5 + i);
        r.values = [
          '',
          s.proposalTitle || s.leadTitle || 'Untitled Proposal',
          s.clientName || 'N/A',
          s.clientEmail,
          s.status,
          new Date(s.createdAt).toLocaleDateString('vi-VN'),
          new Date(s.expiresAt).toLocaleDateString('vi-VN'),
          s.lastAccessedAt ? new Date(s.lastAccessedAt).toLocaleString('vi-VN') : 'Never',
          s.commentCount,
        ];
        r.font = { size: 10 };
        for (let c = 2; c <= 9; c++) {
          const cell = r.getCell(c);
          cell.border = BORDER_THIN;
          if (i % 2 === 1) cell.fill = SUBHEADER_FILL;
          if (c === 5) {
            cell.alignment = { horizontal: 'center' };
            cell.font = {
              bold: true,
              size: 9,
              color: { argb: s.status === 'ACTIVE' ? 'FF047857' : s.status === 'EXPIRED' ? 'FFB45309' : 'FFBE123C' },
            };
          }
          if (c === 9) cell.alignment = { horizontal: 'center' };
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generates a cleanly structured executive PDF report using pdfmake
   */
  async exportPdf(analytics: AdminPlatformAnalytics, orgName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const generatedDateStr = new Date(analytics.generatedAt).toLocaleString('vi-VN');
        const activeSessions = analytics.portalSessionAnalytics?.activeSessions ?? 0;
        const totalSessions = analytics.portalSessionAnalytics?.totalSessions ?? 0;

        const docDefinition: any = {
          pageSize: 'A4',
          pageMargins: [40, 40, 40, 50],
          defaultStyle: {
            font: 'Roboto',
            fontSize: 9,
            color: '#1F2937',
          },
          footer: (currentPage: number, pageCount: number) => ({
            columns: [
              { text: `Presaleee Platform · Confidential Executive Report`, fontSize: 8, color: '#9CA3AF', margin: [40, 10, 0, 0] },
              { text: `Trang ${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 8, color: '#9CA3AF', margin: [0, 10, 40, 0] },
            ],
          }),
          content: [
            // Header Banner
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      fillColor: '#3B1E7A',
                      margin: [16, 16, 16, 16],
                      stack: [
                        { text: 'PRESALEEE PLATFORM EXECUTIVE REPORT', fontSize: 16, bold: true, color: '#FFFFFF' },
                        { text: `Tổ chức: ${orgName}  |  Khung thời gian: ${analytics.timeHorizon.toUpperCase()}  |  Ngày xuất: ${generatedDateStr}`, fontSize: 9, color: '#E9D5FF', margin: [0, 4, 0, 0] },
                        { text: 'Báo cáo chỉ số điều hành, đánh giá thầu, phễu chuyển đổi và giám sát an ninh Client Portal', fontSize: 8, color: '#C084FC', margin: [0, 2, 0, 0] },
                      ],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 16],
            },

            // Section 1: Executive Summary KPIs
            { text: '1. CHỈ SỐ VẬN HÀNH CỐT LÕI (EXECUTIVE KPIS)', fontSize: 11, bold: true, color: '#3B1E7A', margin: [0, 0, 0, 8] },
            {
              table: {
                widths: ['*', '*', '*', '*'],
                body: [
                  [
                    { text: 'Tổng Leads Khảo sát\n\n' + analytics.intakeAnalytics.totalIntakes, bold: true, alignment: 'center', fillColor: '#F5F3FF', margin: [4, 6, 4, 6] },
                    { text: 'Điểm BANT TB\n\n' + analytics.workspaceBantAnalytics.averageScore + '/100', bold: true, alignment: 'center', fillColor: '#F5F3FF', margin: [4, 6, 4, 6] },
                    { text: 'Cuộc họp Discovery\n\n' + analytics.discoveryMeetingAnalytics.totalMeetings, bold: true, alignment: 'center', fillColor: '#F5F3FF', margin: [4, 6, 4, 6] },
                    { text: 'Portal Link Active\n\n' + activeSessions + ' / ' + totalSessions, bold: true, alignment: 'center', fillColor: '#F5F3FF', margin: [4, 6, 4, 6] },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#DDD6FE',
                vLineColor: () => '#DDD6FE',
              },
              margin: [0, 0, 0, 16],
            },

            // Section 2: Scored Leads Table
            { text: '2. BẢNG XẾP HẠNG CƠ HỘI ĐƯỢC CHẤM ĐIỂM BANT', fontSize: 11, bold: true, color: '#3B1E7A', margin: [0, 0, 0, 8] },
            {
              table: {
                headerRows: 1,
                widths: [180, 120, 60, 70, 60],
                body: [
                  [
                    { text: 'Tên gói thầu / Dự án', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF' },
                    { text: 'Khách hàng', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF' },
                    { text: 'BANT', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF', alignment: 'center' },
                    { text: 'Trạng thái', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF' },
                    { text: 'Ngày tạo', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF' },
                  ],
                  ...analytics.workspaceBantAnalytics.scoredLeads.slice(0, 10).map((l, idx) => [
                    { text: l.title, fontSize: 8 },
                    { text: l.clientName || '—', fontSize: 8 },
                    { text: String(l.bantScore), bold: true, alignment: 'center', fontSize: 8, color: l.bantScore >= 80 ? '#047857' : '#1D4ED8' },
                    { text: l.status, fontSize: 8 },
                    { text: new Date(l.createdAt).toLocaleDateString('vi-VN'), fontSize: 8 },
                  ]),
                ],
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#E5E7EB',
                vLineColor: () => '#E5E7EB',
              },
              margin: [0, 0, 0, 16],
            },

            // Section 3: Client Portal Security Audit
            { text: '3. GIÁM SÁT AN NINH PHIÊN CLIENT PORTAL', fontSize: 11, bold: true, color: '#3B1E7A', margin: [0, 0, 0, 8] },
            {
              table: {
                headerRows: 1,
                widths: [160, 140, 60, 70, 60],
                body: [
                  [
                    { text: 'Hồ sơ đề xuất', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF' },
                    { text: 'Khách hàng / Email', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF' },
                    { text: 'Trạng thái', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF', alignment: 'center' },
                    { text: 'Hạn dùng', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF' },
                    { text: 'Lần xem cuối', bold: true, fillColor: '#3B1E7A', color: '#FFFFFF' },
                  ],
                  ...(analytics.portalSessionAnalytics?.sessions || []).slice(0, 8).map((s) => [
                    { text: s.proposalTitle || s.leadTitle || 'Proposal', fontSize: 8 },
                    { text: `${s.clientName || ''}\n${s.clientEmail}`, fontSize: 8 },
                    { text: s.status, bold: true, alignment: 'center', fontSize: 8, color: s.status === 'ACTIVE' ? '#047857' : '#DC2626' },
                    { text: new Date(s.expiresAt).toLocaleDateString('vi-VN'), fontSize: 8 },
                    { text: s.lastAccessedAt ? new Date(s.lastAccessedAt).toLocaleDateString('vi-VN') : 'Chưa xem', fontSize: 8 },
                  ]),
                ],
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#E5E7EB',
                vLineColor: () => '#E5E7EB',
              },
            },
          ],
        };

        const doc = pdfmake.createPdf(docDefinition);
        doc.getBuffer((buffer: Buffer) => {
          resolve(buffer);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}
