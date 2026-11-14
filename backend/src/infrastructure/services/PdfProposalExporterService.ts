import { IPdfExporterService } from '../../domain/repositories/IPdfExporterService.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';

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

const BRAND_PRIMARY = '#059669'; // Emerald 600
const BRAND_DARK = '#0F172A';    // Slate 900
const SLATE_MUTED = '#64748B';   // Slate 500
const BORDER_COLOR = '#CBD5E1';  // Slate 300
const BG_LIGHT = '#F8FAFC';      // Slate 50

function safeStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return String(value);
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

function renderContentItem(key: string, value: unknown): any[] {
  if (value === null || value === undefined || value === '') return [];

  const label = formatLabel(key);

  // If array of objects -> Table
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    if (typeof value[0] === 'object' && value[0] !== null) {
      const allKeys = Array.from(new Set(value.flatMap((item) => Object.keys(item))));
      if (allKeys.length > 0) {
        const widths = allKeys.map(() => '*');
        const headerRow = allKeys.map((colKey) => ({
          text: formatLabel(colKey),
          style: 'tableHeader',
          fillColor: BRAND_PRIMARY,
          color: '#FFFFFF',
          bold: true,
          margin: [4, 4, 4, 4],
        }));

        const dataRows = value.map((rowItem, rIdx) =>
          allKeys.map((colKey) => ({
            text: safeStr(rowItem[colKey]),
            style: 'tableCell',
            fillColor: rIdx % 2 === 1 ? BG_LIGHT : '#FFFFFF',
            margin: [4, 3, 4, 3],
          }))
        );

        return [
          { text: label, style: 'fieldHeading', margin: [0, 8, 0, 4] },
          {
            table: {
              headerRows: 1,
              widths,
              body: [headerRow, ...dataRows],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => BORDER_COLOR,
              vLineColor: () => BORDER_COLOR,
            },
            margin: [0, 0, 0, 10],
          },
        ];
      }
    }

    // Array of strings / primitives -> Bullet points
    return [
      { text: label, style: 'fieldHeading', margin: [0, 6, 0, 3] },
      {
        ul: value.map((item) => safeStr(item)),
        style: 'bodyText',
        margin: [0, 0, 0, 8],
      },
    ];
  }

  // Nested object
  if (typeof value === 'object') {
    const subEntries = Object.entries(value as Record<string, unknown>);
    if (subEntries.length === 0) return [];

    return [
      { text: label, style: 'fieldHeading', margin: [0, 8, 0, 4] },
      {
        stack: subEntries.flatMap(([subKey, subVal]) => {
          if (subVal === null || subVal === undefined || subVal === '') return [];
          if (typeof subVal === 'object') return renderContentItem(subKey, subVal);
          return [
            {
              columns: [
                { text: `${formatLabel(subKey)}:`, width: 140, bold: true, color: BRAND_DARK, fontSize: 9 },
                { text: safeStr(subVal), width: '*', color: '#334155', fontSize: 9 },
              ],
              margin: [8, 2, 0, 2],
            },
          ];
        }),
        margin: [0, 0, 0, 8],
      },
    ];
  }

  // Primitive
  return [
    {
      columns: [
        { text: `${label}:`, width: 150, bold: true, color: BRAND_DARK, fontSize: 9 },
        { text: safeStr(value), width: '*', color: '#334155', fontSize: 9 },
      ],
      margin: [0, 2, 0, 2],
    },
  ];
}

export class PdfProposalExporterService implements IPdfExporterService {
  async generateProposalPdf(proposal: ProposalWithSheets): Promise<Buffer> {
    const sheetOrder = proposal.sheets
      .slice()
      .sort((a, b) => (a.sheetOrder ?? 0) - (b.sheetOrder ?? 0));

    const content: any[] = [];

    // ==========================================
    // 1. TRANG BÌA (COVER PAGE)
    // ==========================================
    content.push({
      stack: [
        { text: 'PRESALEEE ENTERPRISE SOLUTIONS', style: 'brandBanner' },
        { text: 'HỒ SƠ ĐỀ XUẤT KỸ THUẬT & THƯƠNG MẠI', style: 'docSubtype' },
        { text: proposal.title, style: 'coverTitle' },
        { text: 'Bản đề xuất giải pháp kỹ thuật 10 sheets tiêu chuẩn', style: 'coverSubtitle' },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 2,
              lineColor: BRAND_PRIMARY,
            },
          ],
          margin: [0, 16, 0, 24],
        },
        // Metadata grid
        {
          columns: [
            [
              { text: 'PHIÊN BẢN', style: 'metaLabel' },
              { text: proposal.version || 'v1.0', style: 'metaValue' },
            ],
            [
              { text: 'TRẠNG THÁI', style: 'metaLabel' },
              { text: proposal.status || 'DRAFT', style: 'metaValue' },
            ],
            [
              { text: 'NGÀY XUẤT BẢN', style: 'metaLabel' },
              { text: new Date().toLocaleDateString('vi-VN'), style: 'metaValue' },
            ],
          ],
          margin: [0, 0, 0, 30],
        },
        // Executive Summary Card
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: 'THÔNG SỐ DỰ ÁN CỐT LÕI (EXECUTIVE SUMMARY)', style: 'cardHeader' },
                    {
                      columns: [
                        [
                          { text: 'Ngân Sách Đề Xuất:', style: 'cardLabel' },
                          {
                            text: proposal.totalCost
                              ? `${proposal.currency || 'USD'} ${Number(proposal.totalCost).toLocaleString()}`
                              : 'Chưa xác định',
                            style: 'cardValueHighlight',
                          },
                        ],
                        [
                          { text: 'Tiến Độ Triển Khai:', style: 'cardLabel' },
                          {
                            text: proposal.estimatedTimelineWeeks
                              ? `${proposal.estimatedTimelineWeeks} Tuần (Phases)`
                              : 'Theo thỏa thuận',
                            style: 'cardValue',
                          },
                        ],
                        [
                          { text: 'Cam Kết Chất Lượng:', style: 'cardLabel' },
                          { text: 'SLA 99.999% Multi-AZ', style: 'cardValue' },
                        ],
                      ],
                      margin: [0, 8, 0, 0],
                    },
                  ],
                  fillColor: BG_LIGHT,
                  margin: [16, 14, 16, 14],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => BRAND_PRIMARY,
            vLineColor: () => BRAND_PRIMARY,
          },
        },
      ],
      margin: [0, 40, 0, 0],
      pageBreak: 'after',
    });

    // ==========================================
    // 2. MỤC LỤC TÀI LIỆU (TABLE OF CONTENTS)
    // ==========================================
    content.push({
      text: 'MỤC LỤC HỒ SƠ ĐỀ XUẤT',
      style: 'tocTitle',
      margin: [0, 10, 0, 16],
    });

    const tocRows = sheetOrder.map((sheet, idx) => ({
      columns: [
        { text: `${idx + 1}.  ${sheet.sheetName}`, style: 'tocItemName', width: '*' },
        { text: `Phần ${idx + 1}`, style: 'tocItemPage', width: 60, alignment: 'right' },
      ],
      margin: [0, 4, 0, 4],
    }));

    content.push({ stack: tocRows, margin: [0, 0, 0, 24] });
    content.push({ text: '', pageBreak: 'after' });

    // ==========================================
    // 3. NỘI DUNG 10 SHEETS CHI TIẾT
    // ==========================================
    sheetOrder.forEach((sheet, idx) => {
      // Header thanh màu cho mỗi sheet
      content.push({
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: `${idx + 1}. ${sheet.sheetName.toUpperCase()}`,
                style: 'sheetHeaderTitle',
                fillColor: BRAND_PRIMARY,
                color: '#FFFFFF',
                margin: [12, 8, 12, 8],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 14],
      });

      const sheetData = sheet.sheetData || {};
      const renderedFields = Object.entries(sheetData).flatMap(([key, val]) =>
        renderContentItem(key, val)
      );

      if (renderedFields.length > 0) {
        content.push(...renderedFields);
      } else {
        content.push({
          text: 'Chưa có thông tin cụ thể cho phân hệ này.',
          style: 'emptyText',
          italics: true,
          margin: [0, 10, 0, 10],
        });
      }

      // Page break giữa các sheet (ngoại trừ sheet cuối cùng)
      if (idx < sheetOrder.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
    });

    // ==========================================
    // 4. CAM KẾT VÀ BẢN QUYỀN
    // ==========================================
    content.push({
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 0.5,
              lineColor: BORDER_COLOR,
            },
          ],
          margin: [0, 20, 0, 12],
        },
        {
          text: 'Tài liệu này là thông tin nội bộ và bảo mật của Presaleee & Khách hàng. Nghiêm cấm sao chép hoặc phân phối khi chưa có sự đồng ý bằng văn bản.',
          style: 'confidentialNotice',
        },
      ],
    });

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 50],
      content,
      styles: {
        brandBanner: { fontSize: 11, bold: true, color: BRAND_PRIMARY, characterSpacing: 2 },
        docSubtype: { fontSize: 13, bold: true, color: SLATE_MUTED, margin: [0, 6, 0, 10] },
        coverTitle: { fontSize: 22, bold: true, color: BRAND_DARK, lineHeight: 1.3 },
        coverSubtitle: { fontSize: 11, color: SLATE_MUTED, margin: [0, 6, 0, 0] },
        metaLabel: { fontSize: 8, bold: true, color: SLATE_MUTED },
        metaValue: { fontSize: 11, bold: true, color: BRAND_DARK, margin: [0, 2, 0, 0] },

        cardHeader: { fontSize: 10, bold: true, color: BRAND_PRIMARY, characterSpacing: 1 },
        cardLabel: { fontSize: 9, bold: true, color: SLATE_MUTED },
        cardValue: { fontSize: 10, bold: true, color: BRAND_DARK, margin: [0, 2, 0, 0] },
        cardValueHighlight: { fontSize: 13, bold: true, color: BRAND_PRIMARY, margin: [0, 2, 0, 0] },

        tocTitle: { fontSize: 15, bold: true, color: BRAND_DARK },
        tocItemName: { fontSize: 10, color: BRAND_DARK },
        tocItemPage: { fontSize: 9, color: SLATE_MUTED },

        sheetHeaderTitle: { fontSize: 12, bold: true, characterSpacing: 0.5 },
        fieldHeading: { fontSize: 10, bold: true, color: BRAND_DARK },
        bodyText: { fontSize: 9, color: '#334155', lineHeight: 1.35 },
        emptyText: { fontSize: 9, color: SLATE_MUTED },

        tableHeader: { fontSize: 8, bold: true },
        tableCell: { fontSize: 8, color: BRAND_DARK },

        confidentialNotice: { fontSize: 8, color: SLATE_MUTED, italics: true, alignment: 'center' },
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        color: BRAND_DARK,
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `Presaleee Proposal: ${proposal.title}`,
            fontSize: 7,
            color: SLATE_MUTED,
            margin: [40, 0, 0, 0],
          },
          {
            text: `Trang ${currentPage} / ${pageCount}`,
            fontSize: 7,
            color: SLATE_MUTED,
            alignment: 'right',
            margin: [0, 0, 40, 0],
          },
        ],
      }),
    };

    const doc = pdfmake.createPdf(docDefinition);
    return await doc.getBuffer();
  }
}
