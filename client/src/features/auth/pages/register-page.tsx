import type { ReactElement } from 'react';

import { AuthPopup } from '@/features/auth/components/auth-popup';
import { RegisterForm } from '@/features/auth/components/register-form';

const TITLE = 'Create your account';

/** /register: the landing page (the parent route) with the Register popup open (wireframe 01 C). */
export function RegisterPage(): ReactElement {
  return (
    <AuthPopup title={TITLE} tabTitle={TITLE}>
      <RegisterForm />
    </AuthPopup>
  );
}
