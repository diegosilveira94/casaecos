import { Router } from 'express';

import { homeController } from '../controllers/home.controller.js';

export const homeRouter: Router = Router();
export const personHomeRouter: Router = Router();

homeRouter.get('/', homeController.list);
homeRouter.post('/', homeController.create);
homeRouter.get('/:homeId/people', homeController.listPeople);
homeRouter.post('/:homeId/people/:personId', homeController.linkPerson);
homeRouter.delete('/:homeId/people/:personId', homeController.unlinkPerson);
homeRouter.get('/:id', homeController.getById);
homeRouter.put('/:id', homeController.update);
homeRouter.patch('/:id', homeController.update);
homeRouter.delete('/:id', homeController.delete);

personHomeRouter.get('/:personId/homes', homeController.listHomes);
