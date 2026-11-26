/** A cleared date field gives "", which the API takes as no due date only when sent as null. */
export function emptyToNull(value: string | null): string | null {
  return value === '' ? null : value;
}
