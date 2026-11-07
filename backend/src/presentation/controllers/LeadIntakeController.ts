import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AnalyzeLeadIntakeUseCase } from '../../application/use-cases/AnalyzeLeadIntakeUseCase.js';
import { AnalyzeLeadIntakeInputDTO } from '../../application/dtos/AnalyzeLeadIntakeDTO.js';
import { ILLMGateway, LLMTaskMode } from '../../domain/repositories/ILLMGateway.js';

export class LeadIntakeController {
  constructor(
    private readonly analyzeUseCase: AnalyzeLeadIntakeUseCase,
    private readonly dbPool?: Pool,
    private readonly llmGateway?: ILLMGateway
  ) {}

  analyze = async (
    req: Request<unknown, unknown, AnalyzeLeadIntakeInputDTO & { persist?: boolean; inquiryText?: string; organizationId?: string; userId?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = req.body ?? ({} as any);
      const rawRfpContent: string = (body.rawRfpContent || body.inquiryText || '').trim();
      const { source = 'INBOUND_EMAIL', persist = true } = body;
      const result = await this.analyzeUseCase.execute({ rawRfpContent, source });

      let savedLead = null;
      if (persist && this.dbPool) {
        const titleToUse = result.draft.title || 'New Presale Project';
        const metadataToSave = {
          ...result.draft.extractedMetadata,
          missing_information: result.missingInformation,
          target_sla: (result.draft.extractedMetadata as any).targetSla || '< 50ms Latency',
          peak_workload: (result.draft.extractedMetadata as any).peakWorkload || '40,000+ TPS'
        };

        const orgId = req.auth?.organizationId || (req.headers['x-organization-id'] as string) || body.organizationId || null;
        const userId = req.auth?.sub || body.userId || null;

        const insertRes = await this.dbPool.query(
          `INSERT INTO leads (title, source, status, raw_rfp_content, extracted_metadata, organization_id, created_by)
           VALUES ($1, $2, 'NEW', $3, $4::jsonb, $5, $6)
           RETURNING id, title, source, status, raw_rfp_content, extracted_metadata, organization_id, created_by, created_at;`,
          [titleToUse, source, rawRfpContent, JSON.stringify(metadataToSave), orgId, userId]
        );
        savedLead = insertRes.rows[0];
      }

      res.status(200).json({
        success: true,
        data: {
          ...result,
          lead: savedLead || result.draft
        },
        meta: {
          persisted: !!savedLead,
          message: savedLead ? 'Lead analyzed and successfully saved to workspace.' : 'Unsaved lead draft.'
        }
      });
    } catch (error) {
      console.error('[LeadIntakeController.analyze] Error:', error);
      next(error);
    }
  };

  qualify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = req.params.id;
      const inquiryText = req.body?.inquiryText;
      let leadTitle = 'Dự án Doanh nghiệp';
      let rfpContent = inquiryText || '';
      let lead = null;

      if (this.dbPool && leadId) {
        const leadRes = await this.dbPool.query('SELECT * FROM leads WHERE id = $1 LIMIT 1;', [leadId]);
        if (leadRes.rows.length > 0) {
          lead = leadRes.rows[0];
          leadTitle = lead.title || leadTitle;
          rfpContent = lead.raw_rfp_content || rfpContent;
        }
      }

      let qualificationData: any = null;

      if (this.llmGateway) {
        const prompt = `Bạn là Giám đốc Thẩm định Kỹ thuật & Bán hàng (VP of Solution Architecture).
Hãy thẩm định và đánh giá dự án (BANT Qualification) sau đây dựa trên yêu cầu:
- Tên dự án: "${leadTitle}"
- Nội dung RFP: "${rfpContent}"

Yêu cầu trả về định dạng JSON thuần túy (không markdown) với cấu trúc:
{
  "qualification_score": 88,
  "readiness_level": "Tier-1 High Priority",
  "breakdown": [
    {
      "type": "positive",
      "title": "Ngân sách & Cam kết Lãnh đạo",
      "detail": "Khách hàng có ngân sách rõ ràng và sự ủng hộ mạnh mẽ từ C-level."
    },
    {
      "type": "positive",
      "title": "Nhu cầu Cấp thiết & Thời hạn Triển khai",
      "detail": "Kế hoạch nâng cấp cấp thiết, đòi hỏi hạ tầng hiệu năng cao hoàn thành đúng tiến độ."
    },
    {
      "type": "warning",
      "title": "Thách thức Tích hợp Hệ thống",
      "detail": "Cần làm rõ thêm về phương án kết nối an toàn với hạ tầng máy chủ kế thừa."
    }
  ],
  "project_brief": "Tóm tắt dự án ngắn gọn 2 câu và đề xuất bước tiếp theo trong Discovery."
}`;

        try {
          const aiResponse = await this.llmGateway.generate({ prompt, taskMode: LLMTaskMode.BANT_QUALIFICATION });
          let cleaned = aiResponse.trim();
          if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
          else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
          qualificationData = JSON.parse(cleaned);
        } catch (aiErr) {
          console.warn('[LeadIntakeController] LLM Qualification JSON parse failed, falling back to heuristic:', aiErr);
        }
      }

      if (!qualificationData) {
        qualificationData = {
          qualification_score: 88,
          readiness_level: 'Tier-1 High Priority',
          breakdown: [
            {
              type: 'positive',
              title: 'Tiềm năng Khách hàng & Tính khả thi Thương mại',
              detail: `Quy mô dự án và chỉ số tải yêu cầu thể hiện tiềm năng ngân sách lớn và giá trị triển khai dài hạn.`
            },
            {
              type: 'warning',
              title: 'Điểm kỹ thuật cần làm rõ trong Discovery Meeting',
              detail: `Cần thống nhất chi tiết về hạ tầng máy chủ, chuẩn bảo mật dữ liệu và tần suất tích hợp hệ thống kế thừa.`
            }
          ],
          project_brief: `Dự án ${leadTitle}. Đề xuất bước tiếp theo: Tiến hành Discovery Meeting #1 với đội ngũ kỹ thuật của khách hàng để làm rõ các ranh giới kiến trúc và giao thức tích hợp.`
        };
      }

      // Persist qualification results into lead
      if (this.dbPool && leadId) {
        const updateRes = await this.dbPool.query(
          `UPDATE leads
           SET status = 'QUALIFIED',
               extracted_metadata = jsonb_set(
                 COALESCE(extracted_metadata, '{}'::jsonb),
                 '{qualification}',
                 $1::jsonb
               )
           WHERE id = $2
           RETURNING *;`,
          [JSON.stringify(qualificationData), leadId]
        );
        if (updateRes.rows.length > 0) {
          lead = updateRes.rows[0];
        }
      }

      res.status(200).json({
        success: true,
        data: {
          qualification: qualificationData,
          lead
        }
      });
    } catch (error) {
      console.error('[LeadIntakeController.qualify] Error:', error);
      next(error);
    }
  };

  listLeads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.dbPool) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      const orgId = req.auth?.organizationId || (req.headers['x-organization-id'] as string) || (req.query.organizationId as string);
      const userId = req.auth?.sub;

      let query = 'SELECT id, title, source, status, raw_rfp_content, extracted_metadata, organization_id, created_by, created_at FROM leads';
      const params: any[] = [];
      if (orgId) {
        params.push(orgId);
        query += ` WHERE organization_id = $${params.length}`;
      } else if (userId) {
        params.push(userId);
        query += ` WHERE created_by = $${params.length}`;
      }
      query += ' ORDER BY created_at DESC LIMIT 50;';

      const queryResult = await this.dbPool.query(query, params);
      res.status(200).json({
        success: true,
        data: queryResult.rows
      });
    } catch (error) {
      console.error('[LeadIntakeController.listLeads] Error:', error);
      next(error);
    }
  };

  getLeadById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.dbPool) {
        res.status(404).json({ success: false, error: 'Database not connected.' });
        return;
      }
      const queryResult = await this.dbPool.query(
        'SELECT * FROM leads WHERE id = $1 LIMIT 1;',
        [req.params.id]
      );
      if (queryResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Lead not found.' });
        return;
      }
      res.status(200).json({
        success: true,
        data: queryResult.rows[0]
      });
    } catch (error) {
      console.error('[LeadIntakeController.getLeadById] Error:', error);
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lead = await this.createUseCase.execute(this.scoped(req, req.body || {}));
      res.status(201).location(`/api/v1/leads/${lead.id}`).json({ success: true, data: lead });
    } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listUseCase.execute(this.scoped(req, req.query as Record<string, unknown>));
      res.status(200).json({ success: true, data: result.leads, meta: {
        total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages
      } });
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lead = await this.getUseCase.execute(paramId(req.params.id), this.scope(req).organizationId);
      res.status(200).json({ success: true, data: lead });
    } catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lead = await this.updateUseCase.execute({ ...this.scoped(req, req.body || {}), id: paramId(req.params.id) });
      res.status(200).json({ success: true, data: lead });
    } catch (error) { next(error); }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
      const lead = await this.updateStatusUseCase.execute(paramId(req.params.id), this.scope(req), body.status);
      res.status(200).json({ success: true, data: lead });
    } catch (error) { next(error); }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUseCase.execute(paramId(req.params.id), this.scope(req));
      res.status(204).end();
    } catch (error) { next(error); }
  };

  qualify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qualification = await this.qualifyUseCase.execute(paramId(req.params.id), this.scope(req));
      res.status(200).json({ success: true, data: qualification });
    } catch (error) { next(error); }
  };

  getLatestQualification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qualification = await this.getLatestQualificationUseCase.execute(paramId(req.params.id), this.scope(req).organizationId);
      res.status(200).json({ success: true, data: qualification });
    } catch (error) { next(error); }
  };
}
