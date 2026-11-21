import { MenuIcon } from 'lucide-react';
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

// NavLink marks the link to the current page with aria-current="page". The style follows it: a
// navy underline, like the active tab in wireframes 03 and 07, so it never relies on color alone.
const CURRENT_PAGE_CLASSES =
  'aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8';

/**
 * On phones the links that don't fit move into a menu (wireframe 02 H).
 * TODO(PRJ-2): add the user menu (name, email, Log out) here and on wide screens.
 */
function PhoneMenu(): ReactElement {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu">
          <MenuIcon aria-hidden="true" />
        </Button>
      </DialogTrigger>
      {/* The menu needs no description: its links speak for themselves. */}
      <DialogContent aria-describedby={undefined} className="top-4 translate-y-0">
        <DialogTitle>Menu</DialogTitle>
        <nav aria-label="Menu">
          <ul>
            <li>
              <DialogClose asChild>
                <Button asChild variant="ghost" className={CURRENT_PAGE_CLASSES}>
                  <NavLink to="/my-work">My Work</NavLink>
                </Button>
              </DialogClose>
            </li>
          </ul>
        </nav>
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
        <div className="ml-auto sm:hidden">
          <PhoneMenu />
        </div>
      </div>
    </header>
  );
}
