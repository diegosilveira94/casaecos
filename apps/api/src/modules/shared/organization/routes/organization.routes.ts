import { Router } from 'express';

import { authenticate } from '../../auth/middlewares/authenticate.js';
import { authorize } from '../../auth/middlewares/authorize.js';
import { organizationController } from '../controllers/organization.controller.js';

export const organizationRouter: Router = Router();

// Read by the home form, which needs the organization a new home belongs to.
organizationRouter.get(
  '/',
  authenticate.handle,
  authorize('home:write'),
  organizationController.list,
);
