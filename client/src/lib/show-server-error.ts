import type { ErrorDetail } from '@mini-jira/shared';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/api/api-error';

const UNKNOWN_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** The message to show for a failed request: the API's own, or a general one for anything else. */
export function serverErrorMessage(error: Error): string {
  return error instanceof ApiError ? error.message : UNKNOWN_ERROR_MESSAGE;
}

interface ServerErrorOptions<T extends FieldValues> {
  /** The form's field names (schema.keyof().options), to match the server's details[].field. */
  fields: readonly FieldPath<T>[];
  /**
   * Shows the errors this form knows by code, such as a taken email. Returns true when it
   * showed the error, so the general rules below are skipped.
   */
  showKnownError?: (error: ApiError) => boolean;
}

/**
 * Shows a failed form submit next to what caused it: the form's own known errors first, then
 * the server's field details under their fields, and anything else as one alert
 * (errors.root.server). setError only adds messages, so everything the user typed stays.
 */
export function showServerError<T extends FieldValues>(
  error: Error,
  setError: UseFormSetError<T>,
  { fields, showKnownError }: ServerErrorOptions<T>,
): void {
  if (!(error instanceof ApiError)) {
    setError('root.server', { message: serverErrorMessage(error) });

    return;
  }

  if (showKnownError?.(error)) {
    return;
  }

  const fieldNames: readonly string[] = fields;
  const isFormFieldDetail = (
    detail: ErrorDetail,
  ): detail is ErrorDetail & { field: FieldPath<T> } => fieldNames.includes(detail.field);
  const fieldDetails = error.details.filter(isFormFieldDetail);

  if (fieldDetails.length === 0) {
    setError('root.server', { message: error.message });

    return;
  }

  fieldDetails.forEach(({ field, message }, index) => {
    // Focus the first field with an error, as a client-side check would.
    setError(field, { message }, { shouldFocus: index === 0 });
  });
}
