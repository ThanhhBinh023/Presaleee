import React, { useEffect, useState } from 'react';
import { portalClientService } from '../services/portalService';
import { ApiError } from '../services/apiClient';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime, formatMoney } from '../utils/format';
import type { PortalComment, PortalMaterial, PortalProposalView, PortalQuestionAnswer } from '../types/portal';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  ShieldAlert, 
  Send,
  Layers
} from 'lucide-react';

const STORAGE_KEY = 'presaleee.clientPortal';

interface StoredPortal {
  proposalId: string;
  token: string;
}

function readStored(): StoredPortal | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPortal;
    if (!parsed.proposalId || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const ClientPortalPage: React.FC = () => {
  const [active, setActive] = useState<StoredPortal | null>(null);

  const [proposal, setProposal] = useState<PortalProposalView | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [materials, setMaterials] = useState<PortalMaterial[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<PortalQuestionAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  // PDF Preview State
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'sheets'>('pdf');

  const persistAndStrip = (next: StoredPortal) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActive(next);
    navigateTo('client-portal', { proposalId: next.proposalId });
  };

  useEffect(() => {
    const query = readHashQuery();
    const fromQueryId = query.get('proposalId') ?? '';
    const fromQueryToken = query.get('token') ?? '';
    if (fromQueryId && fromQueryToken) {
      persistAndStrip({ proposalId: fromQueryId, token: fromQueryToken });
      return;
    }
    const stored = readStored();
    if (fromQueryId && stored && stored.proposalId === fromQueryId) {
      setActive(stored);
      return;
    }
    if (stored) {
      setActive(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const loadAll = async (session: StoredPortal) => {
    setIsWorking(true);
    setError(null);
    try {
      const [view, commentRows, materialRows] = await Promise.all([
        portalClientService.getProposal(session.proposalId, session.token),
        portalClientService.listComments(session.proposalId, session.token),
        portalClientService.listMaterials(session.proposalId, session.token)
      ]);
      setProposal(view);
      setComments(commentRows);
      setMaterials(materialRows);
      setSheetName(view.sheets[0]?.sheetName ?? '');

      // Load PDF blob for inline preview
      setLoadingPdf(true);
      portalClientService.getPdfBlob(session.proposalId, session.token)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        })
        .catch((pdfErr) => {
          console.warn('PDF blob preview failed:', pdfErr);
        })
        .finally(() => {
          setLoadingPdf(false);
        });

    } catch (err) {
      setProposal(null);
      setComments([]);
      setMaterials([]);
      const message = err instanceof ApiError && err.status === 401
        ? 'Liên kết xem hồ sơ không hợp lệ hoặc đã hết hạn truy cập. Vui lòng liên hệ Trưởng dự án để nhận liên kết mới.'
        : err instanceof Error ? err.message : 'Không thể tải hồ sơ đề xuất.';
      setError(message);
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    if (active) void loadAll(active);
  }, [active]);

  const ask = async () => {
    if (!active || !question.trim()) return;
    setIsWorking(true);
    setError(null);
    try {
      const result = await portalClientService.ask(active.proposalId, active.token, question.trim());
      setAnswer(result);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể trả lời câu hỏi lúc này.');
    } finally {
      setIsWorking(false);
    }
  };

  const postComment = async () => {
    if (!active || !commentBody.trim()) return;
    setIsWorking(true);
    setError(null);
    try {
      const created = await portalClientService.createComment(active.proposalId, active.token, commentBody.trim());
      setComments((prev) => [created, ...prev]);
      setCommentBody('');
      setNotice('Đã gửi phản hồi thành công đến Đội ngũ Presale.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi phản hồi.');
    } finally {
      setIsWorking(false);
    }
  };

  const exportPdf = async () => {
    if (!active) return;
    setIsWorking(true);
    setError(null);
    try {
      if (pdfBlobUrl) {
        const a = document.createElement('a');
        a.href = pdfBlobUrl;
        a.download = `${(proposal?.title || 'Proposal').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setNotice('Đã tải xuống file PDF thành công.');
      } else {
        await portalClientService.exportPdf(active.proposalId, active.token);
        setNotice('Đã bắt đầu tải xuống file PDF.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải file PDF.');
    } finally {
      setIsWorking(false);
    }
  };

  const currentSheet = proposal?.sheets.find((sheet) => sheet.sheetName === sheetName);

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-5xl">
        
        {/* Client Portal Header (Client-facing only, no login, no back to overview) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white font-bold font-mono text-base flex items-center justify-center shadow-xs">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">Presaleee Client Portal</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Official Shared Proposal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cổng thông tin trực tuyến dành cho khách hàng xem và tải hồ sơ đề xuất giải pháp kỹ thuật
              </p>
            </div>
          </div>

          {proposal && (
            <div className="flex items-center gap-2">
              {pdfBlobUrl && (
                <a
                  href={pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở toàn màn hình</span>
                </a>
              )}
              <button
                onClick={() => void exportPdf()}
                disabled={isWorking}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải file PDF (.pdf)</span>
              </button>
            </div>
          )}
        </div>

        {notice && <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 font-semibold">{notice}</p>}
        {error && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-semibold">{error}</p>}

        {/* Not Active fallback when direct link lacks token */}
        {!active && (
          <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Yêu cầu liên kết truy cập</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Trang này dành cho khách hàng mở trực tiếp qua đường link được chia sẻ từ Trưởng dự án Presale. Vui lòng kiểm tra lại liên kết trong email hoặc tài liệu của bạn.
              </p>
            </div>
          </div>
        )}

        {active && !proposal && isWorking && (
          <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-500">Đang tải hồ sơ đề xuất giải pháp kỹ thuật...</p>
          </div>
        )}

        {proposal && (
          <div className="space-y-6">
            
            {/* Proposal Overview Header Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                    <span>HỒ SƠ ĐỀ XUẤT</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">{proposal.version}</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      {proposal.status}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {proposal.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setViewMode('pdf')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      viewMode === 'pdf'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Bản Xem Trước PDF</span>
                  </button>
                  <button
                    onClick={() => setViewMode('sheets')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      viewMode === 'sheets'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Chi Tiết 10 Sheets</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs font-mono text-slate-600">
                <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  Tổng kinh phí: <strong className="text-slate-900">{formatMoney(proposal.totalCost ?? null, proposal.currency)}</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  Tiến độ triển khai: <strong className="text-slate-900">{proposal.estimatedTimelineWeeks ?? '—'} tuần</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  Tiêu chuẩn: <strong className="text-slate-900">10 Sheets Enterprise</strong>
                </span>
              </div>
            </div>

            {/* VIEW MODE 1: REAL PDF PREVIEW VIEWER (Client xem bản xem trước file .pdf, không xem json) */}
            {viewMode === 'pdf' && (
              <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Bản xem trước Hồ sơ Đề xuất Kỹ thuật (10 Sheets PDF)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pdfBlobUrl && (
                      <a
                        href={pdfBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở toàn màn hình</span>
                      </a>
                    )}
                    <button
                      onClick={() => void exportPdf()}
                      disabled={isWorking}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {loadingPdf ? (
                  <div className="flex flex-col items-center justify-center p-24 space-y-3 bg-white">
                    <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                    <p className="text-xs font-mono text-slate-500 font-medium">Đang kết xuất bản xem trước PDF từ hệ thống...</p>
                  </div>
                ) : pdfBlobUrl ? (
                  <div className="w-full h-[850px] bg-slate-100">
                    <iframe
                      src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                      className="w-full h-full border-0"
                      title="Bản xem trước PDF"
                    />
                  </div>
                ) : (
                  <div className="p-16 text-center space-y-4 bg-white">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Trình duyệt chưa tải được bản nhúng PDF trực tiếp. Bạn có thể bấm nút dưới đây để tải về tệp PDF hoàn chỉnh.
                    </p>
                    <button
                      onClick={() => void exportPdf()}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      Tải file PDF (.pdf)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE 2: STRUCTURED 10-SHEET MATRIX (Clean Formatted Document, NO RAW JSON) */}
            {viewMode === 'sheets' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-600" />
                    <span>Chi Tiết Các Sheet Nghiệp Vụ</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Sheet {currentSheet?.sheetOrder} / {proposal.sheets.length}
                  </span>
                </div>

                {/* Sheet Navigation Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {proposal.sheets.map((sheet) => (
                    <button
                      key={sheet.sheetName}
                      onClick={() => setSheetName(sheet.sheetName)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        sheetName === sheet.sheetName 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {sheet.sheetOrder}. {sheet.sheetName}
                    </button>
                  ))}
                </div>

                {/* Structured Sheet Content - Clean Typography, No Raw JSON */}
                <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200">
                  <h4 className="font-extrabold text-base text-slate-900 mb-4 pb-2 border-b border-slate-200">
                    {currentSheet?.sheetOrder}. {currentSheet?.sheetName}
                  </h4>
                  {renderSheetContent(currentSheet?.sheetName || '', currentSheet?.sheetData)}
                </div>
              </div>
            )}

            {/* AI Proposal Assistant for Client */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">Hỏi đáp về hồ sơ đề xuất (AI Assistant)</h3>
              </div>
              <p className="text-xs text-slate-500">
                Bạn có thể đặt câu hỏi về giải pháp, kiến trúc, timeline hoặc điều kiện nghiệm thu trong hồ sơ đề xuất này.
              </p>
              <textarea 
                className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed focus:bg-white focus:outline-none focus:border-brand-500" 
                maxLength={5000} 
                value={question} 
                onChange={(e) => setQuestion(e.target.value)} 
                placeholder="Nhập câu hỏi của bạn về đề xuất này..." 
              />
              <button 
                onClick={() => void ask()} 
                disabled={isWorking || !question.trim()} 
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi câu hỏi</span>
              </button>
              {answer && (
                <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4 text-xs space-y-2">
                  <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-medium">{answer.answer}</p>
                  {answer.citations.length > 0 && (
                    <div className="pt-2 border-t border-brand-100">
                      <span className="text-[10px] font-mono font-bold text-brand-700 uppercase">Trích dẫn tài liệu:</span>
                      <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
                        {answer.citations.map((citation, index) => (
                          <li key={`${citation.sheetName}-${index}`} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                            <span>{citation.label} {citation.sheetName}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shared Materials */}
            {materials.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Tài liệu đính kèm ({materials.length})</h3>
                <ul className="space-y-2 text-xs">
                  {materials.map((material) => (
                    <li key={material.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <a href={material.fileUrl} className="font-semibold text-brand-700 hover:underline" target="_blank" rel="noreferrer">
                          {material.title}
                        </a>
                        <span className="ml-2 font-mono text-[10px] text-slate-400">({material.fileName})</span>
                      </div>
                      <a href={material.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 font-semibold hover:underline">
                        Tải về &rarr;
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Comments & Feedback */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Ý kiến &amp; Phản hồi cho Đội ngũ Presale ({comments.length})</h3>
              <ul className="space-y-2 text-xs">
                {comments.length === 0 ? (
                  <li className="text-slate-400 italic">Chưa có phản hồi nào. Bạn có thể để lại ý kiến đóng góp bên dưới.</li>
                ) : (
                  comments.map((comment) => (
                    <li key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-1">
                      <div className="text-[11px] font-mono text-slate-500 font-semibold">
                        {comment.authorName || 'Khách hàng'} · {formatDateTime(comment.createdAt)}
                      </div>
                      <p className="whitespace-pre-wrap text-slate-800 text-xs">{comment.body}</p>
                    </li>
                  ))
                )}
              </ul>
              <textarea 
                className="w-full min-h-[80px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed focus:bg-white focus:outline-none focus:border-brand-500" 
                maxLength={5000} 
                value={commentBody} 
                onChange={(e) => setCommentBody(e.target.value)} 
                placeholder="Nhập phản hồi hoặc yêu cầu điều chỉnh của bạn..." 
              />
              <button 
                onClick={() => void postComment()} 
                disabled={isWorking || !commentBody.trim()} 
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi phản hồi</span>
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

/** Helper to render structured human-readable content for sheets instead of raw JSON */
function renderSheetContent(_sheetName: string, data: any) {
  if (!data || typeof data !== 'object') {
    return <p className="text-xs text-slate-500 italic">Chưa có thông tin chi tiết cho sheet này.</p>;
  }

  return (
    <div className="space-y-4 text-xs">
      {data.executiveSummary && (
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>Tóm tắt Điều hành (Executive Summary)</span>
          </div>
          <p className="text-slate-700 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap">{data.executiveSummary}</p>
        </div>
      )}

      {Array.isArray(data.keyObjectives) && data.keyObjectives.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="font-bold text-slate-800 mb-2">Mục tiêu Chiến lược &amp; Yêu cầu Cốt lõi:</div>
          <ul className="space-y-1.5 list-disc list-inside text-slate-700">
            {data.keyObjectives.map((obj: string, i: number) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(data.modules) && data.modules.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
          <div className="font-bold text-slate-800 mb-1">Các Phân Hệ Chức Năng (Modules):</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.modules.map((m: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-900">{m.module || m.name || `Phân hệ ${i + 1}`}</div>
                {m.features && (
                  <div className="text-[11px] text-slate-600 mt-1">
                    {Array.isArray(m.features) ? m.features.join(', ') : m.features}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(data.milestones) && data.milestones.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="font-bold text-slate-800 mb-2">Lộ trình &amp; Mốc Bàn Giao:</div>
          <div className="space-y-2">
            {data.milestones.map((m: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{m.milestone || m.phase}</div>
                  <div className="text-[11px] text-slate-500">{m.deliverables || m.description}</div>
                </div>
                {m.durationWeeks && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold shrink-0">
                    {m.durationWeeks} tuần
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(data.paymentMilestones) && data.paymentMilestones.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="font-bold text-slate-800 mb-2">Kế hoạch Thanh toán Theo Đợt:</div>
          <div className="space-y-2">
            {data.paymentMilestones.map((p: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-800">{p.milestone}</span>
                <span className="font-mono font-bold text-emerald-700">
                  {p.percentage}% ({typeof p.amount === 'number' ? `$${p.amount.toLocaleString()}` : p.amount})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render remaining key-value items as clean cards */}
      {Object.entries(data)
        .filter(([k]) => !['executiveSummary', 'keyObjectives', 'modules', 'milestones', 'paymentMilestones'].includes(k))
        .map(([key, val]) => (
          <div key={key} className="p-3 rounded-lg bg-white border border-slate-200">
            <span className="font-bold text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
            <span className="text-slate-600">
              {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
            </span>
          </div>
        ))}
    </div>
  );
}
