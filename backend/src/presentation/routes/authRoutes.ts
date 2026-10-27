import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);
  router.post('/forgot-password', controller.forgotPassword);
  router.post('/reset-password', controller.resetPassword);
  return router;
}
