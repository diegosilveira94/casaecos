import { Router } from 'express';

import { personController } from '../controllers/person.controller.js';

export const personRouter: Router = Router();
export const roleRouter: Router = Router();

personRouter.get('/', personController.list);
personRouter.get('/:id', personController.getById);
personRouter.post('/', personController.create);
personRouter.put('/:id', personController.update);
personRouter.patch('/:id', personController.update);
personRouter.delete('/:id', personController.delete);

roleRouter.get('/', personController.listRoles);
