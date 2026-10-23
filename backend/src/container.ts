import { dbPool } from './infrastructure/database/connection.js';
import { PostgresKnowledgeRepository } from './infrastructure/database/repositories/PostgresKnowledgeRepository.js';
import { PostgresProposalRepository } from './infrastructure/database/repositories/PostgresProposalRepository.js';
import { GeminiEmbeddingGateway } from './infrastructure/ai/GeminiEmbeddingGateway.js';
import { FastAPILMGateway } from './infrastructure/ai/FastAPILMGateway.js';
import { ExcelProposalExporterService } from './infrastructure/services/ExcelProposalExporterService.js';
import { PdfProposalExporterService } from './infrastructure/services/PdfProposalExporterService.js';

import { SearchHybridRAGUseCase } from './application/use-cases/SearchHybridRAGUseCase.js';
import { IngestDocumentUseCase } from './application/use-cases/IngestDocumentUseCase.js';
import { GenerateProposalUseCase } from './application/use-cases/GenerateProposalUseCase.js';

import { CreateProposalUseCase } from './application/use-cases/CreateProposalUseCase.js';
import { GetProposalByIdUseCase } from './application/use-cases/GetProposalByIdUseCase.js';
import { ListProposalsUseCase } from './application/use-cases/ListProposalsUseCase.js';
import { UpdateProposalUseCase } from './application/use-cases/UpdateProposalUseCase.js';
import { UpdateProposalSheetUseCase } from './application/use-cases/UpdateProposalSheetUseCase.js';
import { DeleteProposalUseCase } from './application/use-cases/DeleteProposalUseCase.js';
import { ExportProposalToExcelUseCase } from './application/use-cases/ExportProposalToExcelUseCase.js';
import { CreateProposalFromLeadUseCase } from './application/use-cases/CreateProposalFromLeadUseCase.js';
import { GenerateProposalSheetsUseCase } from './application/use-cases/GenerateProposalSheetsUseCase.js';
import { ExportProposalToPdfUseCase } from './application/use-cases/ExportProposalToPdfUseCase.js';

import { RAGController } from './presentation/controllers/RAGController.js';
import { ProposalController } from './presentation/controllers/ProposalController.js';
import { LeadIntakeController } from './presentation/controllers/LeadIntakeController.js';
import { AnalyzeLeadIntakeUseCase } from './application/use-cases/AnalyzeLeadIntakeUseCase.js';
import { PostgresAuthRepository } from './infrastructure/database/repositories/PostgresAuthRepository.js';
import { AuthController } from './presentation/controllers/AuthController.js';
import {
  LoginUseCase,
  RefreshSessionUseCase,
  LogoutUseCase,
  GetCurrentUserUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase
} from './application/use-cases/AuthUseCases.js';
import { PostgresLeadRepository } from './infrastructure/database/repositories/PostgresLeadRepository.js';
import {
  CreateLeadUseCase,
  ListLeadsUseCase,
  GetLeadUseCase,
  UpdateLeadUseCase,
  UpdateLeadStatusUseCase,
  DeleteLeadUseCase,
  QualifyLeadUseCase,
  GetLatestQualificationUseCase
} from './application/use-cases/LeadUseCases.js';
import { PostgresDashboardRepository } from './infrastructure/database/repositories/PostgresDashboardRepository.js';
import { GetDashboardOverviewUseCase, ListDashboardActivityUseCase, ListDashboardLeadsUseCase } from './application/use-cases/DashboardUseCases.js';
import { DashboardController } from './presentation/controllers/DashboardController.js';

export interface ServiceContainer {
  knowledgeRepository: PostgresKnowledgeRepository;
  proposalRepository: PostgresProposalRepository;
  authRepository: PostgresAuthRepository;
  leadRepository: PostgresLeadRepository;
  dashboardRepository: PostgresDashboardRepository;
  embeddingGateway: GeminiEmbeddingGateway;
  llmGateway: FastAPILMGateway;
  excelExporterService: ExcelProposalExporterService;
  pdfExporterService: PdfProposalExporterService;

  // RAG Use Cases
  searchHybridRAGUseCase: SearchHybridRAGUseCase;
  ingestDocumentUseCase: IngestDocumentUseCase;
  generateProposalUseCase: GenerateProposalUseCase;

  // Proposal Use Cases
  createProposalUseCase: CreateProposalUseCase;
  getProposalByIdUseCase: GetProposalByIdUseCase;
  listProposalsUseCase: ListProposalsUseCase;
  updateProposalUseCase: UpdateProposalUseCase;
  updateProposalSheetUseCase: UpdateProposalSheetUseCase;
  deleteProposalUseCase: DeleteProposalUseCase;
  exportProposalToExcelUseCase: ExportProposalToExcelUseCase;
  exportProposalToPdfUseCase: ExportProposalToPdfUseCase;
  generateProposalSheetsUseCase: GenerateProposalSheetsUseCase;

  // Presentation Controllers
  ragController: RAGController;
  proposalController: ProposalController;
  leadIntakeController: LeadIntakeController;
  authController: AuthController;
  dashboardController: DashboardController;
}

export function createContainer(): ServiceContainer {
  // 1. Infrastructure layer
  const knowledgeRepository = new PostgresKnowledgeRepository(dbPool);
  const proposalRepository = new PostgresProposalRepository(dbPool);
  const authRepository = new PostgresAuthRepository(dbPool);
  const leadRepository = new PostgresLeadRepository(dbPool);
  const dashboardRepository = new PostgresDashboardRepository(dbPool);
  const embeddingGateway = new GeminiEmbeddingGateway();
  const llmGateway = new FastAPILMGateway();
  const excelExporterService = new ExcelProposalExporterService();
  const pdfExporterService = new PdfProposalExporterService();

  // 2. Application layer (Use Cases)
  const searchHybridRAGUseCase = new SearchHybridRAGUseCase(knowledgeRepository, embeddingGateway);
  const ingestDocumentUseCase = new IngestDocumentUseCase(knowledgeRepository, embeddingGateway);
  const generateProposalUseCase = new GenerateProposalUseCase(searchHybridRAGUseCase, llmGateway);
  const analyzeLeadIntakeUseCase = new AnalyzeLeadIntakeUseCase(llmGateway);
  const loginUseCase = new LoginUseCase(authRepository);
  const refreshSessionUseCase = new RefreshSessionUseCase(authRepository);
  const logoutUseCase = new LogoutUseCase(authRepository);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(authRepository);
  const forgotPasswordUseCase = new ForgotPasswordUseCase(authRepository);
  const resetPasswordUseCase = new ResetPasswordUseCase(authRepository);

  const createProposalUseCase = new CreateProposalUseCase(proposalRepository);
  const createProposalFromLeadUseCase = new CreateProposalFromLeadUseCase(leadRepository, createProposalUseCase);
  const getProposalByIdUseCase = new GetProposalByIdUseCase(proposalRepository);
  const listProposalsUseCase = new ListProposalsUseCase(proposalRepository);
  const updateProposalUseCase = new UpdateProposalUseCase(proposalRepository);
  const updateProposalSheetUseCase = new UpdateProposalSheetUseCase(proposalRepository);
  const deleteProposalUseCase = new DeleteProposalUseCase(proposalRepository);
  const exportProposalToExcelUseCase = new ExportProposalToExcelUseCase(proposalRepository, excelExporterService);
  const exportProposalToPdfUseCase = new ExportProposalToPdfUseCase(proposalRepository, pdfExporterService);
  const generateProposalSheetsUseCase = new GenerateProposalSheetsUseCase(
    proposalRepository, leadRepository, searchHybridRAGUseCase, llmGateway
  );

  // 3. Presentation layer (Controllers)
  const ragController = new RAGController(
    searchHybridRAGUseCase,
    ingestDocumentUseCase,
    generateProposalUseCase
  );

  const proposalController = new ProposalController(
    createProposalUseCase,
    createProposalFromLeadUseCase,
    getProposalByIdUseCase,
    listProposalsUseCase,
    updateProposalUseCase,
    updateProposalSheetUseCase,
    deleteProposalUseCase,
    exportProposalToExcelUseCase,
    generateProposalSheetsUseCase,
    exportProposalToPdfUseCase
  );
  const leadIntakeController = new LeadIntakeController(
    analyzeLeadIntakeUseCase,
    new CreateLeadUseCase(leadRepository),
    new ListLeadsUseCase(leadRepository),
    new GetLeadUseCase(leadRepository),
    new UpdateLeadUseCase(leadRepository),
    new UpdateLeadStatusUseCase(leadRepository),
    new DeleteLeadUseCase(leadRepository),
    new QualifyLeadUseCase(leadRepository, llmGateway),
    new GetLatestQualificationUseCase(leadRepository)
  );
  const authController = new AuthController(
    loginUseCase,
    refreshSessionUseCase,
    logoutUseCase,
    getCurrentUserUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase
  );
  const dashboardController = new DashboardController(
    new GetDashboardOverviewUseCase(dashboardRepository),
    new ListDashboardLeadsUseCase(dashboardRepository),
    new ListDashboardActivityUseCase(dashboardRepository)
  );

  return {
    knowledgeRepository,
    proposalRepository,
    authRepository,
    leadRepository,
    dashboardRepository,
    embeddingGateway,
    llmGateway,
    excelExporterService,
    pdfExporterService,

    searchHybridRAGUseCase,
    ingestDocumentUseCase,
    generateProposalUseCase,

    createProposalUseCase,
    getProposalByIdUseCase,
    listProposalsUseCase,
    updateProposalUseCase,
    updateProposalSheetUseCase,
    deleteProposalUseCase,
    exportProposalToExcelUseCase,
    exportProposalToPdfUseCase,
    generateProposalSheetsUseCase,

    ragController,
    proposalController,
    leadIntakeController,
    authController,
    dashboardController
  };
}

export const container = createContainer();
