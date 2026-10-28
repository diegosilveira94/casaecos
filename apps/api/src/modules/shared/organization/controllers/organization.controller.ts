import type { RequestHandler } from 'express';

import { organizationService } from '../services/organization.service.js';

export class OrganizationController {
  list: RequestHandler = async (_request, response) => {
    response.json(await organizationService.list());
  };
}

export const organizationController = new OrganizationController();
