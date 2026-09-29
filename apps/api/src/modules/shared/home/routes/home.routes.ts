import { Router } from 'express';

import { authenticate } from '../../auth/middlewares/authenticate.js';
import { authorize } from '../../auth/middlewares/authorize.js';
import { homeController } from '../controllers/home.controller.js';

export const homeRouter: Router = Router();
export const personHomeRouter: Router = Router();

homeRouter.use(authenticate.handle);

homeRouter.get('/', authorize('home:read'), homeController.list);
homeRouter.post('/', authorize('home:write'), homeController.create);
homeRouter.get('/:homeId/people', authorize('home:read'), homeController.listPeople);
homeRouter.post('/:homeId/people/:personId', authorize('home:write'), homeController.linkPerson);
homeRouter.delete(
  '/:homeId/people/:personId',
  authorize('home:write'),
  homeController.unlinkPerson,
);
homeRouter.get('/:id', authorize('home:read'), homeController.getById);
homeRouter.put('/:id', authorize('home:write'), homeController.update);
homeRouter.patch('/:id', authorize('home:write'), homeController.update);
homeRouter.delete('/:id', authorize('home:write'), homeController.delete);

personHomeRouter.get(
  '/:personId/homes',
  authenticate.handle,
  authorize('person:read'),
  homeController.listHomes,
);
