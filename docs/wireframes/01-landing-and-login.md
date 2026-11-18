# Wireframe 01 — Landing page + Log in / Register popup

**Status:** ✅ Approved by the owner · 2026-11-18 (draft 3)
**Inspiration:** a big-headline marketing homepage (headline on the left, round "pill" buttons, a top bar with **Log in** + a main button). We take the *layout idea* only, not another product's branding.
**Theme:** **light — white is the main color** (owner's choice), with dark text and a navy accent taken from the photo.
**Requirements:** AUTH-1 (register), AUTH-2 (log in), Visitor role ("can only register or log in").

---

## A. Landing page (visitor, not logged in) — desktop

Background photo: [assets/hero-day-desk.webp](assets/hero-day-desk.webp) — a person in a bright office by the window, looking at a monitor that shows a task board. It fills the whole screen behind the text.

![Hero photo](assets/hero-day-desk.webp)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣ Mini-Jira                                      Log in   ( Get started )│ ← white top bar,
├──────────────────────────────────────────────────────────────────────────┤   dark text
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░                                     │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░  (photo: person at the desk,        │
│▓▓ Plan, track and ▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░   bright office, city outside) ┌────┐│
│▓▓ ship your team's ▓▓▓▓▓▓▓▒▒▒▒▒░░░░                                │board││ ← the monitor
│▓▓ work. ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░             🧑                 │▢ ▢ ▢││   shows a task
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░                                └────┘│   board
│▓▓ Projects, tickets and a ▓▒▒▒▒▒░░░░                                     │
│▓▓ drag-and-drop board. ▓▓▓▒▒▒▒▒░░░░                                      │
│▓▓ Simple enough for small ▒▒▒▒▒░░░░                                      │
│▓▓ teams. ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░                                      │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░                                     │
│▓▓ ( Get started — it's free ) ▒░░░░                                      │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ © Mini-Jira · student project                                            │ ← small footer
└──────────────────────────────────────────────────────────────────────────┘
 ▓ ▒ ░ = white fade over the left of the photo: almost solid white at the edge,
         clear by the middle — so the dark text is easy to read
```

- **Log in** → opens the **Log in popup** (B).
- **Get started** (both buttons) → opens the **Register popup** (C).
- The page has only this one screen (no long marketing scroll).
- **Colors:** white background and top bar · near-black headline and text · **navy** "Get started" button with white text (navy is taken from the hoodie in the photo).
- **Text sits on the left**, over a **white fade**: the left of the photo (window, plant) is bright and busy, so the fade keeps the dark text readable. The person and the monitor stay clear on the right.
- The photo is decoration only: empty `alt=""` for screen readers; the headline carries the meaning.
- Saved as WebP (162 KB, 1774×887), small enough to load fast.

## B. Log in popup

```
┌──────────── landing page, dimmed (light grey) behind the popup ─────────┐
│                                                                          │
│                  ┌────────────────────────────────────┐                  │
│                  │ Log in to Mini-Jira             [✕]│ ← white card,    │
│                  │                                    │   soft shadow,   │
│                  │ Email                              │   rounded corners│
│                  │ [________________________________] │                  │
│                  │                                    │                  │
│                  │ Password                           │                  │
│                  │ [____________________________][👁] │ ← show/hide password
│                  │                                    │                  │
│                  │ ⚠ Email or password is incorrect   │ ← one generic error (AUTH-2)
│                  │                                    │                  │
│                  │ (             Log in             ) │ ← navy, disabled + spinner while sending
│                  │                                    │                  │
│                  │ No account?  Create one →          │ ← switches to Register popup
│                  └────────────────────────────────────┘                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## C. Register popup

```
                  ┌────────────────────────────────────┐
                  │ Create your account             [✕]│
                  │                                    │
                  │ Name                               │
                  │ [________________________________] │
                  │                                    │
                  │ Email                              │
                  │ [________________________________] │
                  │ ⚠ This email is already registered │ ← error under the field (AUTH-1)
                  │                                    │
                  │ Password                           │
                  │ [____________________________][👁] │
                  │ At least 8 characters              │ ← hint
                  │                                    │
                  │ (          Create account        ) │ ← navy, disabled while sending
                  │                                    │
                  │ Already have an account? Log in →  │ ← switches to Log in popup
                  └────────────────────────────────────┘
```

## D. Phone width

```
┌──────────────────────┐        ┌──────────────────────┐
│ ▣ Mini-Jira   Log in │        │ Log in            [✕]│ ← on a phone the popup
├──────────────────────┤        │                      │   fills the whole screen
│ ┌──────────────────┐ │        │ Email                │   (white)
│ │ (photo, cropped  │ │        │ [__________________] │
│ │  to the person + │ │        │ Password             │
│ │  monitor)        │ │        │ [______________][👁] │
│ └──────────────────┘ │        │                      │
│ Plan, track and      │        │ (      Log in      ) │
│ ship your team's     │        │                      │
│ work.                │        │ No account? Create → │
│ Projects, tickets... │        │                      │
│ ( Get started )      │        │                      │
└──────────────────────┘        └──────────────────────┘
 Phone: the photo sits on top (cropped to the person and the monitor),
 the text sits below it on plain white — no fade needed.
```

## Behavior

- After a successful log in or register → go to **My Projects** (AUTH-2; register also logs in).
- **✕**, the **Esc** key, or clicking the dimmed background closes the popup. Typed input isn't lost on a server error.
- Opening `/login` or `/register` directly shows the landing page with that popup already open, so "log in again" redirects still work.
- Keyboard: focus moves into the popup when it opens and returns to the button when it closes.

## Decisions

- **Email + password only — no "Continue with Google".** Social login is out of scope (requirements §6). Decided 2026-11-18.
- **Hero = full-screen background photo** (person at a desk with a task board on the monitor), provided by the owner. Replaces the "product preview" box. Decided 2026-11-18.
- **Light theme: white is the main color** of the whole app, not only this page. Navy accent. Decided 2026-11-18 — becomes the base for the design system in SETUP-6.

- **One screen only, and the photo is used only here** (the landing / log-in page). No extra sections below; the photo appears nowhere else in the app. Decided 2026-11-18.

- **Photo source: AI-generated with ChatGPT** by the owner. Credit it in the README as "Hero image generated with ChatGPT". Decided 2026-11-18.

## Open questions

None.
