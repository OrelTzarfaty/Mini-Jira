import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN_LENGTH, registerSchema } from '@mini-jira/shared';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/features/auth/components/password-input';

/** The Register form (wireframe 01 C, AUTH-1). The shared registerSchema checks it as you go. */
export function RegisterForm(): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  // TODO(AUTH-1): send the form to the API (the next task of this story).
  const handleValidSubmit = (): void => undefined;

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
      <Button type="submit" size="lg" className="mt-2 w-full">
        Create account
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
