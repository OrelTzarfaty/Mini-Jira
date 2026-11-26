import { Priority, TicketType } from '@mini-jira/shared';
import type { BoardCard, Status } from '@mini-jira/shared';
import {
  BookOpenIcon,
  BugIcon,
  CalendarIcon,
  CalendarX2Icon,
  ChevronDownIcon,
  ChevronsUpIcon,
  ChevronUpIcon,
  EqualIcon,
  SquareCheckBigIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement, Ref } from 'react';
import { Link } from 'react-router';

import { Avatar } from '@/components/avatar';
import { isOverdue } from '@/features/tickets/lib/is-overdue';
import { PRIORITY_LABELS, TICKET_TYPE_LABELS } from '@/features/tickets/lib/ticket-labels';
import { formatDueDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

// Wireframe 03 B: ☑ Task · 🐞 Bug · 📘 Story.
const TYPE_ICONS: Record<TicketType, LucideIcon> = {
  [TicketType.TASK]: SquareCheckBigIcon,
  [TicketType.BUG]: BugIcon,
  [TicketType.STORY]: BookOpenIcon,
};

// Wireframe 03 B: ⏫ Critical · ▲ High · ● Medium · ▼ Low. The word always shows next to the icon.
const PRIORITY_ICONS: Record<Priority, LucideIcon> = {
  [Priority.CRITICAL]: ChevronsUpIcon,
  [Priority.HIGH]: ChevronUpIcon,
  [Priority.MEDIUM]: EqualIcon,
  [Priority.LOW]: ChevronDownIcon,
};

interface TicketCardProps {
  projectKey: string;
  card: BoardCard;
  /** Lets "Load more" move focus to the first card it added. */
  ref?: Ref<HTMLAnchorElement>;
}

/**
 * One ticket on the board (BRD-1, wireframe 03 B): type icon and key, the title (two lines at
 * most), priority, due date, and assignee. The whole card opens the ticket page (TKT-2). The
 * estimate waits for the mentor's OK (DOC-5), and the ⋯ menu comes with BRD-2/3.
 */
export function TicketCard({ projectKey, card, ref }: TicketCardProps): ReactElement {
  const TypeIcon = TYPE_ICONS[card.type];
  const PriorityIcon = PRIORITY_ICONS[card.priority];

  return (
    <Link
      ref={ref}
      to={`/projects/${projectKey}/tickets/${card.key}`}
      // The {' '} between the parts keep the link's name readable for screen readers ("Bug
      // WEB-12 Fix login redirect High ..."); in a grid or flex box they take no space.
      className="grid gap-2 rounded-lg border bg-background p-3 text-sm transition-colors hover:border-input"
    >
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="sr-only">{TICKET_TYPE_LABELS[card.type]}</span>{' '}
        <span className="font-medium">{card.key}</span>
      </span>{' '}
      {/* break-words: a long word without spaces wraps instead of widening the column. */}
      <span className="line-clamp-2 font-medium break-words">{card.title}</span>{' '}
      <span className="flex items-center gap-1.5">
        <PriorityIcon aria-hidden="true" className="size-4 shrink-0" />
        {PRIORITY_LABELS[card.priority]}
      </span>{' '}
      <span className="flex min-h-8 items-center justify-between gap-2">
        {card.dueDate !== null && <DueDate dueDate={card.dueDate} status={card.status} />}{' '}
        <Assignee assignee={card.assignee} />
      </span>
    </Link>
  );
}

function DueDate({ dueDate, status }: { dueDate: string; status: Status }): ReactElement {
  const overdue = isOverdue({ dueDate, status });
  // Red is for overdue dates only (DESIGN.md), and never alone: the calendar icon changes too.
  const Icon = overdue ? CalendarX2Icon : CalendarIcon;

  return (
    <span
      className={cn(
        'flex items-center gap-1.5',
        overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="sr-only">{overdue ? 'Overdue, due' : 'Due'}</span> {formatDueDate(dueDate)}
    </span>
  );
}

function Assignee({ assignee }: { assignee: BoardCard['assignee'] }): ReactElement {
  if (assignee === null) {
    // Wireframe 03 B: ◌ an empty dashed circle.
    return (
      <span
        role="img"
        aria-label="Unassigned"
        className="ml-auto size-8 shrink-0 rounded-full border border-dashed border-input"
      />
    );
  }

  return <Avatar name={assignee.name} className="ml-auto" />;
}
