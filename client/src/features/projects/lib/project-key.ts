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

// One word gives its first three letters as the key: "Documentation" → DOC (wireframe 02 D).
const SINGLE_WORD_KEY_LENGTH = 3;

/**
 * The key the popup suggests while the user types the name (wireframe 02 D): the first letter
 * of each word (at most 6) for two or more words, the first three letters of a single word.
 * Only the letters A–Z count, so "Mobile App 2.0" → MA and a name without them gives ''.
 */
export function suggestProjectKey(name: string): string {
  const words = name
    .toUpperCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Z]/g, ''))
    .filter((word) => word !== '');
  const [firstWord] = words;

  if (firstWord === undefined) {
    return '';
  }

  if (words.length === 1) {
    return firstWord.slice(0, SINGLE_WORD_KEY_LENGTH);
  }

  return words
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, PROJECT_KEY_MAX_LENGTH);
}
