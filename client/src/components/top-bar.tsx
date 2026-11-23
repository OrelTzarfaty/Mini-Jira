import { CircleUserRoundIcon, MenuIcon } from 'lucide-react';
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { Link, NavLink } from 'react-router';

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

// NavLink marks the link to the current page with aria-current="page". The style follows it: a
// navy underline, like the active tab in wireframes 03 and 07, so it never relies on color alone.
const CURRENT_PAGE_CLASSES =
  'aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8';

/**
 * The user menu at the top right on wide screens (wireframe 02 F). A popover, not a menu
 * (role="menu"): a menu may only hold menu items, but this one also shows who is logged in
 * and, if logging out fails, an error message.
 * TODO(AUTH-4): show the user's initials on the button, and their name and email above Log out.
 */
function AccountMenu(): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu">
          <CircleUserRoundIcon aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Account menu" className="w-64">
        <LogOutButton />
      </PopoverContent>
    </Popover>
  );
}

/**
 * On phones the links that don't fit, and the user menu, move into a menu (wireframe 02 H).
 * TODO(AUTH-4): show the user's name and email above Log out.
 */
function PhoneMenu(): ReactElement {
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
        <div className="border-t pt-4">
          <LogOutButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The bar at the top of every screen after login (wireframe 02 A). */
export function TopBar(): ReactElement {
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
          <AccountMenu />
        </div>
        <div className="ml-auto sm:hidden">
          <PhoneMenu />
        </div>
      </div>
    </header>
  );
}
