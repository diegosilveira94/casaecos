import { Router } from 'express';

import { authenticate } from '../../shared/auth/middlewares/authenticate.js';
import { authorize } from '../../shared/auth/middlewares/authorize.js';
import { eventController } from '../controllers/event.controller.js';

// person_event lands in ECOS-7.
export const agendaRouter: Router = Router();

agendaRouter.use(authenticate.handle);

agendaRouter.get('/event-types', authorize('event:read'), eventController.listEventTypes);
agendaRouter.get(
  '/events',
  authorize('event:read'),
  eventController.listValidator.handle,
  eventController.list,
);

agendaRouter.post(
  '/events',
  authorize('event:write'),
  eventController.createValidator.handle,
  eventController.create,
);
agendaRouter.get(
  '/events/:id',
  authorize('event:read'),
  eventController.eventIdValidator.handle,
  eventController.getById,
);
agendaRouter.put(
  '/events/:id',
  authorize('event:write'),
  eventController.updateValidator.handle,
  eventController.update,
);
agendaRouter.patch(
  '/events/:id',
  authorize('event:write'),
  eventController.updateValidator.handle,
  eventController.update,
);
agendaRouter.delete(
  '/events/:id',
  authorize('event:write'),
  eventController.eventIdValidator.handle,
  eventController.delete,
);
