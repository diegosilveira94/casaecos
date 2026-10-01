import { Router } from 'express';

import { authenticate } from '../../auth/middlewares/authenticate.js';
import { authorize } from '../../auth/middlewares/authorize.js';
import { personController } from '../controllers/person.controller.js';

export const personRouter: Router = Router();
export const roleRouter: Router = Router();

personRouter.use(authenticate.handle);

personRouter.get(
  '/',
  authorize('person:read'),
  personController.listValidator.handle,
  personController.list,
);
personRouter.get(
  '/:id',
  authorize('person:read'),
  personController.personIdValidator.handle,
  personController.getById,
);
personRouter.post(
  '/',
  authorize('person:write'),
  personController.createValidator.handle,
  personController.create,
);
personRouter.put(
  '/:id',
  authorize('person:write'),
  personController.updateValidator.handle,
  personController.update,
);
personRouter.patch(
  '/:id',
  authorize('person:write'),
  personController.updateValidator.handle,
  personController.update,
);
personRouter.delete(
  '/:id',
  authorize('person:write'),
  personController.personIdValidator.handle,
  personController.delete,
);

roleRouter.get('/', authenticate.handle, authorize('person:read'), personController.listRoles);
