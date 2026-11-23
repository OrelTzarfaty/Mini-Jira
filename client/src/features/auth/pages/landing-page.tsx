import { useRef } from 'react';
import type { ReactElement } from 'react';
import { Link, useOutlet } from 'react-router';

import { DocumentTitle } from '@/components/document-title';
import { Button } from '@/components/ui/button';
import heroPhoto from '@/features/auth/assets/hero-day-desk.webp';

// The photo's own size. With width and height on the <img>, the browser reserves its space
// before the file arrives, so nothing jumps when it loads (no layout shift).
const HERO_PHOTO_WIDTH = 1774;
const HERO_PHOTO_HEIGHT = 887;

/** The white top bar for visitors: the name, "Log in", and "Get started" (wireframe 01 A). */
function LandingTopBar(): ReactElement {
  return (
    <header className="relative z-10 border-b bg-background">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
        {/* Not a link: it would only lead to this same page. */}
        <p className="inline-flex h-8 items-center gap-2 px-1 font-semibold">
          {/* The logo mark is the same file as the favicon. The text next to it names it. */}
          <img src="/favicon.svg" alt="" className="size-6" />
          Mini-Jira
        </p>
        <nav aria-label="Account" className="ml-auto">
          <ul className="flex items-center gap-1 sm:gap-2">
            <li>
              <Button asChild variant="ghost">
                <Link to="/login">Log in</Link>
              </Button>
            </li>
            {/* On a phone the hero's own button is right below, so the bar keeps only Log in (01 D). */}
            <li className="hidden sm:block">
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

/**
 * The one screen visitors see (wireframe 01 A and D, AUTH-1). From 1024px the photo fills the
 * screen behind the text, with a white fade on the left so the dark text stays readable. On
 * narrower screens the photo sits on top, cropped to the person and the monitor, and the text
 * sits below it on plain white.
 *
 * /login and /register render their popup in the Outlet, over this page (wireframe 01 B and C).
 */
export function LandingPage(): ReactElement {
  // What opened the Log in or Register popup, so focus can return to it on close. It lives
  // here, not in the popup, so it survives a switch from one popup to the other.
  const popupOpenerRef = useRef<HTMLElement | null>(null);
  const popup = useOutlet(popupOpenerRef);

  return (
    <div className="flex min-h-svh flex-col">
      {/* An open popup names the tab itself. */}
      {popup === null && <DocumentTitle title="Welcome" />}
      <LandingTopBar />
      <main id="main-content" className="relative flex flex-1 flex-col lg:justify-center">
        {/* Decoration only (wireframe 01 A): the headline carries the meaning, so alt is empty.
            It is the largest thing on the first screen, so it loads first and never lazily. */}
        <img
          src={heroPhoto}
          alt=""
          width={HERO_PHOTO_WIDTH}
          height={HERO_PHOTO_HEIGHT}
          fetchPriority="high"
          className="aspect-4/3 w-full object-cover object-[78%_50%] sm:aspect-2/1 lg:absolute lg:inset-0 lg:aspect-auto lg:h-full lg:object-[70%_50%]"
        />
        {/* The white fade: solid behind the text, clear before the person and the monitor. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden bg-linear-to-r from-background from-30% via-background/80 via-42% to-transparent to-62% lg:block"
        />
        <div className="relative max-w-lg px-4 py-8 duration-500 ease-out animate-in fade-in-0 slide-in-from-bottom-2 sm:px-6 lg:px-12 lg:py-16">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Plan, track and ship your team&apos;s work.
          </h1>
          <p className="mt-4 max-w-md text-lg text-pretty text-muted-foreground">
            Projects, tickets and a drag-and-drop board. Simple enough for small teams.
          </p>
          <Button asChild size="lg" className="mt-8 px-4">
            <Link to="/register">Get started — it&apos;s free</Link>
          </Button>
        </div>
      </main>
      <footer className="relative border-t bg-background px-4 py-3 text-sm text-muted-foreground sm:px-6">
        © Mini-Jira · student project
      </footer>
      {popup}
    </div>
  );
}
