import type { Ticket, TicketUser } from '@mini-jira/shared';
import { CalendarIcon, CircleDashedIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { Avatar } from '@/components/avatar';
import { isOverdue } from '@/features/tickets/lib/is-overdue';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from '@/features/tickets/lib/ticket-labels';
import { formatCalendarDate, formatDateTime } from '@/lib/format-date';

/** One "label: value" pair of the details list. */
function Detail({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-2 md:grid-cols-1 md:gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function Person({ user }: { user: TicketUser }): ReactElement {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {/* The name is written next to the initials, so screen readers skip the circle. */}
      <span aria-hidden="true">
        <Avatar name={user.name} className="size-6 text-[0.625rem]" />
      </span>
      <span className="break-words">{user.name}</span>
    </span>
  );
}

function DueDate({ ticket }: { ticket: Ticket }): ReactElement {
  if (ticket.dueDate === null) {
    return <span className="text-muted-foreground">None</span>;
  }

  const overdue = isOverdue(ticket);

  return (
    // Red plus the word "Overdue", never the color alone (DESIGN.md).
    <span
      className={
        overdue ? 'flex items-center gap-1.5 text-destructive' : 'flex items-center gap-1.5'
      }
    >
      <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
      <time dateTime={ticket.dueDate}>{formatCalendarDate(ticket.dueDate)}</time>
      {/* The leading space keeps the words apart for screen readers. */}
      {overdue && <span className="font-medium"> · Overdue</span>}
    </span>
  );
}

/**
 * The ticket's details panel (wireframe 04 A, TKT-2): who has it and who made it, the status,
 * priority, type, due date, and dates. `assigneeAction` goes under the assignee: the page's
 * "Assign to me" (TKT-5). The Estimate waits for the mentor's OK (DOC-5), so it isn't shown.
 */
export function TicketDetails({
  ticket,
  assigneeAction,
}: {
  ticket: Ticket;
  assigneeAction?: ReactNode;
}): ReactElement {
  return (
    <dl className="grid gap-3 md:gap-4">
      <Detail label="Status">{STATUS_LABELS[ticket.status]}</Detail>
      <Detail label="Assigned to">
        <span className="grid gap-1">
          {ticket.assignee ? (
            <Person user={ticket.assignee} />
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <CircleDashedIcon aria-hidden="true" className="size-6 shrink-0" />
              Unassigned
            </span>
          )}
          {assigneeAction}
        </span>
      </Detail>
      <Detail label="Created by">
        <Person user={ticket.reporter} />
      </Detail>
      <Detail label="Priority">{PRIORITY_LABELS[ticket.priority]}</Detail>
      <Detail label="Type">{TICKET_TYPE_LABELS[ticket.type]}</Detail>
      <Detail label="Due date">
        <DueDate ticket={ticket} />
      </Detail>
      <Detail label="Created">
        <time dateTime={ticket.createdAt}>{formatDateTime(ticket.createdAt)}</time>
      </Detail>
      <Detail label="Updated">
        <time dateTime={ticket.updatedAt}>{formatDateTime(ticket.updatedAt)}</time>
      </Detail>
    </dl>
  );
}
