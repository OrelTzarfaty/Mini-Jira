import { zodResolver } from '@hookform/resolvers/zod';
import {
  ErrorCode,
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_RATE_LIMITED_MESSAGE,
  loginSchema,
} from '@mini-jira/shared';
import type { LoginFormValues, LoginInput } from '@mini-jira/shared';
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
import { useLoginMutation } from '@/features/auth/hooks/use-login-mutation';
import { showServerError } from '@/lib/show-server-error';

// The form's field names, from the shared schema, to match the server's details[].field.
const LOGIN_FIELDS = loginSchema.keyof().options;

/**
 * Wrong credentials and too many attempts get one alert for the whole form (AUTH-2). The
 * alert never sits under Email or Password, so it can't hint which of the two was wrong.
 */
function showLoginError(error: ApiError, setError: UseFormSetError<LoginFormValues>): boolean {
  switch (error.code) {
    case ErrorCode.INVALID_CREDENTIALS:
      setError('root.server', { message: INVALID_CREDENTIALS_MESSAGE });

      return true;
    case ErrorCode.RATE_LIMITED:
      setError('root.server', { message: LOGIN_RATE_LIMITED_MESSAGE });

      return true;
    default:
      return false;
  }
}

/** The Log in form (wireframe 01 B, AUTH-2). The shared loginSchema checks it as you go. */
export function LoginForm(): ReactElement {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const isSending = loginMutation.isPending;

  // Gets the schema's output: the email is already trimmed and lowercased.
  function handleValidSubmit(input: LoginInput): void {
    loginMutation.mutate(input, {
      // replace: Back shouldn't reopen the form.
      onSuccess: () => {
        void navigate('/projects', { replace: true });
      },
      // Keeps both fields as typed, so a typo can be checked with the eye button and fixed.
      onError: (error) => {
        showServerError(error, setError, {
          fields: LOGIN_FIELDS,
          showKnownError: (apiError) => showLoginError(apiError, setError),
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
      <FormField label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} {...register('email')} type="email" autoComplete="email" />
        )}
      </FormField>
      <FormField label="Password" error={errors.password?.message}>
        {(control) => (
          <PasswordInput {...control} {...register('password')} autoComplete="current-password" />
        )}
      </FormField>
      {errors.root?.server?.message && <FormAlert message={errors.root.server.message} />}
      <AuthSubmitButton isSending={isSending} label="Log in" sendingLabel="Logging in…" />
      <AuthSwitchPrompt question="No account?" to="/register" linkText="Create one" />
    </form>
  );
}
