import { Router } from 'express';

import { authenticate } from '../../auth/middlewares/authenticate.js';
import { authorize } from '../../auth/middlewares/authorize.js';
import { personController } from '../controllers/person.controller.js';

export const personRouter: Router = Router();
export const roleRouter: Router = Router();

personRouter.use(authenticate.handle);

personRouter.get('/', authorize('person:read'), personController.list);
personRouter.get('/:id', authorize('person:read'), personController.getById);
personRouter.post('/', authorize('person:write'), personController.create);
personRouter.put('/:id', authorize('person:write'), personController.update);
personRouter.patch('/:id', authorize('person:write'), personController.update);
personRouter.delete('/:id', authorize('person:write'), personController.delete);

roleRouter.get('/', authenticate.handle, authorize('person:read'), personController.listRoles);
