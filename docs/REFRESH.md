# A friendlier, task-first Pocket Quest

Welcome now has one clear invitation: Get started opens Create account, while Sign in is available for returning users. The form uses a companion greeting, labeled inputs, optional password visibility, and compact recovery/verification states. Guest creation, guest mutation paths, and guest fallbacks are removed. Old device-only saves are left intact, without being treated as a session or mixed into cloud progress.

The shared palette combines warm paper, lilac actions, and mint completion/care accents, with a matching navy dark mode. Task icons and a floating mobile dock make navigation consistent. All main destinations and Settings tabs are reviewed at 320×568, 390×844, 768×900, and 1440×1000 in both themes.

- **Today:** next task first on phones, clear Done action, focus timer, rewards, and companion care below it.
- **Tasks:** due-date ordering, recent ties, readable Today/Overdue labels, counted filters, removable category selection, compact paginated rows, and one-tap daily repetition in the task editor.
- **Pets:** fewer duplicate actions, two quick care controls, readable mood/status, friends, inventory, and AI chat.
- **Shop:** four-item pages (two on short phones), clear costs/ownership, and a task shortcut when a reward needs more coins or a higher level.
- **Stats:** task wins emphasized, consistent milestone icons, clear weekly activity, and no fake bar height for zero completions.
- **Settings/admin/chat:** the same color, icon, card, and touch-control rhythm while preserving sound settings, music, account actions, and server-authorized test controls.

The browser suite uses simulated accounts instead of guest shortcuts. It exercises the real client save queue and shared server rules, including uncertain saves, rollback, multi-tab changes, identity changes, and offline cached accounts. Production PWA checks cover offline progress and service-worker updates without losing drafts. API credentials remain server-only.

Representative reviewed screenshots are in `docs/previews/refresh-*`, alongside welcome/login phone previews and the existing scenario screenshots.

Validation: 27 unit/database checks passed. All 41 default browser checks passed across the regression run and focused reruns; two opt-in production PWA checks also passed. A real Neon admin login verified sign-in, Tasks, authorized test controls, and sign-out without modifying game values. Production build and whitespace checks passed. Phone keyboard behavior is simulated in the browser suite; physical haptic output depends on the device.
