import { Role } from '@mini-jira/shared';
import type { ReactElement } from 'react';
import { NavLink, Outlet } from 'react-router';

import { CURRENT_PAGE_CLASSES } from '@/components/top-bar';
import { Button } from '@/components/ui/button';
import { useCurrentProject } from '@/features/projects/hooks/use-project';

/**
 * The project header above the board, list, and settings: "[WEB] Website Redesign" and the
 * Board · List · Settings tabs (wireframes 03, 05, 06 A). The Settings tab is the owner's only
 * (wireframe 03, decided 2026-11-18). The ticket page has its own header (wireframe 04), so it
 * sits outside this layout.
 */
export function ProjectTabsLayout(): ReactElement {
  const project = useCurrentProject();
  const basePath = `/projects/${project.key}`;
  const tabs = [
    { label: 'Board', to: `${basePath}/board` },
    { label: 'List', to: `${basePath}/list` },
    ...(project.role === Role.OWNER ? [{ label: 'Settings', to: `${basePath}/settings` }] : []),
  ];

  return (
    <>
      <header className="mb-6 grid gap-2">
        <h1 className="flex min-w-0 items-center gap-2 text-2xl font-semibold">
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-sm font-medium">
            {project.key}
          </span>{' '}
          {/* The space keeps the key and name apart for screen readers ("WEB Website Redesign"). */}
          <span className="min-w-0 break-words">{project.name}</span>
        </h1>
        {/* -ml-2.5 lines the first tab's text up with the title above it. */}
        <nav aria-label="Project" className="-ml-2.5">
          <ul className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <Button asChild variant="ghost" className={CURRENT_PAGE_CLASSES}>
                  <NavLink to={tab.to}>{tab.label}</NavLink>
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
