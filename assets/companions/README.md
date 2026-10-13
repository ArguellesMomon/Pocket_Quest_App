# Pocket Quest companions

Created October 13, 2026. The user's `samo.zip` supplies the visual reference, not instructions. Its metadata describes Samo as a white Samoyed. The supplied JSON contains no animation map.

## Assets

| Companion              | Runtime file                        | Source                                   | Grid                              |
| ---------------------- | ----------------------------------- | ---------------------------------------- | --------------------------------- |
| Mochi, cream cat       | `public/companions/mochi.webp`      | `assets/companions/source/mochi.png`     | 4 columns × 6 rows                |
| Nori, charcoal cat     | `public/companions/nori.webp`       | `assets/companions/source/nori.png`      | 4 × 6                             |
| Pip, corgi             | `public/companions/pip.webp`        | `assets/companions/source/pip.png`       | 4 × 6                             |
| Maple, spaniel         | `public/companions/maple.webp`      | `assets/companions/source/maple.png`     | 4 × 6                             |
| Finn, supplied Samoyed | `public/companions/samo.webp`       | `assets/reference/samo/spritesheet.webp` | 8 × 9, original 192 × 208 cells   |
| Chami, fluffy calico   | `public/companions/chami.webp`      | `assets/companions/source/chami.png`     | 4 × 6, generated mood poses       |
| Chami, original idle   | `public/companions/chami-idle.webp` | `assets/reference/chami/spritesheet.png` | 4 × 2, supplied blink/tail frames |

The four new characters were generated separately with the built-in **image_gen** tool and transparent backgrounds. [prompts.json](prompts.json) records the final prompt set and reference roles. No API key, fallback CLI, recolored dog substitutes, or remote runtime generation is used.

The source PNGs and supplied reference are preserved. `scripts/pack-sprites.mjs` finds 24 connected character silhouettes per generated sheet, adds padding, preserves a consistent scale and baseline, and packs 192 × 192 RGBA frames into lossless WebP atlases. This avoids cutting off ears and paws at imperfect generated grid boundaries. [atlas-manifest.json](atlas-manifest.json) records the source bounds. This is deterministic frame packaging, not artistic alteration.

Finn's sheet is copied byte-for-byte and retains the compatibility ID `samo`. Its original fringe pixels remain. Only occupied source cells are selected by the runtime map. The default saved name Samo upgrades to Finn; custom names remain intact. Metadata does not establish the source's authorship or distribution license.

Chami's original PNG and WebP were supplied from the user's Intern-app folder and copied into this project unchanged. The PNG's eight frames are packaged into a padded idle/blink/tail atlas. [chami-prompt.json](chami-prompt.json) records the additional reference-guided generation: 24 happy, sleepy, playful, hungry, lonely, and eating poses. Generated rows 0–5 use those moods in that order. Curious/idle states use the supplied sheet; play and celebration use the playful row. All source files remain available and no external app files were modified.

## Moods and playback

`shared/companions.js` defines mood selection and frame maps. New characters use these rows:

| Row | Art                         |
| --- | --------------------------- |
| 0   | Idle, blink, head tilt      |
| 1   | Happy, smile, tail movement |
| 2   | Curled up, sleepy breathing |
| 3   | Playful, paw wave, hop      |
| 4   | Hungry / tired              |
| 5   | Lonely / wants company      |

Actual care and quest actions record a server-authored timestamp: feeding shows an eating response, play shows playful poses, and completed quests trigger celebration. After 6.5 seconds, the companion returns to its underlying mood. Energy ≤35 selects sleepy, energy ≤55 selects hungry, joy ≤45 selects lonely, and high joy/energy selects happy. Tapping the companion shows a curious greeting for five seconds. A written mood label stays visible independently of motion.

`SpritePet.jsx` changes frames discretely, pauses offscreen and hidden-tab playback, and respects device reduced motion and the app's animation switch. Reduced motion keeps the relevant mood's first frame. There are no clothing overlays.

The six selectable cats and dogs share the adventure's progress; switching friends preserves coins, XP, equipment, inventory, and stats. Existing fox and rabbit saves retain local SVG art.

All seven runtime sheets are precached for offline play.
