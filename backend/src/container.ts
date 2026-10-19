import { dbPool } from './infrastructure/database/connection.js';
import { PostgresKnowledgeRepository } from './infrastructure/database/repositories/PostgresKnowledgeRepository.js';
import { PostgresProposalRepository } from './infrastructure/database/repositories/PostgresProposalRepository.js';
import { GeminiEmbeddingGateway } from './infrastructure/ai/GeminiEmbeddingGateway.js';
import { FastAPILMGateway } from './infrastructure/ai/FastAPILMGateway.js';
import { ExcelProposalExporterService } from './infrastructure/services/ExcelProposalExporterService.js';

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

export interface ServiceContainer {
  knowledgeRepository: PostgresKnowledgeRepository;
  proposalRepository: PostgresProposalRepository;
  authRepository: PostgresAuthRepository;
  embeddingGateway: GeminiEmbeddingGateway;
  llmGateway: FastAPILMGateway;
  excelExporterService: ExcelProposalExporterService;

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

  // Presentation Controllers
  ragController: RAGController;
  proposalController: ProposalController;
  leadIntakeController: LeadIntakeController;
  authController: AuthController;
}

export function createContainer(): ServiceContainer {
  // 1. Infrastructure layer
  const knowledgeRepository = new PostgresKnowledgeRepository(dbPool);
  const proposalRepository = new PostgresProposalRepository(dbPool);
  const authRepository = new PostgresAuthRepository(dbPool);
  const embeddingGateway = new GeminiEmbeddingGateway();
  const llmGateway = new FastAPILMGateway();
  const excelExporterService = new ExcelProposalExporterService();

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
  const getProposalByIdUseCase = new GetProposalByIdUseCase(proposalRepository);
  const listProposalsUseCase = new ListProposalsUseCase(proposalRepository);
  const updateProposalUseCase = new UpdateProposalUseCase(proposalRepository);
  const updateProposalSheetUseCase = new UpdateProposalSheetUseCase(proposalRepository);
  const deleteProposalUseCase = new DeleteProposalUseCase(proposalRepository);
  const exportProposalToExcelUseCase = new ExportProposalToExcelUseCase(proposalRepository, excelExporterService);

  // 3. Presentation layer (Controllers)
  const ragController = new RAGController(
    searchHybridRAGUseCase,
    ingestDocumentUseCase,
    generateProposalUseCase
  );

  const proposalController = new ProposalController(
    createProposalUseCase,
    getProposalByIdUseCase,
    listProposalsUseCase,
    updateProposalUseCase,
    updateProposalSheetUseCase,
    deleteProposalUseCase,
    exportProposalToExcelUseCase
  );
  const leadIntakeController = new LeadIntakeController(analyzeLeadIntakeUseCase);
  const authController = new AuthController(
    loginUseCase,
    refreshSessionUseCase,
    logoutUseCase,
    getCurrentUserUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase
  );

  return {
    knowledgeRepository,
    proposalRepository,
    authRepository,
    embeddingGateway,
    llmGateway,
    excelExporterService,

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

    ragController,
    proposalController,
    leadIntakeController,
    authController
  };
}

export const container = createContainer();
