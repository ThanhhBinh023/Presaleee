import { dbPool } from './infrastructure/database/connection.js';
import { PostgresKnowledgeRepository } from './infrastructure/database/repositories/PostgresKnowledgeRepository.js';
import { PostgresProposalRepository } from './infrastructure/database/repositories/PostgresProposalRepository.js';
import { PostgresMeetingRepository } from './infrastructure/database/repositories/PostgresMeetingRepository.js';
import { PostgresAuthRepository } from './infrastructure/database/repositories/PostgresAuthRepository.js';
import { PostgresUserRepository } from './infrastructure/database/repositories/PostgresUserRepository.js';
import { PostgresAuditRepository } from './infrastructure/database/repositories/PostgresAuditRepository.js';
import { PostgresDashboardRepository } from './infrastructure/database/repositories/PostgresDashboardRepository.js';

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
import { GenerateProposalFromLeadUseCase } from './application/use-cases/GenerateProposalFromLeadUseCase.js';

import { AnalyzeLeadIntakeUseCase } from './application/use-cases/AnalyzeLeadIntakeUseCase.js';

import { CreateMeetingUseCase } from './application/use-cases/CreateMeetingUseCase.js';
import { InspectMeetingUseCase } from './application/use-cases/InspectMeetingUseCase.js';
import { UpdateMeetingLifecycleUseCase } from './application/use-cases/UpdateMeetingLifecycleUseCase.js';
import { ListMeetingsByLeadUseCase } from './application/use-cases/ListMeetingsByLeadUseCase.js';
import { GetMeetingByIdUseCase } from './application/use-cases/GetMeetingByIdUseCase.js';

import {
  LoginUseCase,
  RefreshSessionUseCase,
  LogoutUseCase,
  GetCurrentUserUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase
} from './application/use-cases/AuthUseCases.js';
import {
  RegisterUseCase,
  ListOrganizationsUseCase,
  ListMembersUseCase,
  GetMemberUseCase,
  AddMemberUseCase,
  UpdateMemberUseCase,
  UpdateOwnProfileUseCase
} from './application/use-cases/UserUseCases.js';
import {
  GetDashboardOverviewUseCase,
  ListDashboardLeadsUseCase,
  ListDashboardActivityUseCase
} from './application/use-cases/DashboardUseCases.js';

import { RAGController } from './presentation/controllers/RAGController.js';
import { ProposalController } from './presentation/controllers/ProposalController.js';
import { LeadIntakeController } from './presentation/controllers/LeadIntakeController.js';
import { MeetingController } from './presentation/controllers/MeetingController.js';
import { AuthController } from './presentation/controllers/AuthController.js';
import { UserController } from './presentation/controllers/UserController.js';
import { DashboardController } from './presentation/controllers/DashboardController.js';

export interface ServiceContainer {
  knowledgeRepository: PostgresKnowledgeRepository;
  proposalRepository: PostgresProposalRepository;
  meetingRepository: PostgresMeetingRepository;
  authRepository: PostgresAuthRepository;
  userRepository: PostgresUserRepository;
  auditRepository: PostgresAuditRepository;
  dashboardRepository: PostgresDashboardRepository;

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
  generateProposalFromLeadUseCase: GenerateProposalFromLeadUseCase;

  // Lead Intake Use Cases
  analyzeLeadIntakeUseCase: AnalyzeLeadIntakeUseCase;

  // Meeting Use Cases
  createMeetingUseCase: CreateMeetingUseCase;
  inspectMeetingUseCase: InspectMeetingUseCase;
  updateMeetingLifecycleUseCase: UpdateMeetingLifecycleUseCase;
  listMeetingsByLeadUseCase: ListMeetingsByLeadUseCase;
  getMeetingByIdUseCase: GetMeetingByIdUseCase;

  // Presentation Controllers
  ragController: RAGController;
  proposalController: ProposalController;
  leadIntakeController: LeadIntakeController;
  meetingController: MeetingController;
  authController: AuthController;
  userController: UserController;
  dashboardController: DashboardController;
}

export function createContainer(): ServiceContainer {
  // 1. Infrastructure layer
  const knowledgeRepository = new PostgresKnowledgeRepository(dbPool);
  const proposalRepository = new PostgresProposalRepository(dbPool);
  const meetingRepository = new PostgresMeetingRepository(dbPool);
  const authRepository = new PostgresAuthRepository(dbPool);
  const userRepository = new PostgresUserRepository(dbPool);
  const auditRepository = new PostgresAuditRepository(dbPool);
  const dashboardRepository = new PostgresDashboardRepository(dbPool);

  const embeddingGateway = new GeminiEmbeddingGateway();
  const llmGateway = new FastAPILMGateway();
  const excelExporterService = new ExcelProposalExporterService();

  // 2. Application layer (Use Cases)
  const searchHybridRAGUseCase = new SearchHybridRAGUseCase(knowledgeRepository, embeddingGateway);
  const ingestDocumentUseCase = new IngestDocumentUseCase(knowledgeRepository, embeddingGateway);
  const generateProposalUseCase = new GenerateProposalUseCase(searchHybridRAGUseCase, llmGateway);
  const analyzeLeadIntakeUseCase = new AnalyzeLeadIntakeUseCase(llmGateway);

  const createProposalUseCase = new CreateProposalUseCase(proposalRepository);
  const getProposalByIdUseCase = new GetProposalByIdUseCase(proposalRepository);
  const listProposalsUseCase = new ListProposalsUseCase(proposalRepository);
  const updateProposalUseCase = new UpdateProposalUseCase(proposalRepository);
  const updateProposalSheetUseCase = new UpdateProposalSheetUseCase(proposalRepository);
  const deleteProposalUseCase = new DeleteProposalUseCase(proposalRepository);
  const exportProposalToExcelUseCase = new ExportProposalToExcelUseCase(proposalRepository, excelExporterService);
  const generateProposalFromLeadUseCase = new GenerateProposalFromLeadUseCase(
    proposalRepository,
    searchHybridRAGUseCase,
    llmGateway,
    dbPool
  );

  const createMeetingUseCase = new CreateMeetingUseCase(meetingRepository);
  const inspectMeetingUseCase = new InspectMeetingUseCase(meetingRepository, llmGateway, dbPool);
  const updateMeetingLifecycleUseCase = new UpdateMeetingLifecycleUseCase(meetingRepository);
  const listMeetingsByLeadUseCase = new ListMeetingsByLeadUseCase(meetingRepository);
  const getMeetingByIdUseCase = new GetMeetingByIdUseCase(meetingRepository);

  const loginUseCase = new LoginUseCase(authRepository);
  const refreshSessionUseCase = new RefreshSessionUseCase(authRepository);
  const logoutUseCase = new LogoutUseCase(authRepository);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(authRepository);
  const forgotPasswordUseCase = new ForgotPasswordUseCase(authRepository);
  const resetPasswordUseCase = new ResetPasswordUseCase(authRepository);
  const registerUseCase = new RegisterUseCase(userRepository, authRepository, auditRepository);

  const getDashboardOverviewUseCase = new GetDashboardOverviewUseCase(dashboardRepository);
  const listDashboardLeadsUseCase = new ListDashboardLeadsUseCase(dashboardRepository);
  const listDashboardActivityUseCase = new ListDashboardActivityUseCase(dashboardRepository);

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
    exportProposalToExcelUseCase,
    generateProposalFromLeadUseCase,
    proposalRepository
  );

  const leadIntakeController = new LeadIntakeController(analyzeLeadIntakeUseCase, dbPool, llmGateway);

  const meetingController = new MeetingController(
    createMeetingUseCase,
    inspectMeetingUseCase,
    updateMeetingLifecycleUseCase,
    listMeetingsByLeadUseCase,
    getMeetingByIdUseCase,
    meetingRepository
  );

  const authController = new AuthController(
    loginUseCase,
    refreshSessionUseCase,
    logoutUseCase,
    getCurrentUserUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase,
    registerUseCase
  );

  const userController = new UserController(
    new ListOrganizationsUseCase(userRepository),
    new ListMembersUseCase(userRepository),
    new GetMemberUseCase(userRepository),
    new AddMemberUseCase(userRepository, authRepository, auditRepository),
    new UpdateMemberUseCase(userRepository, auditRepository),
    new UpdateOwnProfileUseCase(authRepository, userRepository, auditRepository)
  );

  const dashboardController = new DashboardController(
    getDashboardOverviewUseCase,
    listDashboardLeadsUseCase,
    listDashboardActivityUseCase
  );

  return {
    knowledgeRepository,
    proposalRepository,
    meetingRepository,
    authRepository,
    userRepository,
    auditRepository,
    dashboardRepository,
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
    generateProposalFromLeadUseCase,
    analyzeLeadIntakeUseCase,
    createMeetingUseCase,
    inspectMeetingUseCase,
    updateMeetingLifecycleUseCase,
    listMeetingsByLeadUseCase,
    getMeetingByIdUseCase,
    ragController,
    proposalController,
    leadIntakeController,
    meetingController,
    authController,
    userController,
    dashboardController
  };
}

export const container = createContainer();
