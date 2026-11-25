import { listProjectsQuerySchema } from '@mini-jira/shared';
import type { CreateProjectInput, Page, Project, ProjectListItem } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireProjectAccess } from '../../middleware/project-access.js';
import { requireUserId } from '../../middleware/require-auth.js';
import { parseQuery } from '../../middleware/validate.js';
import { toProjectResponse } from './projects.service.js';
import type { ProjectsService } from './projects.service.js';

// The body type is safe because validateBody(createProjectSchema) runs before this handler.
type CreateProjectHandler = RequestHandler<Record<string, string>, Project, CreateProjectInput>;
type GetProjectHandler = RequestHandler<{ projectKey: string }, Project>;
type ListProjectsHandler = RequestHandler<Record<string, string>, Page<ProjectListItem>>;

export interface ProjectsController {
  create: CreateProjectHandler;
  get: GetProjectHandler;
  list: ListProjectsHandler;
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

    // PRJ-2: the caller's own projects; user-specific, so no browser or shared cache keeps it.
    async list(req, res) {
      const userId = requireUserId(req);
      // Parsed after requireAuth, so a visitor gets 401 before any validation message.
      const query = parseQuery(listProjectsQuerySchema, req.query);
      const page = await projectsService.listMyProjects(userId, query);
      res.set('Cache-Control', 'no-store');
      res.json(page);
    },
  };
}
