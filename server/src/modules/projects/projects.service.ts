import {
  ErrorCode,
  PAGE_SIZE,
  PROJECT_KEY_TAKEN_MESSAGE,
  projectListItemSchema,
  projectSchema,
  Role,
} from '@mini-jira/shared';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  Page,
  Project,
  ProjectListItem,
} from '@mini-jira/shared';

import type { PrismaClient, Project as ProjectRow } from '../../generated/prisma/client.js';
import { ConflictError } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/prisma-errors.js';

export interface ProjectsService {
  /** Creates the project with the creator as its OWNER; throws 409 when the key is taken. */
  createProject(userId: string, input: CreateProjectInput): Promise<Project>;
  /**
   * PRJ-6: the project with this exact key and the caller's role in it, or null when the
   * project doesn't exist **or** the caller isn't a member (the caller can't tell which).
   */
  findProjectAccess(userId: string, projectKey: string): Promise<ProjectAccess | null>;
  /** PRJ-2: one page of the projects the caller is a member of, with the caller's role in each. */
  listMyProjects(userId: string, query: ListProjectsQuery): Promise<Page<ProjectListItem>>;
}

/** PRJ-6: what loadProjectAccess puts on the request: the project row and the caller's role. */
export interface ProjectAccess {
  project: ProjectRow;
  role: Role;
}

/**
 * The API shape of a project for a caller with this role. Parsed through the shared schema, so
 * internal fields (ticketCounter) never leave the API.
 */
export function toProjectResponse(project: ProjectRow, role: Role): Project {
  return projectSchema.parse({
    ...project,
    role,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
}

// PRJ-1: the client shows this under the Key field (wireframe 02 D).
const projectKeyTaken = (): ConflictError =>
  new ConflictError(ErrorCode.PROJECT_KEY_TAKEN, PROJECT_KEY_TAKEN_MESSAGE, [
    { field: 'key', message: PROJECT_KEY_TAKEN_MESSAGE },
  ]);

export function createProjectsService(prisma: PrismaClient): ProjectsService {
  return {
    // PRJ-1: the schema already trimmed the input and uppercased the key, so the unique index
    // on key also blocks the same key in another letter case.
    async createProject(userId, { key, name, description }) {
      try {
        // One transaction: a project never exists without its owner, and a failed membership
        // insert rolls the project back (architecture §8, "Ownership").
        const project = await prisma.$transaction(async (tx) => {
          const created = await tx.project.create({ data: { key, name, description } });
          await tx.projectMember.create({
            data: { projectId: created.id, userId, role: Role.OWNER },
          });

          return created;
        });

        return toProjectResponse(project, Role.OWNER);
      } catch (error) {
        // No "is the key free?" read first: it would still race with a create at the same
        // moment, so the unique index is the one source of truth. The key is the only unique
        // value a client controls here (the IDs are generated), so this always means "taken".
        if (isUniqueViolation(error)) {
          throw projectKeyTaken();
        }
        throw error;
      }
    },

    // PRJ-6 (architecture §6): one lookup loads the caller's membership in the project with
    // this exact key, together with the project row. The unique key index finds the project and
    // the (projectId, userId) primary key the membership. Prisma sends it as two short SQL
    // statements (the membership join, then the project row), and both always run, found or not.
    // A missing project and a non-member both find no row, so they return the same null and the
    // caller can't tell them apart.
    async findProjectAccess(userId, projectKey) {
      return prisma.projectMember.findFirst({
        where: { userId, project: { key: projectKey } },
        select: { role: true, project: true },
      });
    },

    // PRJ-2: the caller's memberships are the list, so another user's project can never appear.
    // The ProjectMember userId index finds them. Sorted on the server by name, then by the unique
    // key, so the order is total and a project never shows on two pages or on none. The page and
    // the total are read in one transaction.
    async listMyProjects(userId, { page }) {
      const where = { userId };
      const [memberships, total] = await prisma.$transaction([
        prisma.projectMember.findMany({
          where,
          select: { role: true, project: true },
          orderBy: [{ project: { name: 'asc' } }, { project: { key: 'asc' } }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.projectMember.count({ where }),
      ]);

      return {
        items: memberships.map(({ project, role }) =>
          projectListItemSchema.parse(toProjectResponse(project, role)),
        ),
        page,
        pageSize: PAGE_SIZE,
        total,
        // A page past the end is still a 200 with no items and the real totals.
        totalPages: Math.ceil(total / PAGE_SIZE),
      };
    },
  };
}
