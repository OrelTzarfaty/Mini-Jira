import type { CreateProjectInput, Project } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireProjectAccess } from '../../middleware/project-access.js';
import { requireUserId } from '../../middleware/require-auth.js';
import { toProjectResponse } from './projects.service.js';
import type { ProjectsService } from './projects.service.js';

// The body type is safe because validateBody(createProjectSchema) runs before this handler.
type CreateProjectHandler = RequestHandler<Record<string, string>, Project, CreateProjectInput>;
type GetProjectHandler = RequestHandler<{ projectKey: string }, Project>;

export interface ProjectsController {
  create: CreateProjectHandler;
  get: GetProjectHandler;
}

export function createProjectsController(projectsService: ProjectsService): ProjectsController {
  return {
    // PRJ-1: the creator becomes the project's OWNER.
    async create(req, res) {
      const userId = requireUserId(req);
      const project = await projectsService.createProject(userId, req.body);
      req.log.info({ userId, projectId: project.id }, 'Project created');
      res.status(201).json(project);
    },

    // PRJ-6: loadProjectAccess already loaded the project and checked the caller is a member.
    get(req, res) {
      const { project, role } = requireProjectAccess(req);
      res.json(toProjectResponse(project, role));
    },
  };
}
