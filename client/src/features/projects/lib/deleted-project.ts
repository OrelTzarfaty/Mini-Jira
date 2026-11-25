import { z } from 'zod';

/**
 * What the settings page hands to My Projects after deleting a project (PRJ-5), as the history
 * entry's state, so My Projects can say "Project WEB deleted" (wireframe 06 D).
 */
const deletedProjectStateSchema = z.object({ deletedProjectKey: z.string() });

export type DeletedProjectState = z.infer<typeof deletedProjectStateSchema>;

export function deletedProjectState(projectKey: string): DeletedProjectState {
  return { deletedProjectKey: projectKey };
}

/**
 * The deleted project's key from a history entry's state, or undefined. The state can be
 * anything (another page's state, or none), so it is checked rather than trusted.
 */
export function deletedProjectKeyFrom(state: unknown): string | undefined {
  const parsed = deletedProjectStateSchema.safeParse(state);

  return parsed.success ? parsed.data.deletedProjectKey : undefined;
}
