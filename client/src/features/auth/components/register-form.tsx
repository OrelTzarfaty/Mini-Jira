import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorCode, PASSWORD_MIN_LENGTH, registerSchema } from '@mini-jira/shared';
import type { ErrorDetail, RegisterFormValues, RegisterInput } from '@mini-jira/shared';
import { Loader2Icon, TriangleAlertIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormSetError } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { ApiError } from '@/api/api-error';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/features/auth/components/password-input';
import { useRegisterMutation } from '@/features/auth/hooks/use-register-mutation';

const EMAIL_TAKEN_MESSAGE = 'This email is already registered';
const UNKNOWN_ERROR_MESSAGE = 'Something went wrong. Please try again.';
// The form's field names, from the shared schema, to match the server's details[].field.
const REGISTER_FIELDS: readonly string[] = registerSchema.keyof().options;

interface RegisterFieldDetail extends ErrorDetail {
  field: keyof RegisterFormValues;
}

function isRegisterFieldDetail(detail: ErrorDetail): detail is RegisterFieldDetail {
  return REGISTER_FIELDS.includes(detail.field);
}

/**
 * Shows a failed register next to what caused it (AUTH-1): a taken email and the server's
 * field details under their fields, anything else as one alert above the button. setError
 * only adds messages, so everything the user typed stays in the form.
 */
function showServerError(error: Error, setError: UseFormSetError<RegisterFormValues>): void {
  if (!(error instanceof ApiError)) {
    setError('root.server', { message: UNKNOWN_ERROR_MESSAGE });

    return;
  }

  if (error.code === ErrorCode.EMAIL_TAKEN) {
    setError('email', { message: EMAIL_TAKEN_MESSAGE }, { shouldFocus: true });

    return;
  }

  const fieldDetails = error.details.filter(isRegisterFieldDetail);

  if (fieldDetails.length === 0) {
    setError('root.server', { message: error.message });

    return;
  }

  fieldDetails.forEach(({ field, message }, index) => {
    // Focus the first field with an error, as a client-side check would.
    setError(field, { message }, { shouldFocus: index === 0 });
  });
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
        showServerError(error, setError);
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
      {errors.root?.server && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border p-3 text-sm">
          {/* Ink and an icon, like ErrorState: nothing was destroyed. */}
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {errors.root.server.message}
        </p>
      )}
      {/* Disabled while saving, so a double click can't send the form twice. */}
      <Button type="submit" size="lg" disabled={isSaving} className="mt-2 w-full">
        {isSaving && <Loader2Icon aria-hidden="true" className="animate-spin" />}
        {isSaving ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:decoration-2"
        >
          Log in <span aria-hidden="true">→</span>
        </Link>
      </p>
    </form>
  );
}
