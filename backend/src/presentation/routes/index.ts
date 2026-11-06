import { Router } from 'express';
import { RAGController } from '../controllers/RAGController.js';
import { ProposalController } from '../controllers/ProposalController.js';
import { LeadIntakeController } from '../controllers/LeadIntakeController.js';
import { MeetingController } from '../controllers/MeetingController.js';
import { AuthController } from '../controllers/AuthController.js';
import { UserController } from '../controllers/UserController.js';
import { DashboardController } from '../controllers/DashboardController.js';

import { createRAGRouter } from './ragRoutes.js';
import { createProposalRouter } from './proposalRoutes.js';
import { createLeadIntakeRouter } from './leadIntakeRoutes.js';
import { createMeetingRouter } from './meetingRoutes.js';
import { createAuthRouter } from './authRoutes.js';
import { createUserRouter } from './userRoutes.js';
import { createDashboardRouter } from './dashboardRoutes.js';

export function createApiRouter(
  ragController: RAGController,
  proposalController: ProposalController,
  leadIntakeController: LeadIntakeController,
  meetingController?: MeetingController,
  authController?: AuthController,
  userController?: UserController,
  dashboardController?: DashboardController
): Router {
  const router = Router();

  if (authController) {
    router.use('/auth', createAuthRouter(authController));
  }
  if (userController) {
    router.use('/users', createUserRouter(userController));
  }
  if (dashboardController) {
    router.use('/dashboard', createDashboardRouter(dashboardController));
  }
  router.use('/rag', createRAGRouter(ragController));
  router.use('/proposals', createProposalRouter(proposalController));
  router.use('/leads', createLeadIntakeRouter(leadIntakeController));
  if (meetingController) {
    router.use('/meetings', createMeetingRouter(meetingController));
  }

  return router;
}
