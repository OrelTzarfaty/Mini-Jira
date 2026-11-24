import { zodResolver } from '@hookform/resolvers/zod';
import { addMemberSchema, ErrorCode } from '@mini-jira/shared';
import type { AddMemberInput } from '@mini-jira/shared';
import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAddMemberMutation } from '@/features/members/hooks/use-add-member-mutation';
import { showServerError } from '@/lib/show-server-error';

// The form's field names, from the shared schema, to match the server's details[].field.
const ADD_MEMBER_FIELDS = addMemberSchema.keyof().options;
// Their messages name the problem with the email itself, so they go under the field (06 C).
const EMAIL_ERROR_CODES: readonly string[] = [ErrorCode.USER_NOT_FOUND, ErrorCode.ALREADY_MEMBER];

/** "Add a member by email" (wireframe 06 C, PRJ-3). The shared addMemberSchema checks it. */
export function AddMemberForm({ projectKey }: { projectKey: string }): ReactElement {
  const addMemberMutation = useAddMemberMutation(projectKey);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(addMemberSchema), defaultValues: { email: '' } });
  // "Avi Ben added": set by the last success, cleared when the next one is sent.
  const [addedMessage, setAddedMessage] = useState('');
  const isSending = addMemberMutation.isPending;

  function handleValidSubmit(input: AddMemberInput): void {
    setAddedMessage('');
    addMemberMutation.mutate(input, {
      onSuccess: (member) => {
        reset();
        setAddedMessage(`${member.name} added`);
      },
      // setError only adds messages, so the email the user typed stays in the field.
      onError: (error) => {
        showServerError(error, setError, {
          fields: ADD_MEMBER_FIELDS,
          showKnownError: (apiError) => {
            if (!EMAIL_ERROR_CODES.includes(apiError.code)) {
              return false;
            }

            setError('email', { message: apiError.message }, { shouldFocus: true });

            return true;
          },
        });
      },
    });
  }

  return (
    // noValidate: the schema shows its own errors under the field, not the browser's bubbles.
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
      className="grid gap-3"
    >
      <FormField label="Add a member by email" error={errors.email?.message}>
        {(control) => (
          <div className="flex gap-2">
            <Input
              {...control}
              {...register('email')}
              type="email"
              autoComplete="off"
              spellCheck={false}
              placeholder="name@example.com"
              className="sm:max-w-sm"
            />
            {/* Disabled while sending, so a double click can't send the email twice. */}
            <Button type="submit" disabled={isSending} className="shrink-0">
              {isSending && <Loader2Icon aria-hidden="true" className="animate-spin" />}
              {isSending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        )}
      </FormField>
      {errors.root?.server?.message && <FormAlert message={errors.root.server.message} />}
      {/* Always in the page (not hidden), so screen readers announce the message when it
          appears. */}
      <p role="status" className="text-sm">
        {addedMessage}
      </p>
    </form>
  );
}
