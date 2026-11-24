import { PROJECT_KEY_MAX_LENGTH } from '@mini-jira/shared';

/**
 * What the Key field keeps of what was typed or pasted (wireframe 02 D): uppercase letters A–Z
 * only, at most 6. The server checks the key again; this only saves the user a round trip.
 */
export function toProjectKeyCharacters(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, PROJECT_KEY_MAX_LENGTH);
}
