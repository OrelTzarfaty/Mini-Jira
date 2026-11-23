import type { ReactElement } from 'react';

import { AuthPopup } from '@/features/auth/components/auth-popup';
import { LoginForm } from '@/features/auth/components/login-form';

/** /login: the landing page (the parent route) with the Log in popup open (wireframe 01 B). */
export function LoginPage(): ReactElement {
  return (
    <AuthPopup title="Log in to Mini-Jira" tabTitle="Log in">
      <LoginForm />
    </AuthPopup>
  );
}
