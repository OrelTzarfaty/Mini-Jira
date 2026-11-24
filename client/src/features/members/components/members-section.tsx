import { Loader2Icon } from 'lucide-react';
import type { ReactElement } from 'react';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { MemberList, MemberListSkeleton } from '@/features/members/components/member-list';
import { useProjectMembers } from '@/features/members/hooks/use-project-members';
import { SettingsSection } from '@/features/projects/components/settings-section';

type MembersQuery = ReturnType<typeof useProjectMembers>;

/** The members list, page by page, with its loading and error states (PRJ-3, wireframe 06 F). */
function MembersContent({ membersQuery }: { membersQuery: MembersQuery }): ReactElement {
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
      <MemberList members={data.pages.flatMap((page) => page.items)} />
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

/** "Members (3)" on the project settings page (wireframe 06 A and C). */
export function MembersSection({ projectKey }: { projectKey: string }): ReactElement {
  const membersQuery = useProjectMembers(projectKey);
  // The newest page has the newest total; until a page arrives there is no count to show.
  const total = membersQuery.data?.pages.at(-1)?.total;

  return (
    <SettingsSection title={total === undefined ? 'Members' : `Members (${String(total)})`}>
      <MembersContent membersQuery={membersQuery} />
    </SettingsSection>
  );
}
