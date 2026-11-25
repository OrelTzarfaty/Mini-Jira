import {
  ErrorCode,
  PROJECT_KEY_TAKEN_MESSAGE,
  PROJECT_NOT_FOUND_MESSAGE,
  projectDetailSchema,
  projectListItemSchema,
  projectSchema,
  Role,
} from '@mini-jira/shared';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  Page,
  Project,
  ProjectDetail,
  ProjectListItem,
  UpdateProjectInput,
} from '@mini-jira/shared';

import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient, Project as ProjectRow } from '../../generated/prisma/client.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { pageWindow, toPage } from '../../lib/pagination.js';
import { isRecordNotFound, isUniqueViolation } from '../../lib/prisma-errors.js';

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
  /** PRJ-5: the project loaded by loadProjectAccess, with the caller's role and its ticket count. */
  getProjectDetail(access: ProjectAccess): Promise<ProjectDetail>;
  /**
   * PRJ-5: changes the name and/or description (a missing field stays as it is). Throws 404
   * when the project was deleted after loadProjectAccess found it.
   */
  updateProject(access: ProjectAccess, input: UpdateProjectInput): Promise<ProjectDetail>;
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

/**
 * PRJ-2: Prisma's `contains` puts the text into an (I)LIKE pattern without escaping it, so `%` and
 * `_` would work as wildcards (a search for "%" would match every project). A backslash before
 * them makes them plain characters; PostgreSQL's default LIKE escape character is the backslash,
 * so a backslash typed by the user is escaped too.
 */
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

// PRJ-5: the project was deleted between loadProjectAccess and the write; the caller gets the
// same 404 a later request would get.
const projectNotFound = (): NotFoundError => new NotFoundError(PROJECT_NOT_FOUND_MESSAGE);

export function createProjectsService(prisma: PrismaClient): ProjectsService {
  /** PRJ-5: the number of tickets in the project (every status), for the delete dialog. */
  function countTickets(projectId: string): Promise<number> {
    // TODO(TKT-1): there is no Ticket model yet, so every project has 0 tickets. Replace with
    // prisma.ticket.count({ where: { projectId } }) once tickets exist (the projectId index
    // serves it).
    void projectId;

    return Promise.resolve(0);
  }

  async function toProjectDetail(project: ProjectRow, role: Role): Promise<ProjectDetail> {
    return projectDetailSchema.parse({
      ...toProjectResponse(project, role),
      ticketCount: await countTickets(project.id),
    });
  }

  /**
   * PRJ-2: the number of open tickets (status not DONE) in each of these projects, for the
   * project cards. Projects missing from the map have none.
   */
  function countOpenTickets(projectIds: readonly string[]): Promise<ReadonlyMap<string, number>> {
    // TODO(TKT-1): there is no Ticket model yet, so every project has 0 open tickets. Replace
    // with one grouped query once tickets exist:
    // prisma.ticket.groupBy({ by: ['projectId'], where: { projectId: { in: projectIds }, status: { not: 'DONE' } }, _count: true })
    return Promise.resolve(new Map(projectIds.map((projectId) => [projectId, 0])));
  }

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
    // The ProjectMember userId index finds them. The page and the total are read in one
    // transaction.
    // `q` (optional) keeps the projects whose name or key contains it, in any letter case (ILIKE).
    //
    // Sort: by name ignoring letter case, then by the exact name, then by the unique key, so the
    // order is total and a project never shows on two pages or on none. Prisma's orderBy can't
    // call lower(), so one parameterised raw query picks the page of project ids in that order,
    // and Prisma loads those rows. Both name sorts use the "C" collation (byte order), because a
    // plain ORDER BY name follows the database collation, which differs between our Docker image
    // (byte order: "Website" before "api") and other servers such as RDS. lower() makes "api"
    // and "API" sort together on every database.
    async listMyProjects(userId, { page, q }) {
      const search = q === undefined ? undefined : escapeLikePattern(q);
      const where: Prisma.ProjectMemberWhereInput = {
        userId,
        ...(search === undefined
          ? {}
          : {
              project: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { key: { contains: search, mode: 'insensitive' } },
                ],
              },
            }),
      };
      // The same filter as `where`, in SQL: Prisma's insensitive `contains` is ILIKE '%text%'.
      const searchFilter =
        search === undefined
          ? Prisma.empty
          : Prisma.sql`AND (p."name" ILIKE '%' || ${search} || '%' OR p."key" ILIKE '%' || ${search} || '%')`;

      const { skip, take } = pageWindow(page);
      const { memberships, total } = await prisma.$transaction(async (tx) => {
        const pageIds = await tx.$queryRaw<{ id: string }[]>`
          SELECT p."id"
          FROM "ProjectMember" pm
          JOIN "Project" p ON p."id" = pm."projectId"
          WHERE pm."userId" = ${userId}::uuid ${searchFilter}
          ORDER BY lower(p."name") COLLATE "C", p."name" COLLATE "C", p."key" COLLATE "C"
          LIMIT ${take} OFFSET ${skip}`;
        const ids = pageIds.map(({ id }) => id);
        const rows = await tx.projectMember.findMany({
          where: { userId, projectId: { in: ids } },
          select: { role: true, project: true },
        });
        // findMany with `in` has no order, so put the rows back in the order of the page.
        const rowById = new Map(rows.map((row) => [row.project.id, row]));

        return {
          memberships: ids.flatMap((id) => rowById.get(id) ?? []),
          total: await tx.projectMember.count({ where }),
        };
      });

      // One count query for the whole page, not one per project.
      const openTicketCounts = await countOpenTickets(memberships.map(({ project }) => project.id));

      // A page past the end is still a 200 with no items and the real totals.
      return toPage(
        memberships.map(({ project, role }) =>
          projectListItemSchema.parse({
            ...toProjectResponse(project, role),
            openTicketCount: openTicketCounts.get(project.id) ?? 0,
          }),
        ),
        total,
        page,
      );
    },

    getProjectDetail({ project, role }) {
      return toProjectDetail(project, role);
    },

    // PRJ-5: requireOwner already checked the caller. Only the fields the client sent are
    // written; the key is not in the schema, so it can never change here (architecture §11 #1).
    // Last write wins: editing project details doesn't use the CON-1 conflict check, which is
    // for tickets.
    async updateProject({ project, role }, { name, description }) {
      try {
        const updated = await prisma.project.update({
          where: { id: project.id },
          data: {
            ...(name === undefined ? {} : { name }),
            ...(description === undefined ? {} : { description }),
          },
        });

        return await toProjectDetail(updated, role);
      } catch (error) {
        if (isRecordNotFound(error)) {
          throw projectNotFound();
        }
        throw error;
      }
    },
  };
}
