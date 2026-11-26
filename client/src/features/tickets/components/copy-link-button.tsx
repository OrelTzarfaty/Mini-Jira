import { LinkIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useAutoClearState } from '@/lib/use-auto-clear-state';

// Long enough to read "Link copied", short enough that a second copy shows a fresh message.
const MESSAGE_DURATION_MS = 3000;

const MESSAGES = {
  copied: 'Link copied',
  failed: "Couldn't copy the link",
} as const;

type CopyResult = keyof typeof MESSAGES;

interface CopyLinkButtonProps {
  /** The page path to share, such as /projects/WEB/tickets/WEB-12. */
  path: string;
}

/**
 * "Copy link" on the ticket page (TKT-2, wireframe 04 A): puts the ticket's full URL on the
 * clipboard. The result is written next to the button in a status message, so screen readers
 * announce it too (WCAG 4.1.3). The URL is built from the path rather than read from the address
 * bar, so the shared link never carries anything extra.
 */
export function CopyLinkButton({ path }: CopyLinkButtonProps): ReactElement {
  // Hides the message after a few seconds.
  const [result, setResult] = useAutoClearState<CopyResult>(MESSAGE_DURATION_MS);

  async function copyLink(): Promise<void> {
    const url = new URL(path, window.location.origin).href;

    try {
      // Fails without permission or outside a secure context (https, localhost).
      await navigator.clipboard.writeText(url);
      setResult('copied');
    } catch {
      setResult('failed');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <p role="status" className="text-sm text-muted-foreground">
        {result && MESSAGES[result]}
      </p>
      <Button
        variant="outline"
        className="size-8 px-0 sm:w-auto sm:px-2.5"
        onClick={() => {
          void copyLink();
        }}
      >
        <LinkIcon aria-hidden="true" />
        {/* A phone shows only the icon (wireframe 04 H); the words stay as the button's name. */}
        <span className="sr-only sm:not-sr-only">Copy link</span>
      </Button>
    </div>
  );
}
