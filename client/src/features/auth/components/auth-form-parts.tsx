import { Loader2Icon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

interface AuthSubmitButtonProps {
  isSending: boolean;
  label: string;
  /** Shown with a spinner while the form is being sent, such as "Logging in…". */
  sendingLabel: string;
}

/** The popup's full-width navy button (wireframe 01 B and C). */
export function AuthSubmitButton({
  isSending,
  label,
  sendingLabel,
}: AuthSubmitButtonProps): ReactElement {
  return (
    // Disabled while sending, so a double click can't send the form twice.
    <Button type="submit" size="lg" disabled={isSending} className="mt-2 w-full">
      {isSending && <Loader2Icon aria-hidden="true" className="animate-spin" />}
      {isSending ? sendingLabel : label}
    </Button>
  );
}

interface AuthSwitchPromptProps {
  /** Such as "No account?". */
  question: string;
  /** The other popup's URL. */
  to: '/login' | '/register';
  linkText: string;
}

/** The line under the button that switches to the other popup (wireframe 01 B and C). */
export function AuthSwitchPrompt({ question, to, linkText }: AuthSwitchPromptProps): ReactElement {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {question}{' '}
      <Link
        to={to}
        className="font-medium text-foreground underline underline-offset-4 hover:decoration-2"
      >
        {linkText} <span aria-hidden="true">→</span>
      </Link>
    </p>
  );
}
