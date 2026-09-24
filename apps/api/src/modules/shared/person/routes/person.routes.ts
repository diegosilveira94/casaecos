import { Router } from 'express';

import { personController } from '../controllers/person.controller.js';

export const personRouter: Router = Router();
export const roleRouter: Router = Router();

personRouter.get('/', personController.listValidator.handle, personController.list);
personRouter.get('/:id', personController.personIdValidator.handle, personController.getById);
personRouter.post('/', personController.createValidator.handle, personController.create);
personRouter.put('/:id', personController.updateValidator.handle, personController.update);
personRouter.patch('/:id', personController.updateValidator.handle, personController.update);
personRouter.delete('/:id', personController.personIdValidator.handle, personController.delete);

roleRouter.get('/', personController.listRoles);
