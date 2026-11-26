import type { TicketUser } from '@mini-jira/shared';
import type { ReactElement, Ref } from 'react';

import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useCurrentUser } from '@/features/auth/hooks/use-me';
import { useAllProjectMembers } from '@/features/members/hooks/use-all-project-members';

// The select's value for "nobody": an <option> value is always a string.
const UNASSIGNED = '';

interface AssigneeFieldProps {
  /** "Assignee" in the Create ticket popup (wireframe 03 E), "Assigned to" in edit mode (04 B). */
  label: string;
  projectKey: string;
  /** The chosen user's id, or null for Unassigned. */
  value: string | null;
  onChange: (assigneeId: string | null) => void;
  onBlur: () => void;
  selectRef: Ref<HTMLSelectElement>;
  error: string | undefined;
  /** The ticket's assignee when the form opened, so it shows before the members arrive. */
  currentAssignee?: TicketUser | null;
}

/**
 * The assignee picker (TKT-5): "Unassigned" and every member of the project, by name. The
 * browser's own select, like the other ticket fields: keyboard and screen reader friendly, and
 * the phone's native picker. The logged-in user and the ticket's assignee are always choices,
 * so the field still works while the members load or if loading them failed.
 */
export function AssigneeField({
  label,
  projectKey,
  value,
  onChange,
  onBlur,
  selectRef,
  error,
  currentAssignee = null,
}: AssigneeFieldProps): ReactElement {
  const me = useCurrentUser();
  const members = useAllProjectMembers(projectKey);
  const loadedUsers = (members.data ?? []).map(({ userId, name }) => ({ id: userId, name }));
  const knownUsers = [...loadedUsers, me, ...(currentAssignee ? [currentAssignee] : [])];
  const choices = [...new Map(knownUsers.map(({ id, name }) => [id, name])).entries()].sort(
    ([, nameA], [, nameB]) => nameA.localeCompare(nameB),
  );
  const hint = members.isPending
    ? 'Loading members…'
    : members.isError
      ? "Couldn't load the members."
      : undefined;

  return (
    <div className="grid gap-1.5">
      <FormField label={label} hint={hint} error={error}>
        {(fieldControl) => (
          <NativeSelect
            {...fieldControl}
            ref={selectRef}
            // Disabled only while loading: the list isn't complete yet. After an error the
            // known choices (Unassigned, me, the current assignee) still work.
            disabled={members.isPending}
            value={value ?? UNASSIGNED}
            onChange={(event) => {
              onChange(event.target.value === UNASSIGNED ? null : event.target.value);
            }}
            onBlur={onBlur}
            className="w-full"
          >
            <NativeSelectOption value={UNASSIGNED}>Unassigned</NativeSelectOption>
            {choices.map(([id, name]) => (
              <NativeSelectOption key={id} value={id}>
                {name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FormField>
      {members.isError && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => {
            void members.refetch();
          }}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
