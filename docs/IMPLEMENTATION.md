# Pocket Quest implementation

## Design direction

Pocket Quest turns the former Pixel Idle To-Do skeleton into a cozy quest game. Lilac, peach, sunny yellow, sky blue, and small pixel accents define the interface; dark mode uses a plum twilight palette. Space Grotesk headings and DM Sans body text keep task content clear; Silkscreen appears only in short game labels. All fonts are bundled locally.

This differs from Daymargin's restrained notebook identity, yellow/red accents, general organizer, and conversational dog. Pocket Quest centers on earned coins, companion care, collectible items, habitat customization, and progression. Its welcome screen starts with companion selection and a playable guest adventure rather than a marketing page.

## Destinations

- **Today:** a compact companion scene, quick Feed/Play/Focus/Bag controls, daily progress, and two to four upcoming quests.
- **Quests:** one-time tasks and daily rituals, categories, search, filtering, sorting, editing, due dates, and suggestions.
- **Pets** (`/habitat`): animated companions with stat-driven moods, Backpack/Friends tabs, and six selectable cats/dogs, including Chami and Finn.
- **Shop** (`/market`): sixteen items grouped into Care/Room/Scenes, four-card pages, larger illustrated cards, explicit Buy/Use/Apply actions, level gates, and optional item detail sheets with live pet previews for backgrounds. `?tab=backgrounds` opens Scenes directly from the pet-side shortcut.
- **Stats** (`/journey`): compact weekly activity and summary counts, Badges/Activity tabs, and growth progress.
- **Settings:** theme, sound, motion, daily goal, companion identity, timezone, export, and account access.

Desktop uses a persistent sidebar. Mobile uses fixed bottom navigation, reachable add/care buttons, and a topbar Settings shortcut. Main pages fit a phone viewport; long quest/activity lists paginate, item groups are separated into tabs, and secondary forms use native modal sheets. Settings is split into Appearance/Profile/Account tabs. Device reduced motion and the app's animation switch stop motion without hiding the current mood.

The original Samoyed WebP is used unchanged and displayed as Finn. Mochi, Nori, Pip, and Maple use generated 24-frame atlases. Chami combines her eight supplied blink/tail frames with 24 new mood poses guided by that reference. See [the character asset record](../assets/companions/README.md) for prompts, saved files, and frame maps. Existing fox/rabbit saves retain their SVG artwork. Selecting a friend preserves XP, coins, stats, inventory, and equipment.

## Game rules

The authoritative reducer is `shared/game.js`. Both guest mode and server requests use it. Quest effort determines rewards: 10/20/35 coins and 15/30/50 XP. Every 150 XP raises the companion level. The third completed quest per calendar day earns 20 bonus coins and 25 XP, once per day. Personal daily goals do not change this bonus threshold.

One-time quests remain completed. Daily rituals can be completed once on each local calendar day in the configured timezone. Completing a quest already rewarded is rejected. Deleting a quest preserves historical rewards and stats. Completed one-time quests cannot be edited into recurring reward sources.

Food and toys are consumed from inventory. Decor, cottages, and backgrounds are permanent purchases and can be applied or removed. Backgrounds use their own slot so changing scenery preserves room decoration. The free Dream garden can always be restored. Clothing overlays have been removed. `upgradeGame` converts old scarf/crown ownership to equally priced Peach beach/Cloud nine backgrounds on both guest and cloud reads and writes; equipped Starlight clearing moves to the background slot. This upgrade is idempotent and preserves coins, XP, tasks, and care. Idle energy and joy decay are bounded to a 24-hour catch-up and never go below 20. There is no pet death, real-money economy, or notification placeholder.

Quick care uses an existing item first. If its stock is empty, the server checks the actual cost, buys and applies it in the same transaction. Permanent shop purchases can equip immediately. Care and quest completion record a reaction timestamp that drives feeding, play, and celebration poses, then returns to the pet's current energy/joy mood.

The focus timer stores its deadline and selected task on this device. It persists through navigation and reload, supports pause/resume, and offers explicit quest completion at the end. Elapsed time alone does not earn rewards.

## Persistence and authorization

Guest progress is stored in browser localStorage. Web Locks serialize guest mutations across tabs when the browser supports them; storage events refresh other guest tabs. Clearing browser storage removes guest progress. Guest and cloud adventures are separate, as stated in the product.

Cloud accounts use managed Neon Auth through a same-origin proxy. The server verifies the JWT signature, issuer, audience, expiry, role, and live user status. The database connection is never in the browser bundle. The request transaction switches to a restricted database role, sets its owner context, and uses row-level security.

The schema stores one versioned JSONB game per account plus an operation ledger. Each mutation locks the owner's game row, derives its effects on the server, and writes state and operation ID in the same transaction. Repeating the same operation ID returns current state without awarding or spending twice. Unknown network outcomes retain the operation ID in sessionStorage and retry automatically with backoff from one to thirty seconds. Online/focus events resume retries, and reload restores unfinished requests. The confirmation banner is removed; Account settings retain a small save status and manual retry button. Definite server rejections still surface once; transient failures remain quiet. The client never supplies its balance, prices, XP, completion timestamp, or reward amount.

The installed Neon SDK's token cache can return session data for `token()`. The app obtains JWTs directly from the documented same-origin `/api/auth/token` endpoint with no-store, following the working Daymargin pattern. Sign-in and other identity calls retain the managed SDK.

## Migration decision

The user selected **Start fresh on Neon** on October 13, 2026. The Supabase client, placeholder-email username workaround, legacy feature stubs, and old schema were removed from the app. No Supabase users or progress were imported, and no Supabase cloud project was deleted.

The dedicated Neon project is `Pocket-Quest` (`morning-thunder-40770002`), AWS Singapore, with managed Auth enabled. The checkout-local `.neon` records its main branch. Credentials live only in ignored `.env.local`; `.env.example` lists the required names.

## Verification and limits

- Fifteen domain/database/sync tests cover rewards, timezone reset, purchases, new collectibles, care, moods, frame bounds, companion switching, Finn rename, equipment, legacy clothing conversion, background ownership/reset, retry policy, owner isolation, idempotent care retries, and rollback.
- Guest browser tests cover direct purchases/equipment, care, friend switching, settings, focus sheets, search, pagination, modal dismissal, no page overflow, and fixed navigation at 320×568, 390×844, 768×900, and 1440×1000.
- Visual snapshots cover welcome, Today in both themes, Habitat, Market, Journey, background cards, scene previews, and a purchased Peach beach. Shop categories fit without list scrolling at 320×568 and 390×844.
- Low-stat browser fixtures verify the actual sleepy, lonely, hungry, and happy atlas rows; scene captures are saved beside the phone previews.
- The production PWA test verifies a guest adventure can reload, complete a quest, and retain its theme and rewards while fully offline. Fonts and artwork are included in the offline cache.
- The live cloud browser test simulates committed care with a lost response, verifies the banner stays hidden, reloads, lets background retry finish, and verifies the same operation ID is reused and inventory is consumed once.
- Opt-in live cloud tests exercise email signup/sign-in/sign-out, JWT validation, session restoration, atomic reward sync, and rejected unauthorized requests using reserved `.invalid` QA email addresses. QA accounts remain in this development project; these tests do not send email.
- Password recovery and email-code interfaces are implemented, but actual inbox delivery has not been tested. Configure a production mail provider and verify delivery before a public account launch. See [Neon's production checklist](https://neon.com/docs/auth/production-checklist).
- Vercel API functions and rewrites are prepared. The app has not been deployed to a public URL during this local redesign.

No third-party analytics, AI calls, subscriptions, or messaging integrations were added.
