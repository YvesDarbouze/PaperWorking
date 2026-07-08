# PaperWorking Brand Assets

This directory contains the canonical **vector** source files for the PaperWorking logo and icon mark: `icon.svg` and `logotype.svg`. Both use `fill="currentColor"` — one file per shape, themed via CSS `color`, not separate black/white file pairs.

**Never import these SVGs directly as `<img src>` or `next/image`** — `currentColor` only resolves against page CSS when the SVG is inlined in the DOM. Always use the `<Logo />` component (`@/components/brand/Logo`), which renders the inline React components at `src/components/brand/icons/PaperWorkingIcon.tsx` and `PaperWorkingLogotype.tsx`.

**Keeping the sources in sync**: `icon.svg` / `logotype.svg` here and the path data inlined in the two React components under `src/components/brand/icons/` must stay identical — there's no build step wiring them together. If the mark ever changes, update all three.

The **only sanctioned exceptions** to the inline-component rule are contexts that can't render inline SVG at all:
- **Email templates** (`src/lib/emails/templates/BaseLayout.ts`) — poor/no SVG support across email clients; references `${appUrl}/brand/PaperWorking_Black_full_Logo_.png` directly.
- **PDF exports** (`src/components/reporting/`, `src/lib/pdf/`, `src/lib/tax/`, API routes) — `jsPDF.addImage()` requires a raster image, not SVG.

Both exceptions consume raster PNGs regenerated from the vector source (see Icon Pipeline below) — real downscales at high resolution, not upscales of a tiny original.

## File Inventory

| Filename | Type | Color | Intended Surface |
| :--- | :--- | :--- | :--- |
| `icon.svg` | Vector, `currentColor` | Theme-driven | Canonical icon source — mobile/narrow breakpoints, favicons, PWA icons |
| `logotype.svg` | Vector, `currentColor` | Theme-driven | Canonical full lockup (icon + wordmark) source — nav, footer, auth, general use |
| `PaperWorking_Black_full_Logo_.png` | Raster, 1868×240 | Black | Email templates, PDF exports (light backgrounds) |
| `PaperWorking_White_full_Logo_.png` | Raster, 1868×240 | White | PDF exports on dark backgrounds |
| `PaperWorking_White_Logo_Icon_32.png` | Raster, 32×32 | White | Dark-mode favicon (`prefers-color-scheme: dark`, Chromium progressive enhancement) |

## Canonical Rendering Component

```tsx
import Logo from '@/components/brand/Logo';

// Surface-aware (recommended — the component picks variant, theme, and breakpoint behavior):
<Logo surface="marketing-nav" href="/" />
<Logo surface="app-sidebar" href="/dashboard/command-center" />
<Logo surface="auth" href="/" />

// Manual override:
<Logo variant="full" theme="dark" size="lg" href="/" />
<Logo variant="icon" theme="light" size="sm" />
```

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `surface` | `'marketing-nav' \| 'marketing-footer' \| 'app-sidebar' \| 'app-topbar' \| 'auth' \| 'empty-state' \| 'loading' \| 'email' \| 'pdf' \| 'custom'` | `'custom'` | Layout context — drives automatic variant, theme, and responsive behavior. |
| `variant` | `'full' \| 'icon'` | `'full'` | Explicit variant override (ignored when surface picks for you). There is no separate text-only "wordmark" asset — `logotype.svg` is the icon+wordmark combined. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | `'auto'` resolves from `useSurface().isOnDark` then `useTheme().theme`. Explicit overrides always win. |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'h-6' \| 'h-8' \| 'h-10' \| 'h-12' \| 'h-16' \| number` | Surface-dependent | Maps to heights: sm=20, md=24, lg=30, xl=40, h-6=24, h-8=32, h-10=40, h-12=48, h-16=64. |
| `href` | `string` | — | Wraps in `<Link>` when provided. |
| `alt` | `string` | `'PaperWorking'` | Screen-reader alt text (set on the SVG via `role="img"`/`aria-label`). |
| `collapsed` | `boolean` | `false` | For `app-sidebar` surface: forces icon-only when sidebar is collapsed. |
| `paired` | `boolean` | `false` | When the icon sits next to visible "PaperWorking" text, marks the icon `aria-hidden` to avoid double-read. |
| `className` | `string` | `''` | Extra Tailwind classes (margins, positioning). |

### Auto-theme resolution

The `auto` theme (default) resolves like this:
1. Check `useSurface().isOnDark` — if the containing `<Surface>` provider declares a dark background, use white (`color: #fff`).
2. Fall back to `useTheme().theme` — if the app-wide theme is `'dark'`, use white.
3. Otherwise use black (`color: #000`).

This means an OS-dark user on a light marketing page still gets the black logo (correct behavior).

## Icon Pipeline

Re-runnable script: `scripts/generate-brand-assets.mjs` (Node + `sharp`, renders directly from `icon.svg`/`logotype.svg` — no more `sips` upscaling of a tiny raster source).

```bash
node scripts/generate-brand-assets.mjs
```

Regenerates, from the vector source:
- `favicon.ico` (16/32/48 multi-res), `icon-16.png`, `icon-32.png`, `icon.png` (1024×1024, Next.js icon convention) — black, transparent — in both `public/` and `src/app/`.
- `apple-touch-icon.png` (180×180) — black, composited onto a solid `#FDFFFC` background at 72% scale (iOS fills transparency with black and applies its own corner mask, so opaque background + headroom is required).
- `PaperWorking_White_Logo_Icon_32.png` — white, transparent, for the dark-mode favicon `<link>`.
- `public/icon-192.png` / `public/icon-512.png` — a **separate context** from the favicon family: these back the PWA manifest (`src/app/manifest.ts`), whose `background_color`/`theme_color` is dark (`#121014`) and which declares `purpose: 'maskable'`. These are rendered **white**, composited onto solid `#121014`, with the glyph confined to a 76% safe zone so Android's mask never clips it. Don't regenerate these the same way as the favicon family — they need to read against a dark background, not a transparent one.
- `PaperWorking_Black_full_Logo_.png` / `PaperWorking_White_full_Logo_.png` — the email/PDF raster exceptions, at 1868×240 (generous headroom over their ~32px display size).

**Safari pinned-tab mask-icon**: still skipped — no dedicated single-color mask-icon SVG variant exists yet; would need a shape-only outline distinct from the filled glyph.

**Dark-mode favicon**: progressive enhancement via `media="(prefers-color-scheme: dark)"` on the `<link>` tag in `src/app/layout.tsx`. Works in Chromium; Safari ignores this, which is expected.
