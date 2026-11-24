import type { Project } from '@mini-jira/shared';
import { ChevronDownIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useMatch, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreateProjectPopup } from '@/features/projects/components/create-project-dialog';
import { ProjectSwitcherPanel } from '@/features/projects/components/project-switcher-panel';
import { useOptionalProject } from '@/features/projects/hooks/use-project';

/** "WEB · Website Redesign" inside a project (wireframe 02 A). On a phone only the key fits. */
function CurrentProjectLabel({ project }: { project: Project }): ReactElement {
  return (
    <>
      <span className="sr-only">Project</span>{' '}
      {/* The space keeps the words apart for screen readers; flex hides it on screen. */}
      <span>{project.key}</span>{' '}
      <span aria-hidden="true" className="hidden sm:inline">
        ·
      </span>
      <span className="hidden max-w-48 truncate sm:block lg:max-w-72">{project.name}</span>
    </>
  );
}

interface ProjectSwitcherMenuProps {
  /** The project of the current page; undefined outside a project or while it loads. */
  currentProject: Project | undefined;
}

/** The dropdown itself: its button, the panel, and the Create project popup it can open. */
function ProjectSwitcherMenu({ currentProject }: ProjectSwitcherMenuProps): ReactElement {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Switching keeps the tab: from the list to the other project's list, else to its board.
  const tab = useMatch('/projects/:projectKey/list') ? 'list' : 'board';

  function goTo(path: string): void {
    setIsOpen(false);
    void navigate(path);
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button ref={triggerRef} variant="ghost" className="min-w-0">
            {currentProject ? <CurrentProjectLabel project={currentProject} /> : 'Projects'}
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        {/* Up to the screen's height, so the last options stay reachable on a short phone. */}
        <PopoverContent
          align="start"
          collisionPadding={8}
          aria-label="Switch project"
          className="max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0"
        >
          <ProjectSwitcherPanel
            currentProject={currentProject}
            onOpenProject={(projectKey) => {
              goTo(`/projects/${projectKey}/${tab}`);
            }}
            onViewAll={() => {
              goTo('/projects');
            }}
            onCreate={() => {
              setIsOpen(false);
              setIsCreateOpen(true);
            }}
          />
        </PopoverContent>
      </Popover>
      <CreateProjectPopup
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        // The dropdown that opened the popup is gone, so focus goes back to its button.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      />
    </>
  );
}

/**
 * The project dropdown in the top bar (wireframe 02 E, PRJ-2): switch to another project from any
 * screen, open My Projects, or create a project. One component on every page, so its button stays
 * the same element (and keeps focus) when a switch moves between pages.
 */
export function ProjectSwitcher(): ReactElement {
  const currentProjectKey = useMatch('/projects/:projectKey/*')?.params.projectKey;
  // A project that fails to load (or isn't the user's) shows the plain "Projects" button.
  const currentProject = useOptionalProject(currentProjectKey);

  return <ProjectSwitcherMenu currentProject={currentProject} />;
}
