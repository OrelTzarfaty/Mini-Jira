import { Loader2Icon, LogOutIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { useLogoutMutation } from '@/features/auth/hooks/use-logout-mutation';

// Any failure means the cookie may still be there, so the user must know they are still in.
const LOGOUT_FAILED_MESSAGE = "Couldn't log out. You're still logged in. Please try again.";

/**
 * The Log out action in the user menu and the phone menu (wireframe 02 F and H, AUTH-3).
 * On success the hook leaves for the landing page; on failure the user stays and sees why.
 */
export function LogOutButton(): ReactElement {
  const logoutMutation = useLogoutMutation();
  const isLoggingOut = logoutMutation.isPending;

  function handleClick(): void {
    // aria-disabled (not disabled) keeps keyboard focus on the button while it works, so a
    // failed logout doesn't drop focus to the page behind the menu. So guard here instead.
    if (isLoggingOut) {
      return;
    }

    logoutMutation.mutate();
  }

  return (
    <div className="grid gap-2">
      <Button
        variant="ghost"
        aria-disabled={isLoggingOut}
        onClick={handleClick}
        className="justify-start aria-disabled:opacity-50"
      >
        {isLoggingOut ? (
          <Loader2Icon aria-hidden="true" className="animate-spin" />
        ) : (
          <LogOutIcon aria-hidden="true" />
        )}
        {isLoggingOut ? 'Logging out…' : 'Log out'}
      </Button>
      {logoutMutation.isError && <FormAlert message={LOGOUT_FAILED_MESSAGE} />}
    </div>
  );
}
