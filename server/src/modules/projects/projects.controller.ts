import { listProjectsQuerySchema } from '@mini-jira/shared';
import type {
  CreateProjectInput,
  Page,
  Project,
  ProjectDetail,
  ProjectListItem,
  UpdateProjectInput,
} from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireProjectAccess } from '../../middleware/project-access.js';
import { requireUserId } from '../../middleware/require-auth.js';
import { parseQuery } from '../../middleware/validate.js';
import type { ProjectsService } from './projects.service.js';

// The body type is safe because validateBody(createProjectSchema) runs before this handler.
type CreateProjectHandler = RequestHandler<Record<string, string>, Project, CreateProjectInput>;
type GetProjectHandler = RequestHandler<{ projectKey: string }, ProjectDetail>;
// The body type is safe because validateBody(updateProjectSchema) runs before this handler.
type UpdateProjectHandler = RequestHandler<
  { projectKey: string },
  ProjectDetail,
  UpdateProjectInput
>;
type ListProjectsHandler = RequestHandler<Record<string, string>, Page<ProjectListItem>>;

export interface ProjectsController {
  create: CreateProjectHandler;
  get: GetProjectHandler;
  list: ListProjectsHandler;
  update: UpdateProjectHandler;
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
    // PRJ-5: the answer includes the ticket count for the delete dialog.
    async get(req, res) {
      res.json(await projectsService.getProjectDetail(requireProjectAccess(req)));
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

    // PRJ-5: requireOwner already checked that the caller is the project's owner.
    async update(req, res) {
      const access = requireProjectAccess(req);
      const project = await projectsService.updateProject(access, req.body);
      req.log.info({ userId: requireUserId(req), projectId: project.id }, 'Project updated');
      res.json(project);
    },
  };
}
