import { useOutletContext } from 'react-router';

/** What the project's pages (board, list, settings) get from the header in ProjectTabsLayout. */
export interface ProjectTabsContext {
  /** Opens the header's Create ticket popup, for the board's empty state (BRD-1). */
  openCreateTicket: () => void;
}

/** The project header's actions, for the pages under ProjectTabsLayout. */
export function useProjectTabs(): ProjectTabsContext {
  return useOutletContext<ProjectTabsContext>();
}
