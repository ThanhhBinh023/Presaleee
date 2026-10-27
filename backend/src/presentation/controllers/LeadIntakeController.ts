import { Request, Response, NextFunction } from 'express';
import { AnalyzeLeadIntakeUseCase } from '../../application/use-cases/AnalyzeLeadIntakeUseCase.js';
import { AnalyzeLeadIntakeInputDTO } from '../../application/dtos/AnalyzeLeadIntakeDTO.js';

export class LeadIntakeController {
  constructor(private readonly analyzeUseCase: AnalyzeLeadIntakeUseCase) {}

  analyze = async (
    req: Request<unknown, unknown, AnalyzeLeadIntakeInputDTO>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = req.body ?? ({} as AnalyzeLeadIntakeInputDTO);
      const { rawRfpContent, source } = body;
      const result = await this.analyzeUseCase.execute({ rawRfpContent, source });

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          persisted: false,
          message: 'This is an unsaved Lead draft. Review it before persisting.'
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
