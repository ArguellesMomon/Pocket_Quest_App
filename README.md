# Pocket Quest

**Small steps. Big adventures.** A responsive quest journal where real-life tasks earn coins and XP, companions grow alongside you, and a cozy pixel habitat becomes your own.

This replaces the original Pixel Idle To-Do skeleton with a complete multi-page experience and a fresh Neon backend. The design deliberately differs from Daymargin: lilac, peach, illustrated worlds, collectible items, and progression define Pocket Quest.

## Play locally

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5175**. Guest mode works without database credentials and saves progress in this browser. Choose Mochi or Nori (cats), Pip or Maple (dogs), or the supplied Samo dog.

## What works

- Compact Today, Quests, Pets, Shop, Stats, and Settings screens; longer lists use pagination and category tabs.
- One-time quests and daily rituals, effort-based rewards, due dates, categories, search, sorting, editing, and removal.
- Daily three-quest bonus, timezone-aware resets and streaks, companion levels, and six earned milestones.
- Ten purchasable items, consumable food/toys, level unlocks, room decor, and illustrated backgrounds. A free Dream garden is always available.
- Four newly generated sprite characters plus the supplied Samo sheet, with real frame animation, stat-driven moods, feeding/play reactions, celebration, and bounded idle stat decay.
- Focus timer with pause/resume and deadline persistence across navigation/reload.
- Light, dark, and system themes; reduced motion; optional victory sounds; data export.
- Desktop sidebar, fixed mobile navigation, reachable add/care actions, keyboard-accessible sheets, and offline PWA assets.
- Clear Buy/Use/Apply controls, animated scene previews, a pet-side Scene shortcut, and labeled New quest buttons. Quick care uses inventory first and buys/uses a snack or toy atomically when the bag is empty.
- Email/password accounts, signup, sign-in/out, email-code UI, and password recovery/reset UI through Neon Auth.
- Server-validated cloud actions, atomic rewards/purchases, owner isolation, and idempotent retries.

Guest and cloud adventures are separate. Guest progress stays on this device; account progress is saved in Neon.

Old scarf and crown purchases become Peach beach and Cloud nine backgrounds at no extra cost. Active Starlight clearing purchases move to the background slot. Companion progress and room decor remain intact. Source artwork, prompts, and the packaging script are recorded in [assets/shop/README.md](assets/shop/README.md).

## Neon setup

This checkout is configured for the dedicated **Pocket-Quest** project in AWS Singapore. The applied schema is [neon/001_game.sql](neon/001_game.sql). `.neon` records the project context; credentials are in ignored `.env.local`.

For another environment, copy `.env.example` to `.env.local` and fill in:

| Variable              | Used by                                          |
| --------------------- | ------------------------------------------------ |
| `DATABASE_URL`        | Server, pooled Postgres connection               |
| `DATABASE_URL_DIRECT` | Schema migrations only                           |
| `NEON_AUTH_BASE_URL`  | Server auth proxy                                |
| `NEON_AUTH_JWKS_URL`  | Server JWT verification                          |
| `VITE_NEON_AUTH_URL`  | Public auth branch identity / cloud feature flag |

Never expose database credentials through a `VITE_` variable. Enable managed Neon Auth on your branch and register the exact application origins in its trusted-domain settings. The local origin `http://127.0.0.1:5175` is already registered for this project.

```sh
npm run db:migrate
```

Migrations require a direct connection. Browser actions go through `/api/game`; the server verifies identity and applies the shared game rules in a locked transaction using an owner-restricted database role. The app does not use a browser-facing Data API.

The user chose a fresh Neon start. No existing Supabase accounts or progress were imported, and the old Supabase cloud project was not deleted.

## Checks

```sh
npm test
npm run test:e2e
npm run build
```

On Windows the browser tests use installed Microsoft Edge. Other platforms use Playwright Chromium; run `npx playwright install chromium` if needed. `PLAYWRIGHT_CHANNEL` can select another installed channel. The browser test runner starts a local server when one is not already running.

The default browser tests use local guest data. To opt into the live Neon UI test, set `RUN_CLOUD_E2E=1` before running `npm run test:e2e`. That test creates a QA account at a reserved `.invalid` address. `node scripts/cloud-smoke.mjs` also exercises the real API using a QA account. These tests leave their QA accounts in this development project and do not send email.

To test the installed guest PWA offline, build the app, run `npm run preview -- --port 4175`, and set `RUN_PWA_E2E=1` before the browser tests. Visual previews are saved to `docs/previews`.

```sh
npm run format
npm run icons
npm run sprites:pack
```

## Deploy to Vercel

Import this directory as a Vite project. Build with `npm run build` and serve `dist`. Vercel discovers `api/auth.js` and `api/game.js`; `vercel.json` preserves API requests and handles SPA routes.

Set the five environment variables listed above, add the exact deployment origin to Neon Auth's trusted domains, and redeploy. Run account and purchase flows on the deployment. Cloud functions require server hosting; a static-only host supports guest mode when the public auth variable is omitted.

Password recovery and verification screens are implemented, but inbox delivery has not been exercised. Configure production email and validate recovery delivery before public launch using [Neon's production checklist](https://neon.com/docs/auth/production-checklist).

## Source map

| Location                                               | Responsibility                                              |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `shared/game.js`                                       | Authoritative game rules and catalog                        |
| `src/Application.jsx`                                  | Routes, navigation, theme, dialogs                          |
| `src/hooks/useGameState.js`                            | Guest persistence, cloud state, safe retries                |
| `src/pages/`                                           | Six app destinations and account/welcome screens            |
| `src/components/PixelArt.jsx`                          | SVG landscapes, item art, and legacy fox/rabbit saves       |
| `src/components/SpritePet.jsx`, `shared/companions.js` | Animated sprite playback and moods                          |
| `src/components/PhoneUI.jsx`, `src/styles/phone.css`   | Compact phone UI and direct item actions                    |
| `api/` and `server/`                                   | Auth proxy, JWT authorization, transactional Postgres store |
| `neon/`                                                | Versioned database schema                                   |
| `tests/`                                               | Domain, database, and browser verification                  |

See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for the design, economy, architecture, and verification notes. This local redesign has not been publicly deployed.

See [the character asset record](assets/companions/README.md) for saved source/runtime files, the final ImageGen prompts, atlas packaging, and mood maps. Existing Neon/guest progress remains compatible with this phone UI update; no database reset was performed.
