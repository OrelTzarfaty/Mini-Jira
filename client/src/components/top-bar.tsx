import type { PublicUser } from '@mini-jira/shared';
import { MenuIcon } from 'lucide-react';
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { Link, NavLink } from 'react-router';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LogOutButton } from '@/features/auth/components/log-out-button';
import { useCurrentUser } from '@/features/auth/hooks/use-me';

// NavLink marks the link to the current page with aria-current="page". The style follows it: a
// navy underline, like the active tab in wireframes 03 and 07, so it never relies on color alone.
export const CURRENT_PAGE_CLASSES =
  'aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8';

/** Who is logged in, above Log out in both menus (wireframe 02 F and H). */
function AccountSummary({ user }: { user: PublicUser }): ReactElement {
  return (
    <div className="min-w-0 px-2.5">
      {/* Long names and emails wrap instead of widening the menu past a phone screen. */}
      <p className="font-medium break-words">{user.name}</p>
      <p className="text-sm break-words text-muted-foreground">{user.email}</p>
    </div>
  );
}

/**
 * The user menu at the top right on wide screens (wireframe 02 F). A popover, not a menu
 * (role="menu"): a menu may only hold menu items, but this one also shows who is logged in
 * and, if logging out fails, an error message.
 */
function AccountMenu({ user }: { user: PublicUser }): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* The button's own label wins over the initials' label, so it is read as one name. */}
        <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
          <Avatar name={user.name} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Account menu" className="w-64">
        <AccountSummary user={user} />
        <div className="mt-2 border-t pt-2">
          <LogOutButton />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** On phones the links that don't fit, and the user menu, move into a menu (wireframe 02 H). */
function PhoneMenu({ user }: { user: PublicUser }): ReactElement {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu">
          <MenuIcon aria-hidden="true" />
        </Button>
      </DialogTrigger>
      {/* The menu needs no description: its links speak for themselves. */}
      {/* Opens on the first link. Radix would skip links and focus Log out, so pressing Enter
          right after opening the menu would log the user out by mistake. */}
      <DialogContent
        aria-describedby={undefined}
        className="top-4 translate-y-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstLinkRef.current?.focus();
        }}
      >
        <DialogTitle>Menu</DialogTitle>
        <nav aria-label="Menu">
          <ul>
            <li>
              <DialogClose asChild>
                <Button asChild variant="ghost" className={CURRENT_PAGE_CLASSES}>
                  <NavLink ref={firstLinkRef} to="/my-work">
                    My Work
                  </NavLink>
                </Button>
              </DialogClose>
            </li>
          </ul>
        </nav>
        <div className="grid gap-2 border-t pt-4">
          <AccountSummary user={user} />
          <LogOutButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The bar at the top of every screen after login (wireframe 02 A). */
export function TopBar(): ReactElement {
  const user = useCurrentUser();

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          to="/projects"
          className="inline-flex h-8 items-center gap-2 rounded-md px-1 font-semibold"
        >
          {/* The logo mark is the same file as the favicon. The link text names it. */}
          <img src="/favicon.svg" alt="" className="size-6" />
          Mini-Jira
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1">
            <li>
              {/* TODO(PRJ-2): becomes the project dropdown (wireframe 02 E). */}
              <Button asChild variant="ghost" className={CURRENT_PAGE_CLASSES}>
                <NavLink to="/projects" end>
                  Projects
                </NavLink>
              </Button>
            </li>
            <li className="hidden sm:block">
              <Button asChild variant="ghost" className={CURRENT_PAGE_CLASSES}>
                <NavLink to="/my-work">My Work</NavLink>
              </Button>
            </li>
          </ul>
        </nav>
        <div className="ml-auto hidden sm:block">
          <AccountMenu user={user} />
        </div>
        <div className="ml-auto sm:hidden">
          <PhoneMenu user={user} />
        </div>
      </div>
    </header>
  );
}
