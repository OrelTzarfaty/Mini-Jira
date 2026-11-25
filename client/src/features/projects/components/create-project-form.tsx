import { zodResolver } from '@hookform/resolvers/zod';
import {
  createProjectSchema,
  ErrorCode,
  PROJECT_KEY_MAX_LENGTH,
  PROJECT_KEY_MIN_LENGTH,
  PROJECT_KEY_TAKEN_MESSAGE,
} from '@mini-jira/shared';
import type { CreateProjectFormValues, CreateProjectInput } from '@mini-jira/shared';
import { Loader2Icon } from 'lucide-react';
import { useRef } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormSetError } from 'react-hook-form';
import { useNavigate } from 'react-router';

import type { ApiError } from '@/api/api-error';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProjectMutation } from '@/features/projects/hooks/use-create-project-mutation';
import { suggestProjectKey, toProjectKeyCharacters } from '@/features/projects/lib/project-key';
import { showServerError } from '@/lib/show-server-error';

const KEY_HINT = `${PROJECT_KEY_MIN_LENGTH}–${PROJECT_KEY_MAX_LENGTH} letters. Used in ticket keys like WEB-12. Can't be changed later`;
// The form's field names, from the shared schema, to match the server's details[].field.
const CREATE_PROJECT_FIELDS = createProjectSchema.keyof().options;

/** A taken key goes under the Key field (wireframe 02 D). */
function showKeyTaken(
  error: ApiError,
  setError: UseFormSetError<CreateProjectFormValues>,
): boolean {
  if (error.code !== ErrorCode.PROJECT_KEY_TAKEN) {
    return false;
  }

  setError('key', { message: PROJECT_KEY_TAKEN_MESSAGE }, { shouldFocus: true });

  return true;
}

/**
 * Keeps only uppercase letters in the Key field as the user types or pastes (wireframe 02 D).
 * The field is uncontrolled (react-hook-form), so the input's own value is cleaned before the
 * form reads it. The caret stays where it was, minus the characters that were dropped.
 */
function cleanKeyInput(input: HTMLInputElement): void {
  const cleaned = toProjectKeyCharacters(input.value);

  if (cleaned === input.value) {
    return;
  }

  const caret = input.selectionStart ?? input.value.length;
  const caretAfter = Math.max(
    0,
    Math.min(cleaned.length, caret - (input.value.length - cleaned.length)),
  );
  input.value = cleaned;
  input.setSelectionRange(caretAfter, caretAfter);
}

/** The Create project form (wireframe 02 D, PRJ-1). The shared createProjectSchema checks it. */
export function CreateProjectForm({
  onCreated,
}: {
  /** Closes the popup. Leaving the page isn't enough: the top bar's popup stays mounted (PRJ-2). */
  onCreated: () => void;
}): ReactElement {
  const navigate = useNavigate();
  const createProjectMutation = useCreateProjectMutation();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: '', key: '', description: '' },
  });
  const isSending = createProjectMutation.isPending;
  // The key follows the name until the user types in the Key field (wireframe 02 D). Only event
  // handlers read it, so a ref is enough: changing it needs no new render.
  const isKeyEditedByHandRef = useRef(false);
  // Registered in the order they appear, so a failed submit focuses the first field with an error.
  const nameField = register('name');
  const keyField = register('key');

  function handleNameChange(event: ChangeEvent<HTMLInputElement>): void {
    void nameField.onChange(event);

    if (isKeyEditedByHandRef.current) {
      return;
    }

    // After a submit, check the key again at once, as when the user types in the field.
    setValue('key', suggestProjectKey(event.target.value), { shouldValidate: isSubmitted });
  }

  function handleKeyChange(event: ChangeEvent<HTMLInputElement>): void {
    isKeyEditedByHandRef.current = true;
    cleanKeyInput(event.target);

    void keyField.onChange(event);
  }

  // Gets the schema's output: trimmed, the key uppercased, an empty description as null.
  function handleValidSubmit(input: CreateProjectInput): void {
    createProjectMutation.mutate(input, {
      // Straight to the new project's board (wireframe 02 D).
      onSuccess: (project) => {
        onCreated();
        void navigate(`/projects/${project.key}/board`);
      },
      onError: (error) => {
        showServerError(error, setError, {
          fields: CREATE_PROJECT_FIELDS,
          showKnownError: (apiError) => showKeyTaken(apiError, setError),
        });
      },
    });
  }

  return (
    // noValidate: the schema shows its own errors under each field, not the browser's bubbles.
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
      className="grid gap-4"
    >
      <FormField label="Name" error={errors.name?.message}>
        {(control) => (
          <Input {...control} {...nameField} onChange={handleNameChange} autoComplete="off" />
        )}
      </FormField>
      <FormField label="Key" hint={KEY_HINT} error={errors.key?.message}>
        {(control) => (
          <Input
            {...control}
            {...keyField}
            onChange={handleKeyChange}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-28"
          />
        )}
      </FormField>
      <FormField label="Description (optional)" error={errors.description?.message}>
        {(control) => <Textarea {...control} {...register('description')} rows={3} />}
      </FormField>
      {errors.root?.server?.message && <FormAlert message={errors.root.server.message} />}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        {/* Disabled while sending, so a double click can't create the project twice. */}
        <Button type="submit" disabled={isSending}>
          {isSending && <Loader2Icon aria-hidden="true" className="animate-spin" />}
          {isSending ? 'Creating…' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
}
