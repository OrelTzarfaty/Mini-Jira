import type { Member } from '@mini-jira/shared';
import { Loader2Icon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactElement, Ref } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { AddMemberForm } from '@/features/members/components/add-member-form';
import { MemberList, MemberListSkeleton } from '@/features/members/components/member-list';
import { useProjectMembers } from '@/features/members/hooks/use-project-members';
import { useRemoveMemberMutation } from '@/features/members/hooks/use-remove-member-mutation';
import { SettingsSection } from '@/features/projects/components/settings-section';
import { serverErrorMessage } from '@/lib/show-server-error';

type MembersQuery = ReturnType<typeof useProjectMembers>;

interface MembersContentProps {
  membersQuery: MembersQuery;
  onRemove: (member: Member) => void;
  listRef: Ref<HTMLUListElement>;
}

/** The members list, page by page, with its loading and error states (PRJ-3, wireframe 06 F). */
function MembersContent({ membersQuery, onRemove, listRef }: MembersContentProps): ReactElement {
  const {
    data,
    isError,
    isFetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = membersQuery;

  // A failed background refresh keeps showing the members the user already has.
  if (!data) {
    return isError && !isFetching ? (
      <ErrorState
        message="Couldn't load the members."
        onRetry={() => {
          void refetch();
        }}
      />
    ) : (
      <MemberListSkeleton />
    );
  }

  const loadMore = (): void => {
    void fetchNextPage();
  };

  return (
    <div className="grid gap-3">
      <MemberList
        ref={listRef}
        members={data.pages.flatMap((page) => page.items)}
        onRemove={onRemove}
      />
      {isFetchNextPageError ? (
        <ErrorState message="Couldn't load more members." onRetry={loadMore} />
      ) : (
        hasNextPage && (
          <Button
            variant="outline"
            className="justify-self-start"
            disabled={isFetchingNextPage}
            onClick={loadMore}
          >
            {isFetchingNextPage && <Loader2Icon aria-hidden="true" className="animate-spin" />}
            {isFetchingNextPage ? 'Loading…' : 'Show more'}
          </Button>
        )
      )}
    </div>
  );
}

/** "Avi" from "Avi Ben", for the remove dialog's sentences (wireframe 06 C). */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * "Members (3)" on the project settings page (wireframe 06 A and C): add a member (PRJ-3), the
 * list, and removing a member after a confirmation (PRJ-4).
 */
export function MembersSection({ projectKey }: { projectKey: string }): ReactElement {
  const membersQuery = useProjectMembers(projectKey);
  const removeMemberMutation = useRemoveMemberMutation(projectKey);
  const listRef = useRef<HTMLUListElement>(null);
  // "Avi Ben added" or "Avi Ben removed": the result of the owner's last change.
  const [statusMessage, setStatusMessage] = useState('');
  // Kept after the dialog closes, so its text doesn't change while it fades out.
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  // The newest page has the newest total; until a page arrives there is no count to show.
  const total = membersQuery.data?.pages.at(-1)?.total;

  function askToRemove(member: Member): void {
    // A new dialog starts without the error of the last one.
    removeMemberMutation.reset();
    setMemberToRemove(member);
    setIsRemoveDialogOpen(true);
  }

  function removeMember(): void {
    if (!memberToRemove) {
      return;
    }

    const member = memberToRemove;
    setStatusMessage('');
    // On failure the dialog stays open with the server's message (06 C).
    removeMemberMutation.mutate(member, {
      onSuccess: () => {
        setIsRemoveDialogOpen(false);
        setStatusMessage(`${member.name} removed`);
      },
    });
  }

  const name = memberToRemove?.name ?? '';
  const first = firstName(name);

  return (
    <SettingsSection title={total === undefined ? 'Members' : `Members (${String(total)})`}>
      <div className="grid gap-4">
        <div className="grid gap-3">
          <AddMemberForm projectKey={projectKey} announce={setStatusMessage} />
          {/* Always in the page (not hidden), so screen readers announce the message when it
              appears. */}
          <p role="status" className="text-sm">
            {statusMessage}
          </p>
        </div>
        {/* A hairline between the form and the list (wireframe 06 A). */}
        <div className="border-t pt-1">
          <MembersContent membersQuery={membersQuery} onRemove={askToRemove} listRef={listRef} />
        </div>
      </div>
      <ConfirmDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        title={`Remove ${name} from ${projectKey}?`}
        description={`Tickets assigned to ${first} will become unassigned. ${first} will lose access to this project.`}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        isPending={removeMemberMutation.isPending}
        error={
          removeMemberMutation.error ? serverErrorMessage(removeMemberMutation.error) : undefined
        }
        // The removed member's row and its Remove button are gone, so focus moves to the list.
        fallbackFocusRef={listRef}
        onConfirm={removeMember}
      />
    </SettingsSection>
  );
}
