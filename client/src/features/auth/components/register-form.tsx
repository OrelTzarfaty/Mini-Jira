import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorCode, PASSWORD_MIN_LENGTH, registerSchema } from '@mini-jira/shared';
import type { RegisterFormValues, RegisterInput } from '@mini-jira/shared';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormSetError } from 'react-hook-form';
import { useNavigate } from 'react-router';

import type { ApiError } from '@/api/api-error';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { AuthSubmitButton, AuthSwitchPrompt } from '@/features/auth/components/auth-form-parts';
import { PasswordInput } from '@/features/auth/components/password-input';
import { useRegisterMutation } from '@/features/auth/hooks/use-register-mutation';
import { showServerError } from '@/lib/show-server-error';

const EMAIL_TAKEN_MESSAGE = 'This email is already registered';
// The form's field names, from the shared schema, to match the server's details[].field.
const REGISTER_FIELDS = registerSchema.keyof().options;

/** A taken email goes under the Email field (AUTH-1). */
function showEmailTaken(error: ApiError, setError: UseFormSetError<RegisterFormValues>): boolean {
  if (error.code !== ErrorCode.EMAIL_TAKEN) {
    return false;
  }

  setError('email', { message: EMAIL_TAKEN_MESSAGE }, { shouldFocus: true });

  return true;
}

/** The Register form (wireframe 01 C, AUTH-1). The shared registerSchema checks it as you go. */
export function RegisterForm(): ReactElement {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const isSaving = registerMutation.isPending;

  // Gets the schema's output: the email is already trimmed and lowercased.
  function handleValidSubmit(input: RegisterInput): void {
    registerMutation.mutate(input, {
      // Register also logs in (architecture §7). replace: Back shouldn't reopen the form.
      onSuccess: () => {
        void navigate('/projects', { replace: true });
      },
      onError: (error) => {
        showServerError(error, setError, {
          fields: REGISTER_FIELDS,
          showKnownError: (apiError) => showEmailTaken(apiError, setError),
        });
      },
    });
  }

  return (
    // noValidate: the schema shows its own errors under each field, instead of the browser's
    // bubbles, which differ per browser and disappear.
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
      className="grid gap-4"
    >
      <FormField label="Name" error={errors.name?.message}>
        {(control) => <Input {...control} {...register('name')} autoComplete="name" />}
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} {...register('email')} type="email" autoComplete="email" />
        )}
      </FormField>
      <FormField
        label="Password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters`}
        error={errors.password?.message}
      >
        {(control) => (
          <PasswordInput {...control} {...register('password')} autoComplete="new-password" />
        )}
      </FormField>
      {errors.root?.server?.message && <FormAlert message={errors.root.server.message} />}
      <AuthSubmitButton
        isSending={isSaving}
        label="Create account"
        sendingLabel="Creating account…"
      />
      <AuthSwitchPrompt question="Already have an account?" to="/login" linkText="Log in" />
    </form>
  );
}
