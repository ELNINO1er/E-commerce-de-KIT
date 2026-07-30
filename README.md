# KIC — Landing page

Static landing page for **KIC — Cacao Authentique & Transformation Locale**, implemented from the
Claude Design project [Landing page KIC](https://claude.ai/design/p/aae5fa10-006a-4eb0-9947-7ade49463696)
(source file: `KIC Landing Page.dc.html`).

Like `SCMC-03/`, this is plain HTML/CSS/JS with no build step. Open `index.html`, or serve the
folder over WAMP at `http://localhost/e-commerce/kic/`.

```
kic/
├── index.html                 all sections, semantic markup
├── css/kic.css                design tokens + every section style
├── js/kic.js                  image-slot fallback, mobile nav, scrollspy, newsletter
├── img/                       photography (see the slot map below)
└── prompts-images-KIC.md      generation prompts shipped with the design
```

## What changed coming out of the design canvas

The `.dc.html` source is a design-canvas document — it depends on `support.js` (the DC runtime) and
`image-slot.js` (the placeholder web component), neither of which belongs in production. Each
canvas-only construct has a real equivalent here:

| Design source | Implementation |
| --- | --- |
| `<x-dc>` + `<script type="text/x-dc">` | plain HTML; the `renderVals()` defaults are baked in |
| `{{ heroTitle }}` (default `CACAO PUR`) | the `<h1>` text, uppercased via CSS so the markup stays readable |
| `<sc-if value="{{ showDecor }}">` | `.kic-decor` elements — delete the block to drop the floating shapes |
| `<sc-if value="{{ showAnnouncementBar }}">` | `.kic-announce` — delete the element to drop the bar |
| `style-hover="…"` | real `:hover` **and** `:focus-visible` rules in `kic.css` |
| `<image-slot placeholder="…">` | `<figure class="kic-media" data-label="…">` + `<img>` |
| `<helmet data-dc-atomics>` | the real `<head>` (fonts, `<style>` → `css/kic.css`) |

Everything beyond that is faithful to the source: the same palette, the same Montserrat /
Plus Jakarta Sans pairing, the same spacing, gradients, `clamp()` type scale and blob geometry.

Added on top, because a shipped page needs them and a canvas mock doesn't: responsive breakpoints
(the source is authored desktop-width only), a mobile burger menu, focus states, a skip link,
`prefers-reduced-motion` and `print` handling, and page metadata.

## Images

All eight slots are empty in the design project, so the `<img>` elements point at files that do not
exist yet. That is deliberate and safe: `js/kic.js` flags any figure whose image fails to load with
`.is-empty`, which reveals a branded placeholder carrying the slot's French caption instead of a
broken-image icon. **Drop the real file at the path below and it takes over — no code change.**

| Slot in the design | Expected file | Subject |
| --- | --- | --- |
| `kic-hero-product` | `img/kic-hero-product.png` | Pot de beurre de cacao en lévitation (PNG détouré) |
| `kic-about-splash` | `img/kic-about-splash.png` | Éclats de cabosses & fèves en lévitation (détouré) |
| `kic-cat-beurre` | `img/kic-cat-beurre.jpg` | Pot de beurre de cacao + splash crémeux |
| `kic-cat-poudre` | `img/kic-cat-poudre.jpg` | Bol de poudre de cacao + nuage de poudre |
| `kic-cat-pate` | `img/kic-cat-pate.jpg` | Carrés de chocolat artisanal + coulée fondante |
| `kic-cat-feves` | `img/kic-cat-feves.jpg` | Bol de fèves torréfiées croustillantes |
| `kic-news-bg` | `img/kic-news-bg.jpg` | Texture cacao / pralines |
| `kic-footer-wave` | `img/kic-footer-wave.jpg` | Vague de cacao liquide & lait (bannière large) |

The two hero/about slots want a **transparent PNG** — they render with `object-fit: contain` and a
`drop-shadow()`, so a rectangular photo would show its edges. The rest are `object-fit: cover`
behind a gradient veil, so ordinary JPEGs are fine.

`prompts-images-KIC.md` holds the generation prompts that ship with the design project.
`SCMC-03/img/` already has usable cacao photography (`beurre de cacao01.png`,
`poudre de cacao01.png`, `masse de cacao02.png`) if you want to fill slots before the shoot.

## Not wired up

The page is presentational only — it is not connected to the Spring Boot API yet:

- the **cart** count (`Panier · 2`) is static markup;
- the **newsletter** form validates and confirms locally (`js/kic.js` §4); point its `fetch()` at the
  subscription route once the backend exposes one;
- the **search** and **account** buttons anchor to sections rather than to real pages;
- the **product** buttons all link back to `#produits`.
