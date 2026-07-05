# PaperWorking Brand Assets

> **Source resolution caveat**: Full lockup sources are 225×37 px. Icon sources are 25×23 px. On Retina / HiDPI displays, any rendering size above ~18 px will appear slightly soft. When higher-res exports (2×–4× from the vector source) become available, drop them here under the same filenames and the `<Logo />` component + icon pipeline handle the rest. No code changes required.

This directory contains the canonical source files for the PaperWorking logo, icons, and wordmark. To prevent inconsistency, ensure clean design across light/dark modes, and avoid layout shifts, **never import these PNGs directly in your page/layout components**.

Instead, always use the `<Logo />` component (`@/components/brand/Logo`).

The **only sanctioned exceptions** to direct PNG imports are:
- **Email templates** (`src/lib/emails/templates/BaseLayout.ts`) — can't consume React components; references `${appUrl}/brand/PaperWorking_Black_full_Logo_.png` directly.
- **PDF exports** (`src/components/reporting/`, `src/lib/pdf/`, `src/lib/tax/`, API routes) — jsPDF renders images from paths or base64; uses the same canonical files.

## File Inventory

| Filename | Dimensions | Color | Alpha | Intended Surface |
| :--- | :--- | :--- | :--- | :--- |
| `PaperWorking_Black_full_Logo_.png` | 225×37 | Black | Yes (transparent bg) | Light backgrounds: nav header, light footer, marketing hero |
| `PaperWorking_White_full_Logo_.png` | 225×37 | White | Yes (transparent bg) | Dark backgrounds: auth pages, dark sidebar, dark footer |
| `PaperWorking_Black_Logo_Icon.png` | 25×23 | Black | Yes (transparent bg) | Light backgrounds at narrow breakpoints; light-mode favicon source |
| `PaperWorking_White_Logo_Icon.png` | 25×23 | White | Yes (transparent bg) | Dark backgrounds at narrow breakpoints; dark-mode favicon source |
| `PaperWorking_Logo_Logotype.png` | 199×37 | Black | Yes (transparent bg) | Wordmark-only contexts (no icon glyph) |
| `PaperWorking_White_Logo_Icon_32.png` | 32×32 | White | Yes (transparent bg) | Generated dark-mode favicon (Chromium progressive enhancement) |

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
| `variant` | `'full' \| 'icon' \| 'wordmark'` | `'full'` | Explicit variant override (ignored when surface picks for you). |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | `'auto'` resolves from `useSurface().isOnDark` then `useTheme().theme`. Explicit overrides always win. |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'h-6' \| 'h-8' \| 'h-10' \| 'h-12' \| 'h-16' \| number` | Surface-dependent | Maps to heights: sm=20, md=24, lg=30, xl=40, h-6=24, h-8=32, h-10=40, h-12=48, h-16=64. |
| `href` | `string` | — | Wraps in `<Link>` when provided. |
| `alt` | `string` | `'PaperWorking'` | Screen-reader alt text. |
| `collapsed` | `boolean` | `false` | For `app-sidebar` surface: forces icon-only when sidebar is collapsed. |
| `paired` | `boolean` | `false` | When the icon sits next to visible "PaperWorking" text, sets `alt=""` to avoid double-read. |
| `className` | `string` | `''` | Extra Tailwind classes (margins, positioning). |

### Auto-theme resolution

The `auto` theme (default) resolves like this:
1. Check `useSurface().isOnDark` — if the containing `<Surface>` provider declares a dark background, use white assets.
2. Fall back to `useTheme().theme` — if the app-wide theme is `'dark'`, use white assets.
3. Otherwise use black assets.

This means an OS-dark user on a light marketing page still gets the black logo (correct behavior).

## Icon Pipeline

Re-runnable script: `scripts/generate_favicon.py`

```bash
python3 scripts/generate_favicon.py
```

Generates all favicon and web-app icons from the source PNGs above. The apple-touch-icon is composited onto a solid `#FDFFFC` background (not transparent — iOS fills transparency with black).

**Upscale caveat**: Sources are 25×23 px. Outputs above 32×32 are nearest-neighbor upscales via macOS `sips`. Replace sources with 512×512+ originals and re-run for sharper output.

**Safari pinned-tab mask-icon**: Skipped — requires an SVG source we don't have.

**Dark-mode favicon**: Progressive enhancement via `media="(prefers-color-scheme: dark)"` on the `<link>` tag. Works in Chromium; Safari ignores this, which is expected.
