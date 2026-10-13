# Scenes and collectibles

Four opaque background illustrations and two transparent six-item atlases were generated with the built-in ImageGen tool. Exact prompts are in `prompts.json` and `items-more-prompt.json`; originals are retained in `source/`. Artwork is packaged locally with Sharp; no generation API is needed to build or run the app.

Run `npm run shop:pack` to reproduce runtime WebP assets:

- `public/backgrounds/{daydream,sunset,cloud,night}.webp`: 960-pixel-wide landscapes.
- `public/items/{berry,tea,ball,book,plant,lamp}.webp`: 240-pixel transparent collectibles, extracted in reading order from a 3-column, 2-row atlas.
- `public/items/{salmon,pancakes,smoothie,mouse,cushion,nightlight}.webp`: six more 240-pixel collectibles, extracted from `items-more.png`.

The cottage is editable SVG in `src/components/PixelArt.jsx`. Character sprite sheets are unchanged by this update. All runtime assets are included in the PWA cache.

Dream garden is free. Peach beach costs 80 coins at level 1, Cloud nine costs 160 at level 4, and Starlight clearing costs 240 at level 5. Purchases apply immediately, remain owned after changing scenes, and can be applied again without spending coins.
