# Today: a compact play loop

Today now centers on one quest: choose it, focus or finish, see the reward, then tap into the next quest. The companion remains visible throughout. The other destinations retain their current interfaces.

- **One clear action:** the current quest is the main card, with a large Complete button and a secondary Focus action. Notes and editing open on tap.
- **Tap instead of scroll:** previous/next controls browse the deck; the queue and today's wins show three entries per page in a sheet. The main screen fits 320×568, 390×844, tablet, and desktop viewports without a scrolling quest list.
- **Game feedback:** the three-step treasure trail tracks the existing daily bonus. Completion reveals the actual coins and XP, celebrates bonus rewards and level-ups, and offers an explicit Next quest action. Rewards still follow the existing authoritative game rules.
- **A companion, not a dashboard:** the illustrated world keeps mood, joy, energy, and level progress together. Tap the companion for a greeting or Talk for its existing AI chat. Care and the backpack stay one tap away.
- **Less setup:** focus starts with the current quest selected, while an already-started timer keeps its selected quest and deadline across reloads.
- **Sound and touch:** the speaker control opens independent sound and haptic switches. Sound uses the existing saved preference. Haptics are a device preference, stored per account or guest. Synthetic sounds need no downloaded assets. Unsupported vibration/audio APIs fail silently; reduced motion disables visual effects.
- **Safe cloud behavior:** updates remain immediate and use the existing save queue. A rejected completion removes the reward reveal and restores the quest. Today suppresses duplicate generic success toasts and completion sounds; other pages keep their previous defaults.

Validation covers layout and reachable actions, long names and urgent quests, duplicate taps, daily rewards, final quests, level-ups, timer persistence, feedback toggles, reduced motion, cloud rollback, and existing care, chat, and sync flows. Audio and vibration calls are simulated in automated tests; physical haptic output depends on the user's device and browser.

Previews: [small phone](previews/today-play-small-phone.png), [light](previews/today-play-mobile-light.png), [dark](previews/today-play-mobile-dark.png), [reward](previews/today-play-reward.png), [desktop](previews/today-play-desktop.png).
