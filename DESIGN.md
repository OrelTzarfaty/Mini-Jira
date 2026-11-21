---
name: Mini-Jira
description: A lightweight team task board, in a light theme with one navy accent.
colors:
  paper-white: 'oklch(1 0 0)'
  desk-ink: 'oklch(0.205 0.013 262)'
  hoodie-navy: 'oklch(0.3 0.065 261)'
  on-color-white: 'oklch(1 0 0)'
  window-grey: 'oklch(0.967 0.003 262)'
  slate-text: 'oklch(0.5 0.014 262)'
  hairline: 'oklch(0.92 0.004 262)'
  control-edge: 'oklch(0.62 0.012 262)'
  signal-red: 'oklch(0.53 0.19 27)'
typography:
  headline:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: '2rem'
  title:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: '1.75rem'
  body:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: '1.5rem'
  body-sm:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: '1.25rem'
  label:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: '1.25rem'
rounded:
  sm: '4px'
  md: '6px'
  lg: '8px'
  xl: '12px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  2xl: '48px'
components:
  button-primary:
    backgroundColor: '{colors.hoodie-navy}'
    textColor: '{colors.on-color-white}'
    typography: '{typography.label}'
    rounded: '{rounded.lg}'
    height: '32px'
    padding: '0 10px'
  button-outline:
    backgroundColor: '{colors.paper-white}'
    textColor: '{colors.desk-ink}'
    typography: '{typography.label}'
    rounded: '{rounded.lg}'
    height: '32px'
    padding: '0 10px'
  button-ghost:
    textColor: '{colors.desk-ink}'
    typography: '{typography.label}'
    rounded: '{rounded.lg}'
    height: '32px'
    padding: '0 10px'
  button-ghost-hover:
    backgroundColor: '{colors.window-grey}'
  button-destructive:
    backgroundColor: '{colors.signal-red}'
    textColor: '{colors.on-color-white}'
    typography: '{typography.label}'
    rounded: '{rounded.lg}'
    height: '32px'
    padding: '0 10px'
  input:
    backgroundColor: '{colors.paper-white}'
    textColor: '{colors.desk-ink}'
    rounded: '{rounded.lg}'
    height: '32px'
    padding: '4px 10px'
  dialog:
    backgroundColor: '{colors.paper-white}'
    textColor: '{colors.desk-ink}'
    rounded: '{rounded.xl}'
    padding: '16px'
  avatar:
    backgroundColor: '{colors.window-grey}'
    textColor: '{colors.desk-ink}'
    rounded: '{rounded.full}'
    size: '32px'
---

# Design System: Mini-Jira

> Written in SETUP-6 from the built tokens in `client/src/styles/index.css`. The owner decided the
> base (light theme, white main color, navy accent from the hero photo, red only for destructive
> actions and overdue dates) in the wireframes. The Taste skill chose the typeface, the exact
> shades, the grey scale, spacing, radius, and shadows within that base. The names below
> ("The Bright Desk", "Hoodie Navy", ...) are proposals for the owner to confirm.

## Overview

**Creative North Star: "The Bright Desk"**

The hero photo shows the whole idea: a person in a navy hoodie at a white desk by a bright window,
looking at a task board. The app is that desk. White holds every screen, near-black ink carries the
words, thin grey hairlines separate areas, and one navy accent marks the next action. Nothing else
asks for attention, so the tickets, keys, and names stand out.

Mini-Jira is a working tool (Impeccable's Operate mode): people come to move tickets forward, not
to admire the interface. Density is moderate, controls are the familiar web ones, and brand lives
in precise details: the navy taken from the photo, a self-hosted typeface, and a focus ring you can
always see.

**Key Characteristics:**

- White main color on every screen; the photo appears only on the landing page.
- One accent, Hoodie Navy, for primary buttons, active items, and "Owner" labels.
- Red only for destructive actions and overdue dates.
- Flat surfaces with hairlines; shadows only for things that float (dialogs, the skip link).
- One focus ring everywhere: a solid 2px navy outline with a 2px gap.

## Colors

A restrained palette: white and ink-tinted neutrals with a trace of the navy hue, one accent, and
one warning red.

### Primary

- **Hoodie Navy** (≈ #1a2d4e): primary buttons, the focus ring, the current-page underline, active
  filters (navy outline), and "Owner" labels. Sampled from the hoodie in
  `docs/wireframes/assets/hero-day-desk.webp`: across 227,830 fabric pixels the median hue is 261°,
  and the window-lit folds reach a lightness of about 0.29 with a chroma near 0.06. The token keeps
  that hue and the lit-fold lightness, because the shadowed median (≈ #0b182c) reads as black at
  button size.

### Secondary

- **Signal Red** (≈ #c22826): destructive buttons (Delete, Remove) and overdue dates. Nothing else.
  It is a warning, not a second accent.

### Neutral

- **Paper White** (#ffffff): the page, the top bar, dialogs, and inputs. The main color of the app.
- **Desk Ink** (≈ #14171d): all body text, headings, and icons. Near-black, never #000.
- **Window Grey** (≈ #f3f4f6): hover backgrounds, skeleton blocks, avatar circles, and the
  dialog footer band (at 50%).
- **Slate Text** (≈ #5f636b): secondary text, hints, placeholders, and "Member" labels.
- **Hairline** (≈ #e3e5e7): lines that divide areas, such as the line under the top bar. They don't
  mark a control, so they stay light.
- **Control Edge** (≈ #82868e): the border of inputs and outline buttons, strong enough (3:1) to
  show where a control starts.
- **On-color White** (#ffffff): text on navy and red buttons.

### Measured contrast

Measured in Chrome as the colors render (alpha included), on the background behind them:

| Pair                                        | Ratio   | Needs |
| ------------------------------------------- | ------- | ----- |
| Desk Ink text on white                      | 17.95:1 | 4.5:1 |
| Slate Text (muted, placeholders) on white   | 6.03:1  | 4.5:1 |
| Slate Text on Window Grey (computed)        | 5.45:1  | 4.5:1 |
| White text on a Hoodie Navy button          | 13.73:1 | 4.5:1 |
| White text on a Signal Red button           | 5.79:1  | 4.5:1 |
| Signal Red overdue text on white            | 5.79:1  | 4.5:1 |
| Focus ring on white                         | 13.73:1 | 3:1   |
| Focus ring on the dialog footer (grey band) | 13.05:1 | 3:1   |
| Control Edge (inputs, outline buttons)      | 3.65:1  | 3:1   |
| Control Edge on the dialog footer           | 3.47:1  | 3:1   |

`client/src/styles/design-tokens.test.ts` checks the key pairs again whenever a token changes.

### Named Rules

**The One Navy Rule.** Hoodie Navy is the only accent. It marks the next action and the current
place; it is never decoration.

**The Red Means Loss Rule.** Signal Red appears only on destructive actions and overdue dates.
A failed page load (ErrorState) uses ink text and an icon.

**The Never Color Alone Rule.** Priority, status, overdue, and the current page always add an icon,
a word, or an underline to the color.

## Typography

**Body Font:** Instrument Sans Variable (with ui-sans-serif, system-ui, sans-serif)

**Character:** A calm, precise neo-grotesk with slightly open shapes, made for productivity
software. It stays crisp at the 14px interface size and still has enough character in headings
that the app doesn't look like the browser default.

It is self-hosted from the exactly pinned npm package `@fontsource-variable/instrument-sans`
(5.3.0, OFL-1.1), so the app sends no requests to font servers. The package's default CSS loads one
upright variable file per character set (Latin is about 30 KB). The browser downloads only the sets
a page uses, and that one file covers every weight. There is no italic and no width axis, and there
is no monospace face: ticket keys use the same face.

### Hierarchy

- **Headline** (600, 24px, 32px line height): the page title (`h1`), one per page.
- **Title** (600, 18px, 28px line height): section and empty-state titles. Dialog titles use 16px
  at 500.
- **Body** (400, 16px, 24px line height): text people read, such as descriptions and comments.
- **Body small** (400, 14px, 20px line height): interface text such as table cells, meta, and
  hints.
- **Label** (500, 14px, 20px line height): buttons, navigation, and form labels.

Headings balance their lines, and paragraphs avoid a single word alone on the last line.

### Named Rules

**The Three Weights Rule.** 400 for text, 500 for controls and labels, 600 for headings. Never 700
or more.

## Layout

A 4px grid. Use the steps 4, 8, 12, 16, 24, and 48px for gaps and padding; tighter inside a group,
wider between groups, and more space above a heading than below it.

- The top bar is 56px tall, white, with a hairline under it. Page padding is 16px on phones and
  24px from 640px up.
- Controls are 32px tall, so every click target is above the 24×24px minimum (WCAG 2.5.8).
- Under 640px the links that don't fit the top bar move into the Menu dialog (wireframe 02 H).
- Screen layouts follow the approved wireframes in `docs/wireframes/`; this file only sets the
  materials.

## Elevation & Depth

Flat by default. Surfaces sit on white and are separated by hairlines, not shadows. Shadows appear
only on things that float above the page, and they are tinted with the ink color instead of black.

### Shadow Vocabulary

- **Small** (`box-shadow: 0 1px 2px 0 oklch(0.205 0.013 262 / 0.08)`): the skip link when it
  appears.
- **Large** (`box-shadow: 0 16px 40px -12px oklch(0.205 0.013 262 / 0.24), 0 2px 6px 0 oklch(0.205 0.013 262 / 0.06)`):
  dialogs, with a 1px ink hairline at 10%.
- **Overlay:** Desk Ink at 20% behind dialogs, with no blur, which matches the wireframes' "dimmed
  (light grey)" background.

### Named Rules

**The Flat Desk Rule.** If it doesn't float above the page, it has no shadow.

## Shapes

Gently rounded and consistent: 8px on controls (buttons, inputs), 12px on dialogs, 4–6px on small
parts, and full circles for avatars. The logo mark is a navy rounded square holding a white square
in a frame, drawn as SVG (`client/public/favicon.svg`). The same file is the favicon and the top
bar logo.

## Components

### Buttons

- **Shape:** gently rounded (8px), 32px tall, 14px label at 500.
- **Primary:** Hoodie Navy with white text: "Get started", "Create project", "Create ticket", "Save
  changes". One per view.
- **Outline:** white with a Control Edge border, for secondary actions such as Cancel and Try
  again.
- **Ghost:** no border; Window Grey on hover. Used for navigation links in the top bar.
- **Destructive:** Signal Red with white text, only for actions that delete or remove.
- **Disabled:** 50% opacity, not clickable.
- **Focus:** the global focus ring (below); buttons don't draw their own.

### Inputs / Fields

- **Style:** white, 1px Control Edge border, 8px radius, 32px tall. Text is 16px on phones (so
  phones don't zoom in) and 14px from 768px up. Placeholders use Slate Text.
- **Focus:** the global focus ring.
- **Disabled:** Window Grey fill at 50% opacity.
- **Invalid:** the component still has shadcn/ui's red border for `aria-invalid`. Whether form
  errors may use red is an open question for the owner, to settle before AUTH-1 builds the forms.

### Focus ring

Every focusable element shows the same indicator: a solid 2px Hoodie Navy outline with a 2px gap.
It is set once in `index.css`, appears at full strength at once (it never animates), and stays
visible in Windows high-contrast mode because it is a real outline, not a box-shadow.

### Navigation

- **Top bar:** white, 56px, hairline below. The logo mark and "Mini-Jira" link to My Projects.
- **Links:** ghost buttons in ink. The current page gets a 2px Hoodie Navy underline 8px below the
  text, like the active tab in wireframes 03 and 07, and `aria-current="page"` for screen readers.
- **Phone:** a Menu button opens a dialog with the same links and the same underline.

### Dialogs

- White, 12px radius, 16px padding, the large shadow, and a 1px hairline. The footer is a Window
  Grey band holding the buttons.
- **ConfirmDialog** (destructive confirmations) uses an outline Cancel, focused first, and a red
  confirm button.

### Avatar

- Initials (12px at 500, Desk Ink) in a 32px Window Grey circle. Screen readers hear the full
  name.

### State components

- **EmptyState:** a Slate Text icon, an 18px title, a short Slate Text hint, and the next step as a
  primary button.
- **ErrorState:** a framed box with a warning icon and ink text (not red: nothing was destroyed)
  and an outline "Try again" button.
- **PageSkeleton:** Window Grey blocks that pulse gently, and stay still when the user asks for
  reduced motion.

## Do's and Don'ts

### Do:

- **Do** use Hoodie Navy for exactly one primary action per view, the focus ring, and active
  items.
- **Do** separate areas with Hairline lines and give controls the Control Edge border.
- **Do** pair every color signal with an icon, a word, or an underline.
- **Do** keep text at 4.5:1 or more and control edges and focus indicators at 3:1 or more, measured
  on the real background.
- **Do** use the global focus ring; remove a component's own ring classes if a new shadcn/ui
  component brings them.

### Don't:

- **Don't** use red for anything except destructive actions and overdue dates.
- **Don't** add a second accent color, gradients, or decorative blur.
- **Don't** draw focus with a half-transparent ring (`ring-ring/50`): it rendered at about 1.6:1
  in SETUP-5 and failed WCAG 1.4.11.
- **Don't** use the hero photo outside the landing page.
- **Don't** load fonts from a third-party server or add weights above 600.
