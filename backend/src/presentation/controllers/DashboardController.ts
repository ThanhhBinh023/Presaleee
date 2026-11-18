import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../domain/errors/AppError.js';
import { 
  GetDashboardAdminAnalyticsUseCase, 
  GetDashboardOverviewUseCase, 
  ListDashboardActivityUseCase, 
  ListDashboardLeadsUseCase 
} from '../../application/use-cases/DashboardUseCases.js';
import { AdminReportExportService } from '../../infrastructure/services/AdminReportExportService.js';

function organizationId(req: Request): string {
  if (!req.auth?.organizationId) throw new UnauthorizedError('Authenticated organization is required.');
  return req.auth.organizationId;
}

/** Query strings arrive unshaped; only scalars are forwarded so the use case can reject garbage with 400. */
function queryScalar(value: unknown): string | number | undefined {
  if (value === undefined || value === null) return undefined;
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' || typeof first === 'number' ? first : String(first);
}

/** Mirrors the use case default so the echoed meta limit matches the rows actually returned. */
function requestedLimit(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  return Number(value);
}

export class DashboardController {
  constructor(
    private readonly overviewUseCase: GetDashboardOverviewUseCase,
    private readonly leadsUseCase: ListDashboardLeadsUseCase,
    private readonly activityUseCase: ListDashboardActivityUseCase,
    private readonly adminAnalyticsUseCase?: GetDashboardAdminAnalyticsUseCase,
    private readonly reportExportService?: AdminReportExportService
  ) {}

  overview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.overviewUseCase.execute(organizationId(req), queryScalar(req.query.leadLimit));
      res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
  };

  leads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requested = queryScalar(req.query.limit);
      const limit = requestedLimit(requested) ?? 20;
      const data = await this.leadsUseCase.execute(organizationId(req), requested);
      res.status(200).json({ success: true, data, meta: { total: data.length, limit } });
    } catch (error) { next(error); }
  };

  activity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requested = queryScalar(req.query.limit);
      const limit = requestedLimit(requested) ?? 20;
      const data = await this.activityUseCase.execute(organizationId(req), requested);
      res.status(200).json({ success: true, data, meta: { total: data.length, limit } });
    } catch (error) { next(error); }
  };

  adminAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.auth?.role !== 'ADMIN') {
        throw new ForbiddenError('Chỉ tài khoản Quản trị hệ thống (System Admin) mới có quyền truy cập dữ liệu thống kê nền tảng.');
      }
      if (!this.adminAnalyticsUseCase) {
        throw new Error('Admin analytics use case is not configured.');
      }
      const period = queryScalar(req.query.period) as string | undefined;
      const data = await this.adminAnalyticsUseCase.execute(organizationId(req), period);
      res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
  };

  exportExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.auth?.role !== 'ADMIN') {
        throw new ForbiddenError('Chỉ tài khoản Quản trị hệ thống (System Admin) mới có quyền xuất báo cáo điều hành nền tảng.');
      }
      if (!this.adminAnalyticsUseCase) {
        throw new Error('Admin analytics use case is not configured.');
      }
      const period = queryScalar(req.query.period) as string | undefined;
      const data = await this.adminAnalyticsUseCase.execute(organizationId(req), period);
      const orgName = (req as any).auth?.organizationName || 'Presaleee Workspace';
      const exporter = this.reportExportService || new AdminReportExportService();
      const buffer = await exporter.exportExcel(data, orgName);

      const filename = `Presaleee_Executive_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(buffer);
    } catch (error) { next(error); }
  };

  exportPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.auth?.role !== 'ADMIN') {
        throw new ForbiddenError('Chỉ tài khoản Quản trị hệ thống (System Admin) mới có quyền xuất báo cáo điều hành nền tảng.');
      }
      if (!this.adminAnalyticsUseCase) {
        throw new Error('Admin analytics use case is not configured.');
      }
      const period = queryScalar(req.query.period) as string | undefined;
      const data = await this.adminAnalyticsUseCase.execute(organizationId(req), period);
      const orgName = (req as any).auth?.organizationName || 'Presaleee Workspace';
      const exporter = this.reportExportService || new AdminReportExportService();
      const buffer = await exporter.exportPdf(data, orgName);

      const filename = `Presaleee_Executive_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(buffer);
    } catch (error) { next(error); }
  };
}
