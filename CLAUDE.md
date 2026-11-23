# Trayd mobile app (crew app)

React Native app for iOS and Android. One download with an **Employer view** and an **Employee view** (`src/screens/main/ViewChooserScreen.tsx`).

## Where things are

- **Theme:**
  - `src/theme/colors.ts`: palette plus light theme. Here `primary` is amber and `secondary` is navy.
  - `src/theme/index.tsx`: spacing, radii and type sizes.
  - `src/theme/fonts.ts`.
  - The font files are in `assets/fonts/`.
- **Shared UI:** `src/components/ui/`. Jobs UI is in `src/components/jobs/`, tasks in `src/components/tasks/`.
- **Screens:** `src/screens/`. The start-job flow is `src/screens/startJob/StartJobScreen.tsx`.
- **Commands:** `npm run lint`, `npm test`. The iOS build and TestFlight upload need a Mac with Xcode (`ios/TraydApp.xcworkspace`).

## Known copy and behaviour to fix

- `src/screens/onboarding/LocationScreen.tsx` says "Auto clock-in on site", but nothing clocks people in automatically.
- The Notifications switch on `ProfileScreen.tsx` only holds local state. It isn't saved.
- There's no app-update check yet. Build it with the version rules below.

## Trayd design system — read this before any UI, copy or design work

The brand book and components live in the **Trayd Design System**:
https://claude.ai/artifact/3Gn9YG8RzNT3eb3St4NovC

- In Claude Code, read it with the Artifact tool (`action: "read"`, `path: "project/README.md"`), then the component pages you need (`project/components/<Name>/README.md`). It's private to the Trayd account, so it only opens for that account.
- If you can't read it, use the summary below. **Don't invent colours, fonts or components.**
- After new design decisions, update the design system as well as this file.

### Brand basics

- **Colours:**
  - navy `#16345A` (structure, headers);
  - amber `#E89B2D` (the one action colour), with amber2 `#C97F18` when amber is used as text;
  - cream page backgrounds: `#EFEAE0` in the crew app, `#F4EFE4` in the web app;
  - ink `#0E1A2D`;
  - muted text `#6B7382` (web) and `#5C6571` (crew app);
  - hairlines `#E2DDCF` and `#E6DFCF`.
- **Type:** Geist (Regular, Medium, SemiBold, Bold) and Geist Mono. Mono is for small uppercase labels only, never sentences.
- **Text on amber is always navy, never white.**
- **Logo:** use the real files only. Never redraw or recolour the mark.

### Rules added November 2026 (these override anything older)

- **Headings are navy with white text.** This covers panel headers, popup headers and list group headers (Main, Accounting, Default, Custom…). Subtitles go in light-blue mono `#A8BCD3`.
- **Selected is amber with navy text.** This covers Off/See/Edit options, select cards, the chosen dropdown row, job-type tiles and ticked boxes. Use navy ticks and navy icon tiles.
- **Main actions are amber with navy text.** Put the page's main action in the title row (`New job`, `New task`, `Invite`). Don't use a floating button that covers list content.
- **Notifications use the app's toast:** a filled alert at the top, with an icon, a short title, an optional detail line and an ×. It hides after 4s.
  - info: navy-blue `#1F4577`;
  - success: green `#3D6E55`;
  - warning: amber with ink text;
  - error: red `#B0432A`.

  In prototypes, buttons that aren't built yet show an info toast titled "Not in this prototype" saying what the button would do.
- **Popups:**
  - one that needs attention is centred over a navy shade (`rgba(14,26,45,.55)`);
  - one that must block the app is a bottom sheet with no close button.
- **Forms:**
  - long forms are numbered white cards ("01 Customer & type", "02 Schedule");
  - paired fields such as Date and Start time share one grid, so the boxes line up;
  - a disabled main button always shows a one-line reason above it.
- **Fewer taps:** combine steps into one screen where possible.
  - New job is one screen: customer, type, on site, materials, when, and before photos.
  - Scheduling needs a date **and** a start time.
  - New task uses the same layout.
- **Roles:**
  - The default roles are **Employer** (full access, can't be changed) and **Employee**.
  - Custom roles start from **Admin** (edit everything except Plan & billing), **Sub-contractor** (employer view, Jobs and Invoices & Quotes on Edit) and **Supplier** (employer view, Jobs and the Van stock price list on Edit).
  - Views are Employer and/or Employee. Permissions (Off/See/Edit for each menu page and settings page) only apply with the Employer view. A role with only the Employee view gets everything in the employee app.
  - Report issue is available to everyone. Switch view only shows for roles with both views.
- **Invites:**
  - Invites live in the **Team** module, not in Team & roles.
  - The role dropdown lists Default roles, then Custom roles, with **Create a new role** at the bottom. That goes straight to a new role in Business settings, then back to the invite.
  - Hourly rate is optional.
- **App updates:**
  - Keep `latest_version` and `min_version` separate for each platform, with an `enforce_min` flag.
  - If `enforce_min` is on and the installed version is below `min_version`, show the required update (blocking sheet, Update now only).
  - Otherwise, if the installed version is below `latest_version`, show the optional update (centred popup with Update now and Not now). It shows on every launch until they update.
  - Compare version numbers numerically: 1.0.10 is newer than 1.0.9.
  - In the version box, your version is amber2 and the latest is navy.
  - Store links:
    - iOS: https://apps.apple.com/ae/app/trayd/id6779176149
    - Android: https://play.google.com/store/apps/details?id=com.trayd.app

### Voice

- Short, plain, second person, sentence case. Join facts with " · ". Use numbers, not adjectives. Use euro (€) and uppercase Eircodes.
- Say **"team"**, never "crew".
- No emoji and no exclamation marks.
- **Only claim what the product really does.** Check the code first. For example:
  - employees join with an **8-character code** and then set a password, while employers get an email link (both last 48 hours);
  - there is no automatic clock-in or location-triggered notification today.
