import { Router } from 'express';

import { authenticate } from '../../auth/middlewares/authenticate.js';
import { authorize } from '../../auth/middlewares/authorize.js';
import { homeController } from '../controllers/home.controller.js';

export const homeRouter: Router = Router();
export const personHomeRouter: Router = Router();

homeRouter.use(authenticate.handle);

homeRouter.get(
  '/',
  authorize('home:read'),
  homeController.listValidator.handle,
  homeController.list,
);
homeRouter.post(
  '/',
  authorize('home:write'),
  homeController.createValidator.handle,
  homeController.create,
);
homeRouter.get(
  '/:homeId/people',
  authorize('home:read'),
  homeController.listPeopleValidator.handle,
  homeController.listPeople,
);
homeRouter.post(
  '/:homeId/people/:personId',
  authorize('home:write'),
  homeController.homePersonValidator.handle,
  homeController.linkPerson,
);
homeRouter.delete(
  '/:homeId/people/:personId',
  authorize('home:write'),
  homeController.homePersonValidator.handle,
  homeController.unlinkPerson,
);
homeRouter.get(
  '/:id',
  authorize('home:read'),
  homeController.homeIdValidator.handle,
  homeController.getById,
);
homeRouter.put(
  '/:id',
  authorize('home:write'),
  homeController.updateValidator.handle,
  homeController.update,
);
homeRouter.patch(
  '/:id',
  authorize('home:write'),
  homeController.updateValidator.handle,
  homeController.update,
);
homeRouter.delete(
  '/:id',
  authorize('home:write'),
  homeController.homeIdValidator.handle,
  homeController.delete,
);

personHomeRouter.get(
  '/:personId/homes',
  authenticate.handle,
  authorize('person:read'),
  homeController.listHomesValidator.handle,
  homeController.listHomes,
);
