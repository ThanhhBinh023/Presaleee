import { IPdfExporterService } from '../../domain/repositories/IPdfExporterService.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';

function printableAscii(value: string): string {
  return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
}

function escapePdf(value: string): string {
  return printableAscii(value).replace(/([\\()])/g, '\\$1');
}

function flatten(value: unknown, prefix = ''): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, `${prefix}[${index + 1}]`));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
  }
  return [`${prefix}: ${String(value)}`];
}

function wrap(line: string, width = 92): string[] {
  const words = printableAscii(line).split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && `${current} ${word}`.length > width) { lines.push(current); current = word; }
    else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function buildPdf(pages: string[][]): Buffer {
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const pageRefs = pages.map((_, index) => `${4 + index * 2} 0 R`).join(' ');
  objects[2] = `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pages.forEach((lines, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const commands = ['BT', '/F1 9 Tf', '48 748 Td', '12 TL'];
    for (const line of lines) commands.push(`(${escapePdf(line)}) Tj`, 'T*');
    commands.push('ET');
    const stream = commands.join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`;
  });
  let output = '%PDF-1.4\n% Presaleee Proposal\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(output, 'ascii');
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(output, 'ascii');
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(output, 'ascii');
}

export class PdfProposalExporterService implements IPdfExporterService {
  async generateProposalPdf(proposal: ProposalWithSheets): Promise<Buffer> {
    const lines = [
      proposal.title,
      `Version: ${proposal.version} | Status: ${proposal.status}`,
      `Estimate: ${proposal.currency || 'USD'} ${proposal.totalCost ?? 'Not estimated'}`,
      `Timeline: ${proposal.estimatedTimelineWeeks ?? 'Not estimated'} weeks`,
      ''
    ];
    for (const sheet of proposal.sheets) {
      lines.push(sheet.sheetName.toUpperCase());
      lines.push(...flatten(sheet.sheetData));
      lines.push('');
    }
    const wrapped = lines.flatMap(line => wrap(line));
    const pageSize = 58;
    const pages: string[][] = [];
    for (let index = 0; index < wrapped.length; index += pageSize) pages.push(wrapped.slice(index, index + pageSize));
    return buildPdf(pages.length ? pages : [[proposal.title]]);
  }
}
