import { PROJECT_SEARCH_MAX_LENGTH } from '@mini-jira/shared';
import type { Project } from '@mini-jira/shared';
import { cn } from 'cn';
import { CheckIcon, Loader2Icon, PlusIcon, SearchIcon } from 'lucide-react';
import { useId, useState } from 'react';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectKeyBadge, ProjectRoleLabel } from '@/features/projects/components/project-labels';
import { useProjectSearch } from '@/features/projects/hooks/use-my-projects';
import { useDebouncedValue } from '@/lib/use-debounced-value';

// Wireframe 02 E: up to 8 projects; the search finds the rest.
const MAX_SHOWN_PROJECTS = 8;
const SEARCH_DELAY_MS = 250;

type SwitcherItem =
  { kind: 'project'; project: Project } | { kind: 'view-all' } | { kind: 'create' };

export interface ProjectSwitcherActions {
  onOpenProject: (projectKey: string) => void;
  onViewAll: () => void;
  onCreate: () => void;
}

interface ProjectSwitcherPanelProps extends ProjectSwitcherActions {
  /** The project of the current page, listed first and marked with ✓; undefined elsewhere. */
  currentProject: Project | undefined;
}

const OPTION_CLASSES =
  'flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 aria-selected:bg-muted aria-selected:shadow-[inset_2px_0_0_var(--color-primary)]';

/**
 * Up to 8 projects. Without a search the current project comes first, as in wireframe 02 E, even
 * when it isn't among the first results; a search shows the server's matches in their order.
 */
function shownProjects(
  results: readonly Project[],
  search: string,
  currentProject: Project | undefined,
): Project[] {
  if (search !== '' || !currentProject) {
    return results.slice(0, MAX_SHOWN_PROJECTS);
  }

  const others = results.filter((project) => project.id !== currentProject.id);

  return [currentProject, ...others].slice(0, MAX_SHOWN_PROJECTS);
}

/**
 * The panel's controls appear only after the projects load, so the popover's own focus on open
 * may come before they exist; focusing the first one as it appears lets the user type or press
 * Enter at once.
 */
function focusOnMount(control: HTMLElement | null): void {
  control?.focus();
}

function itemId(listboxId: string, item: SwitcherItem): string {
  return item.kind === 'project' ? `${listboxId}-${item.project.id}` : `${listboxId}-${item.kind}`;
}

function ProjectOption({
  project,
  isCurrent,
}: {
  project: Project;
  isCurrent: boolean;
}): ReactElement {
  return (
    <>
      <CheckIcon aria-hidden="true" className={cn('size-4 shrink-0', !isCurrent && 'invisible')} />
      {/* The spaces keep the words apart for screen readers; flex hides them on screen. */}
      <ProjectKeyBadge projectKey={project.key} />{' '}
      <span className="min-w-0 flex-1 truncate">{project.name}</span>{' '}
      {isCurrent && (
        <>
          <span className="sr-only">(current project)</span>{' '}
        </>
      )}
      <ProjectRoleLabel role={project.role} className="shrink-0 text-xs" />
    </>
  );
}

/** Only "+ Create project", for a user without projects (wireframe 02 E). */
function CreateOnly({ onCreate }: { onCreate: () => void }): ReactElement {
  return (
    <div className="p-2">
      <Button
        ref={focusOnMount}
        variant="ghost"
        className="w-full justify-start"
        onClick={onCreate}
      >
        <PlusIcon aria-hidden="true" />
        Create project
      </Button>
    </div>
  );
}

/**
 * The inside of the project dropdown (wireframe 02 E). An ARIA combobox: focus stays in the
 * search box, ↑ ↓ move the highlighted option (aria-activedescendant), Enter opens it, and the
 * popover closes on Esc. It is unmounted when the dropdown closes, so every open starts with an
 * empty search.
 */
export function ProjectSwitcherPanel({
  currentProject,
  onOpenProject,
  onViewAll,
  onCreate,
}: ProjectSwitcherPanelProps): ReactElement {
  const listboxId = useId();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  // Without a search: tells whether the user has any project at all.
  const allProjects = useProjectSearch('');
  const results = useProjectSearch(debouncedSearch);

  if (!allProjects.data) {
    return allProjects.isError ? (
      <div className="p-2">
        <ErrorState
          message="Couldn't load your projects."
          onRetry={() => {
            void allProjects.refetch();
          }}
        />
      </div>
    ) : (
      <p role="status" className="flex items-center gap-2 p-4 text-muted-foreground">
        <Loader2Icon aria-hidden="true" className="size-4 motion-safe:animate-spin" />
        Loading your projects…
      </p>
    );
  }

  if (allProjects.data.total === 0) {
    return <CreateOnly onCreate={onCreate} />;
  }

  const projects = shownProjects(results.data?.items ?? [], debouncedSearch, currentProject);
  const items: SwitcherItem[] = [
    ...projects.map((project) => ({ kind: 'project' as const, project })),
    { kind: 'view-all' },
    { kind: 'create' },
  ];
  // The list can shrink under the highlight while results arrive.
  const highlightedIndex = Math.min(activeIndex, items.length - 1);
  const highlightedItem = items[highlightedIndex];

  function activate(item: SwitcherItem): void {
    if (item.kind === 'project') {
      onOpenProject(item.project.key);
    } else if (item.kind === 'view-all') {
      onViewAll();
    } else {
      onCreate();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    const moves: Partial<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };
    const move = moves[event.key];

    if (move !== undefined) {
      event.preventDefault();
      setActiveIndex((highlightedIndex + move + items.length) % items.length);
    } else if (event.key === 'Enter' && highlightedItem) {
      event.preventDefault();
      activate(highlightedItem);
    }
  }

  function renderOption(item: SwitcherItem, index: number, content: ReactNode): ReactElement {
    return (
      <div
        key={itemId(listboxId, item)}
        id={itemId(listboxId, item)}
        role="option"
        aria-selected={index === highlightedIndex}
        className={OPTION_CLASSES}
        // Keeps focus in the search box, as a combobox needs.
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onMouseMove={() => {
          setActiveIndex(index);
        }}
        onClick={() => {
          activate(item);
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div className="grid gap-2 p-2">
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={focusOnMount}
          role="combobox"
          aria-label="Search projects"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-activedescendant={highlightedItem ? itemId(listboxId, highlightedItem) : undefined}
          placeholder="Search projects"
          autoComplete="off"
          spellCheck={false}
          maxLength={PROJECT_SEARCH_MAX_LENGTH}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="pl-8"
        />
      </div>
      {results.isError && (
        <p role="alert" className="px-2 text-muted-foreground">
          Couldn&apos;t search your projects.
        </p>
      )}
      {results.isSuccess && projects.length === 0 && (
        <p role="status" className="px-2 py-1 text-muted-foreground">
          No projects match your search.
        </p>
      )}
      <div id={listboxId} role="listbox" aria-label="Projects">
        {projects.length > 0 && (
          <div role="group" aria-label="Your projects" className="grid gap-0.5 pb-2">
            {projects.map((project, index) =>
              renderOption(
                { kind: 'project', project },
                index,
                <ProjectOption project={project} isCurrent={project.id === currentProject?.id} />,
              ),
            )}
          </div>
        )}
        <div role="group" aria-label="More" className="grid gap-0.5 border-t pt-2">
          {renderOption(
            { kind: 'view-all' },
            projects.length,
            <>
              View all projects <span aria-hidden="true">→</span>
            </>,
          )}
          {renderOption(
            { kind: 'create' },
            projects.length + 1,
            <>
              <PlusIcon aria-hidden="true" className="size-4" />
              Create project
            </>,
          )}
        </div>
      </div>
    </div>
  );
}
