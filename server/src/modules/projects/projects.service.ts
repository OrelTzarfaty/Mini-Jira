import { ErrorCode, PROJECT_KEY_TAKEN_MESSAGE, projectSchema, Role } from '@mini-jira/shared';
import type { CreateProjectInput, Project } from '@mini-jira/shared';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { ConflictError } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/prisma-errors.js';

export interface ProjectsService {
  /** Creates the project with the creator as its OWNER; throws 409 when the key is taken. */
  createProject(userId: string, input: CreateProjectInput): Promise<Project>;
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

        // Parsed through the shared schema, so internal fields (ticketCounter) never leave the API.
        return projectSchema.parse({
          ...project,
          role: Role.OWNER,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        });
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
  };
}
