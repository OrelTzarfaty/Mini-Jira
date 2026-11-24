import type { CreateProjectInput, Project } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireUserId } from '../../middleware/require-auth.js';
import type { ProjectsService } from './projects.service.js';

// The body type is safe because validateBody(createProjectSchema) runs before this handler.
type CreateProjectHandler = RequestHandler<Record<string, string>, Project, CreateProjectInput>;

export interface ProjectsController {
  create: CreateProjectHandler;
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
  };
}
