# Pocket Quest

**Small steps. Big adventures.** A responsive quest journal where real-life tasks earn coins and XP, companions grow alongside you, and a cozy pixel habitat becomes your own.

This replaces the original Pixel Idle To-Do skeleton with a complete multi-page experience and a fresh Neon backend. The design deliberately differs from Daymargin: lilac, peach, illustrated worlds, collectible items, and progression define Pocket Quest.

## Play locally

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5175**. Configure Neon below, then create an account or sign in. Choose Mochi, Nori, Chami, Pip, Maple, or Finn from Pets → Friends.

## What works

- A friendly welcome and compact sign-in/sign-up flow with password visibility controls. Account access is required; there are no guest play entry points.
- Warm paper, lilac, and mint colors with a matching dark palette, clear task icons, and a floating mobile navigation dock.
- Compact Today, Tasks, Pets, Shop, Stats, and Settings screens; longer lists use pagination and category tabs. Today puts the next task before the companion scene on phones.
- Today uses a companion world, one-quest deck, tap-through queue and wins, daily treasure trail, inline reward reveals, focused timers, and optional sound/haptic feedback. See [the Today design and checks](docs/TODAY-PLAY.md).
- One-time tasks and one-tap daily repetition, effort-based rewards, clear Today/Overdue dates, categories, search, sorting, editing, and removal. The task list defaults to due dates first, with recent tasks breaking ties.
- Daily three-quest bonus, timezone-aware resets and streaks, companion levels, and six earned milestones.
- Sixteen purchasable items, including five foods, toys, room decor, and illustrated backgrounds. Shop pages show four items at a time. A free Dream garden is always available.
- Six animated companions with stat-driven moods, feeding/play reactions, celebration, and bounded idle stat decay. Chami combines eight supplied frames with 24 new mood poses; Finn uses the original Samoyed sheet.
- Signed-in companion chat on Pets: one Groq model, six personalities, separate account/character histories and memory, earlier-message pagination, and individual clear-chat controls.
- Focus timer with pause/resume and deadline persistence across navigation/reload.
- Settings → Sounds holds effects, haptics, and the supplied Pocket Quest background track. Music starts at a subtle 12% volume, loops across pages, pauses when hidden, and stays off until enabled. The profile avatar opens an account menu with sign-in/out and profile settings.
- Light, dark, and system themes; reduced motion; optional victory sounds; data export.
- Desktop sidebar, fixed mobile navigation, reachable add/care actions, keyboard-accessible sheets, and offline PWA assets.
- New offline app versions activate automatically; refresh to load the latest UI without clearing saved progress.
- Clear Buy/Use/Apply controls, animated scene previews, a pet-side Scene shortcut, and labeled New quest buttons. Quick care uses inventory first and buys/uses a snack or toy atomically when the bag is empty.
- Email/password accounts, signup, sign-in/out, email-code UI, and password recovery/reset UI through Neon Auth.
- Immediate theme, companion, care, and quest updates with an ordered background save queue, server validation, rollback, and automatic idempotent retries. Queued commands and cached account progress survive reload; Account settings show a compact save status.

Account progress is saved in Neon. Previously saved guest records remain untouched on the device, but do not open the app or automatically become account progress. Signed-in cached accounts can keep working offline, with changes queued until they reconnect.

Old scarf and crown purchases become Peach beach and Cloud nine backgrounds at no extra cost. Active Starlight clearing purchases move to the background slot. Companion progress and room decor remain intact. Source artwork, prompts, and the packaging script are recorded in [assets/shop/README.md](assets/shop/README.md).

## Neon setup

This checkout is configured for the dedicated **Pocket-Quest** project in AWS Singapore. Numbered migrations in `neon/` cover game progress, chat, and test admin controls. `.neon` records the project context; credentials are in ignored `.env.local`.

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

## Test admin

Provision an account using `npm run db:migrate`, then set `POCKET_QUEST_ADMIN_EMAIL` and `POCKET_QUEST_ADMIN_PASSWORD` in your process environment and run `npm run admin:provision`. The script creates a managed Neon account if needed, verifies its password, and grants a server-owned membership. It never embeds a password in the app or changes an existing password.

After signing in, open **Profile menu → Test controls** (also in Settings → Account). Edit this account's coins, points/XP, companion, energy, and happiness, or tap a mood preset. Changes save to Neon and appear immediately throughout the app. XP determines level. The test panel preserves quests, completions, inventory, settings, and chat histories. Stat limits match the game's 20–100% range.

Only provisioned user IDs can use `/api/admin`; email addresses, client flags, and request target IDs never grant access. Admin edits affect only the signed-in test account, use locked version checks and idempotent saves, and record before/after values. Ordinary game actions cannot modify admin membership. This is a test account, not a user-management console; use a private test environment for shared test credentials.

## Companion chat

Open **Pets → Chat**. Choose any of the six friends in the compact chat header; this does not switch your active pet. Each user has an independent conversation and rolling memory summary with each character. The options menu holds chat details and clear-chat controls. Chat requires an internet connection; saved chats are fetched from Neon and are not cached in browser storage.

Create a key in the [Groq Console](https://console.groq.com/keys) using a Free plan account and add it to ignored `.env.local` (and your deployment's server environment):

```dotenv
GROQ_API_KEY=your-key-here
GROQ_CHAT_MODEL=openai/gpt-oss-20b
CHAT_DAILY_LIMIT=20
```

Restart the development server after changing environment variables. Run `npm run db:migrate` to apply all numbered migrations in order. The optional model setting supports `openai/gpt-oss-20b` and `openai/gpt-oss-120b`, which support the required strict structured output. Personalities and welcome messages live in [shared/chat.js](shared/chat.js).

The default allowance is 20 send attempts per account per day, shared across all characters, resetting at midnight UTC (8 AM in Manila). `CHAT_DAILY_LIMIT` accepts 1–100. Provider failures consume an attempt to limit abuse; completed-message retries reuse the same ID without generating or counting again. There is a six-second cooldown and one active generation per account. A 90-second lease recovers abandoned requests. Failed messages remain in the composer for manual retry; they are not queued offline. Clearing a chat deletes that character's history and memory, invalidates an in-flight reply, and preserves the allowance and other characters' chats.

Only this character's latest six turns, its bounded memory summary, the new message, companion name/mood, and quest counts go to Groq. Quest titles and other characters' histories are excluded. One model call produces both the reply and updated summary. Full successful conversations remain in Neon, with owner-restricted access and pagination. Responses are rendered as plain text, with no AI tools that can mutate game progress. The API key stays on the server; never use a `VITE_` key variable. The panel explains AI data use and handles missing credentials, quota exhaustion, timeouts, and provider failures.

Groq's shared [free-plan limits](https://console.groq.com/docs/rate-limits) still apply independently of the app allowance; the allowance does not guarantee provider capacity or free billing if the provider account is upgraded. See [Groq's data policy](https://console.groq.com/docs/your-data) for retention controls. With no key configured, saved histories remain readable and the composer explains that chat is not connected. Automated tests use simulated provider responses; a real reply needs a configured key.

## Checks

```sh
npm test
npm run test:e2e
npm run build
```

On Windows the browser tests use installed Microsoft Edge. Other platforms use Playwright Chromium; run `npx playwright install chromium` if needed. `PLAYWRIGHT_CHANNEL` can select another installed channel. The browser test runner starts a local server when one is not already running.

Default browser tests use simulated signed-in accounts and authoritative game responses, without writing to Neon. They cover signed-out route gating, sign-in errors, password visibility, both themes, phone sizes, task repetition, rewards, chat, and settings. To opt into the live Neon UI test, set `RUN_CLOUD_E2E=1` before running `npm run test:e2e`. That test creates a QA account at a reserved `.invalid` address. `node scripts/cloud-smoke.mjs` also exercises the real API using a QA account. These tests leave their QA accounts in this development project and do not send email.

To test the installed account PWA offline, build the app, run `npm run preview -- --port 4175`, and set `RUN_PWA_E2E=1` before the browser tests. Visual previews are saved to `docs/previews`.

```sh
npm run format
npm run icons
npm run sprites:pack
```

## Deploy to Vercel

Import this directory as a Vite project. Build with `npm run build` and serve `dist`. Vercel discovers `api/auth.js`, `api/game.js`, and `api/chat.js`; `vercel.json` preserves API requests and handles SPA routes, and allows 60 seconds for the chat function.

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
