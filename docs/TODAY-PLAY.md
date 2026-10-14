# Today: a compact play loop

Today centers on one task: choose it, focus or finish, see the reward, then tap into the next task. The task comes first on phones, with the companion below it. The full app shares the [refreshed visual system](REFRESH.md).

- **One clear action:** the current quest is the main card, with a large Complete button and a secondary Focus action. Notes and editing open on tap.
- **Tap instead of scroll:** previous/next controls browse the deck; the queue and today's wins show three entries per page in a sheet. The main screen fits 320×568, 390×844, tablet, and desktop viewports without a scrolling quest list.
- **Game feedback:** the three-step treasure trail tracks the existing daily bonus. Completion reveals the actual coins and XP, celebrates bonus rewards and level-ups, and offers an explicit Next quest action. Rewards still follow the existing authoritative game rules.
- **A companion, not a dashboard:** the illustrated world keeps mood, joy, energy, and level progress together. Tap the companion for a greeting or Talk for its existing AI chat. Care and the backpack stay one tap away.
- **Less setup:** focus starts with the current quest selected, while an already-started timer keeps its selected quest and deadline across reloads.
- **Sound and touch:** controls live in **Settings → Sounds**, including sound effects, haptics, and optional background music. Effects use the existing saved preference. Music and haptics are device preferences stored per account, preserving the original haptic choice. Today keeps its feedback without an extra settings button. Unsupported vibration/audio APIs fail silently; reduced motion disables visual effects.
- **Safe cloud behavior:** updates remain immediate and use the existing save queue. A rejected completion removes the reward reveal and restores the quest. Today suppresses duplicate generic success toasts and completion sounds; other pages keep their previous defaults.

Validation covers layout and reachable actions, long names and urgent quests, duplicate taps, daily rewards, final quests, level-ups, timer persistence, feedback toggles, reduced motion, cloud rollback, and existing care, chat, and sync flows. Audio and vibration calls are simulated in automated tests; physical haptic output depends on the user's device and browser.

Previews: [small phone](previews/today-play-small-phone.png), [light](previews/today-play-mobile-light.png), [dark](previews/today-play-mobile-dark.png), [reward](previews/today-play-reward.png), [desktop](previews/today-play-desktop.png).
