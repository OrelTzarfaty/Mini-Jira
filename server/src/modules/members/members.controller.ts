import { paginationQuerySchema } from '@mini-jira/shared';
import type { MemberPage } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireProjectAccess } from '../../middleware/project-access.js';
import { parseQuery } from '../../middleware/validate.js';
import type { MembersService } from './members.service.js';

type ListMembersHandler = RequestHandler<{ projectKey: string }, MemberPage>;

export interface MembersController {
  list: ListMembersHandler;
}

export function createMembersController(membersService: MembersService): MembersController {
  return {
    // PRJ-3: any member may see who else is in the project. loadProjectAccess already ran, so
    // the query is checked only for members (400 for a bad page).
    async list(req, res) {
      const { project } = requireProjectAccess(req);
      const { page } = parseQuery(paginationQuerySchema, req.query);
      res.json(await membersService.listMembers(project.id, page));
    },
  };
}
