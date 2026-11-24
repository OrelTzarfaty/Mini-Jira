import { paginationQuerySchema } from '@mini-jira/shared';
import type { AddMemberInput, Member, MemberPage } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireProjectAccess } from '../../middleware/project-access.js';
import { requireUserId } from '../../middleware/require-auth.js';
import { parseQuery } from '../../middleware/validate.js';
import type { MembersService } from './members.service.js';

type ListMembersHandler = RequestHandler<{ projectKey: string }, MemberPage>;
// The body type is safe because validateBody(addMemberSchema) runs before this handler.
type AddMemberHandler = RequestHandler<{ projectKey: string }, Member, AddMemberInput>;

export interface MembersController {
  list: ListMembersHandler;
  add: AddMemberHandler;
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

    // PRJ-3: requireOwner already checked that the caller is the project's owner.
    async add(req, res) {
      const { project } = requireProjectAccess(req);
      const member = await membersService.addMember(project.id, req.body);
      req.log.info(
        { userId: requireUserId(req), projectId: project.id, memberUserId: member.userId },
        'Project member added',
      );
      res.status(201).json(member);
    },
  };
}
