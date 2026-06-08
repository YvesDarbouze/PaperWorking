# Site DNA — Google Antigravity (https://antigravity.google/)

AUDIT_MODE: high-fidelity
SESSION: 2026-06-06
NOTE: URL renders JS-gated shell (title only). DNA synthesized from: page context + Google Material You design system + Antigravity system patterns referenced in AGENTS.md.

---

## DESIGN TOKENS

### Color Palette

| Token | Light | Dark | Role |
|---|---|---|---|
| `--surface` | `#FDFFFC` | `#121014` | Page bg |
| `--surface-container` | `#F3F6F3` | `#1E1B20` | Card/panel bg |
| `--on-surface` | `#0d0a0b` | `#FDFFFC` | Body text |
| `--on-surface-variant` | `#454955` | `#9E9DA0` | Secondary text |
| `--primary` | `#454955` | `#6E7480` | Brand / interactive |
| `--primary-container` | `rgba(69,73,85,0.10)` | `rgba(110,116,128,0.14)` | Active nav bg |
| `--outline-variant` | `rgba(69,73,85,0.12)` | `rgba(253,255,252,0.07)` | Dividers/borders |

### Typography

⚑ DRAMA NOTES: The logotype juxtaposes `"Paper"` (weight 700) with `"Working"` (weight 100) in the SAME Inter typeface at the same size with zero visual gap between words. This 600-unit weight delta across two joined words IS the brand drama. Never add a space, never equalize weights.

| Level | Size | Weight | Letter-spacing |
|---|---|---|---|
| Nav label | 13px | 600 → active | +0.01em |
| Section cap | 10px | 700 | +0.1em uppercase |
| Body | 14px | 400 | 0 |
| Logotype | fluid | 700 + 100 | -0.02em |

### Spacing
Base unit: 4px. Scale: 4/8/12/16/24/32/48px.

### Sidebar Dimensions
Width: 240px | Nav item height: 44px | Radius: 8px | Padding: px-3

---

## COMPONENT BLUEPRINTS

### Sidebar — Nav Items

```
INACTIVE:  bg transparent | text --on-surface-variant | icon FILL=0
HOVER:     bg rgba(0,0,0,0.05) light / rgba(255,255,255,0.05) dark
ACTIVE:    bg --primary-container | text --primary | icon FILL=1 | left-border 3px --primary
TRANSITION: all 200ms ease
```

### Logo

```
SVG icon: fill="currentColor" → auto-adapts light/dark
Logotype: Inter | "Paper" fw-700 + "Working" fw-100 | -0.02em tracking
```

### Theme Toggle

```
Position: sidebar bottom, above workspace switcher
Pattern: icon button (sun/moon) | 200ms transition
Persistence: localStorage "pw-theme" | data-theme on <html>
```

---

## MOTION PHILOSOPHY

Functional, fast, zero decoration. 150–250ms transitions, ease-out entrances. The only delight: Material Symbol FILL axis animating 0→1 on nav activation (icon fills in with color change). Everything else is infrastructure.

---

## TECHNICAL STACK

Next.js 16 App Router | Tailwind CSS v4 | CSS custom properties | Inter via next/font | Material Symbols Outlined (variable font) | Firebase Auth | data-theme on html root

---
*DNA compiled 2026-06-06 — build against this document.*

## 1.1 — PAGE ARCHITECTURE

Total viewport sections: 8
Section-identification strategy used: top-level divs and custom Angular tags under main wrapper

```
╔══════════════════════════════════════════════════════╗
║  SECTION 1: Welcome Section           HEIGHT: 100svh ║
║  BG: Particle Canvas background / video overlay      ║
║  LAYOUT: Centered stack container                    ║
╠══════════════════════════════════════════════════════╣
║  SECTION 2: YouTube Video Section     HEIGHT: auto   ║
║  BG: dark overlay (--palette-grey-1200)              ║
║  LAYOUT: Max-width 1728px with container gutters     ║
╠══════════════════════════════════════════════════════╣
║  SECTION 3: Agent First Section       HEIGHT: auto   ║
║  BG: solid light/dark container                      ║
║  LAYOUT: Constrained centered column                 ║
╠══════════════════════════════════════════════════════╣
║  SECTION 4: Feature Explorer          HEIGHT: auto   ║
║  BG: Solid surface container                         ║
║  LAYOUT: 12-column grid system                       ║
╠══════════════════════════════════════════════════════╣
║  SECTION 5: Use Cases Morphing        HEIGHT: 100vh  ║
║  BG: WebGL morphing particle canvas background       ║
║  LAYOUT: Split screen navigation & details columns   ║
╠══════════════════════════════════════════════════════╣
║  SECTION 6: Try Solutions             HEIGHT: auto   ║
║  BG: surface container high                          ║
║  LAYOUT: Grid layout card list                       ║
╠══════════════════════════════════════════════════════╣
║  SECTION 7: Latest Blogs              HEIGHT: auto   ║
║  BG: surface container highest                       ║
║  LAYOUT: Slider/Carousel display                     ║
╠══════════════════════════════════════════════════════╣
║  SECTION 8: Download Section          HEIGHT: auto   ║
║  BG: Split gradient/overlay container                ║
║  LAYOUT: Centered compact buttons                    ║
╚══════════════════════════════════════════════════════╝
```

OVERLAPPING sections: none. Grid layout boundaries are clean and separated by standard gutters and margins.

---

## 1.2 — DESIGN TOKENS

```
PALETTE:
  --palette-grey-0:          #FFFFFF       → Light background, primary surface
  --palette-grey-10:         #F8F9FC       → Light surface container
  --palette-grey-15:         #F0F1F5       → Hover states secondary buttons
  --palette-grey-20:         #EFF2F7       → Light surface container high
  --palette-grey-50:         #E6EAF0       → Light surface container higher
  --palette-grey-100:        #E1E6EC       → Light surface container highest
  --palette-grey-200:        #CDD4DC       → Borders and dividers
  --palette-grey-300:        #B2BBC5       → Inactive labels / icons
  --palette-grey-400:        #B7BFD9       → Subheadings and secondary items
  --palette-grey-600:        #AAB1CC4D     → Secondary overlay shadows
  --palette-grey-800:        #45474D       → Body text primary light mode / variant text dark mode
  --palette-grey-900:        #2F3034       → Primary hover states dark mode / active states
  --palette-grey-1000:       #212226       → Main headings dark mode / header overlays
  --palette-grey-1100:       #18191D       → Surface container dark mode
  --palette-grey-1200:       #121317       → Dark background / body text primary dark mode
  --palette-blue-600:        #3279F9       → Active highlight accent blue

TYPOGRAPHY SCALE:
  Role       | Font Family              | Weight | Size          | Tracking    | Line-Height | Style
  ──────────────────────────────────────────────────────────────────────────────────────────
  Display    | Google Sans Flex         | 450    | 148px / 9.25rem| -2.96px     | 1.0         | oblique
  Heading 1  | Google Sans Flex         | 450    | 124px / 7.75rem| -2.48px     | 1.0         | normal
  Heading 2  | Google Sans Flex         | 450    | 98px / 6.12rem | -1.8px      | 0.82        | normal
  Heading 3  | Google Sans Flex         | 450    | 72px / 4.5rem  | -1.44px     | 1.0         | normal
  Heading 4  | Google Sans Flex         | 450    | 54px / 3.375rem| -.95px      | 1.04        | normal
  Heading 5  | Google Sans Flex         | 450    | 42px / 2.625rem| -.73px      | 1.04        | normal
  Heading 6  | Google Sans Flex         | 450    | 32px / 2.0rem  | -.15px      | 1.06        | normal
  Body       | Google Sans Flex         | 400    | 17.5px         | .18px       | 1.45        | normal
  Caption    | Google Sans Flex         | 400    | 14.5px         | .16px       | 1.45        | normal
  Label      | Google Sans Flex         | 450    | 12.5px         | .11px       | 1.2         | normal
  Mono/Data  | Courier New / monospace  | 400    | 15.5px         | .11px       | 1.2         | normal
  ⚑ DRAMA NOTES: The extreme typographic sizing contrast (148px heading vs 17.5px body) coupled with font-variation axes ("wdth" 100, "opsz" 144, oblique slant) creates a dramatic editorial style. Preserve the extreme font scale ratios.

SPACING GRID: Base unit = 4px. Scale: 0px, 4px, 8px, 16px, 24px, 36px, 48px, 60px, 80px, 88px, 120px, 180px.
BORDER RADIUS: xs: 4px — used on custom cursor / tiny components
               sm: 8px — used on small buttons / chips
               md: 16px — used on standard container cards / iframe embeds
               lg: 24px — used on large cards
               xl: 36px — used on grid image container panels
               rounded: 9999px — used on pills / circular components
SHADOW SYSTEM: default: none (flat grid-based aesthetic)
               overlay: 0px 8px 24px rgba(33, 34, 38, 0.12)
TEXTURE: none (relies on sharp vector particles and vector typography).
```

---

## 1.3 — SECTION BLUEPRINTS

### SECTION 1: WELCOME HERO
Height: 100svh | BG: Particle Canvas + Background Video | Padding: top 24px / sides 72px
Content max-width: 1728px

**INTERNAL ASCII WIREFRAME:**
```
┌─────────────────────────────────────────────────────┐
│                      NAV BAR                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│                    [ LOGO MARK ]                    │
│                                                     │
│                [ TYPED HERO HEADER ]                │
│                                                     │
│             [ CTA 1 ]        [ CTA 2 ]              │
│                                                     │
└─────────────────────────────────────────────────────┘
Layout system: Flexbox column (centered vertical stack)
Gap: var(--space-xl) (36px)
```

**TYPOGRAPHY + CONTENT MAP:**
```
  [antigravity-logo]  → "Google Antigravity" Logo Mark | Style: Label | Color: --theme-surface-on-surface
  [typed-header]      → "Experience liftoff with the next-gen agent platform" | Style: Display | Color: --theme-surface-on-surface
  [app-button 1]      → "Download" | Style: Label | BG: --theme-button-states-primary-enabled | Type: primary
  [app-button 2]      → "Explore use cases" | Style: Label | BG: transparent | Type: secondary
```

---

### SECTION 5: USE CASES MORPHING
Height: 100vh | BG: WebGL Morphing Particle Canvas | Padding: top 0 / sides 24px
Content max-width: full-bleed

**INTERNAL ASCII WIREFRAME:**
```
┌─────────────────────────────────────────────────────┐
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  SIDEBAR CHIPS   │  │  CONTENT DETAILS       │  │
│  │  [~25% width]     │  │  [~75% width]          │  │
│  │                  │  │                        │  │
│  │  * Enterprise    │  │  [ TYPED HEADER ]      │  │
│  │  * Frontend      │  │  [ Description body ]  │  │
│  │  * Fullstack     │  │  [ CTA Button ]        │  │
│  │  * Science       │  │                        │  │
│  │  * Marketer      │  │                        │  │
│  │  └──────────────────┘  └────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
Layout system: CSS Grid: 1fr 3fr
Gap: var(--grid-gutter) (64px)
```

**TYPOGRAPHY + CONTENT MAP:**
```
  [sidebar nav-items] → "Enterprise, Frontend, Fullstack, Science, Marketer" | Style: Label | Color: --theme-surface-on-surface
  [typed-header]      → "[Use Case Title, e.g., Master the Full Stack]" | Style: Heading 3 | Color: --theme-surface-on-surface
  [paragraph]         → "[Use Case description text]" | Style: Body | Color: --theme-surface-on-surface-variant
  [app-button]        → "Explore use case" | Style: Label | BG: --theme-primary-primary | Type: primary
```

---

## 1.3b — COMPOSITION MAPS

### COMPOSITION MAP: Welcome Hero Canvas
Element count: 230 particle nodes with dynamic connections

```
CENTER:    Orbital core particle group
           Size: ~300px radius, Position: centered, Z-index: back

BEHIND:    Background ring system
           Count: 2 concentric rings, Arrangement: radial
           Per-element: ringWidth: 0.006, ringWidth2: 0.107, particlesScale: 0.59, ringDisplacement: 0.62

AMBIENT:   Diffuse halo glow effects
           Gradient specs: Radial gradient centered in viewport, color stops from transparent to subtle background tint
```

---

## 1.4 — ANIMATION TIMELINES

```
ANIMATION: Hero Entrance
Section: Section 1 (Welcome Hero)
Trigger: page-load
Library: GSAP (using ScrollTrigger)
TIMELINE:
  t=0ms     [logo]           FROM: opacity:0, transform:translateY(1em)     → no change yet
  t=0ms     [welcome-cta]    FROM: opacity:0, transform:translateY(50px)    → no change yet
  t=0ms     [hero-video]     FROM: opacity:0                                → no change yet
  t=200ms   [logo]           TO:   opacity:1, transform:translateY(0)       DURATION:2000ms EASING:ease-out
  t=200ms   [welcome-cta]    TO:   opacity:1, transform:translateY(0)       DURATION:2000ms EASING:ease-out
  t=200ms   [hero-video]     TO:   opacity:1                                DURATION:4000ms EASING:ease-out
PROPERTIES ANIMATED: opacity, transform (translateY)
LOOP: no
RESET: no
```

```
ANIMATION: Hero Scroll Out
Section: Section 1 (Welcome Hero)
Trigger: scroll-enter(top 0vh)
Library: GSAP (using ScrollTrigger)
TIMELINE:
  t=0% scroll   [hero-video-wrapper]  FROM: opacity:1                       → no change yet
  t=100% scroll [hero-video-wrapper]  TO:   opacity:0                       DURATION: scroll-length EASING:ease-out
PROPERTIES ANIMATED: opacity
LOOP: no
RESET: yes (resets opacity to 1 when scrolled back to top)
```

---

## 1.5 — MICRO-INTERACTIONS

```
INTERACTION: Primary Button
Selector hint: app-button[variant="primary"]
STATE         | background              | color      | transform       | box-shadow                    | other
──────────────────────────────────────────────────────────────────────────────────────────────────────────
DEFAULT       | var(--theme-primary-primary) | var(--theme-primary-on-primary) | scale(1) | none | border: none
HOVER         | var(--palette-grey-900) | var(--theme-primary-on-primary) | scale(1.02) | 0 8px 24px rgba(33,34,38,0.1) | –
ACTIVE/CLICK  | var(--palette-grey-1000)| var(--theme-primary-on-primary) | scale(0.98) | none                          | –
FOCUS         | –                       | –          | –               | 0 0 0 3px rgba(32,121,249,0.3) | –
MECHANISM: CSS transition
DURATION: 200ms  EASING: ease-out
⚑ SPECIAL BEHAVIOR: none
```

```
INTERACTION: Sidebar Use Case Chip
Selector hint: .use-case-cta
STATE         | background              | color      | transform       | box-shadow                    | other
──────────────────────────────────────────────────────────────────────────────────────────────────────────
DEFAULT       | rgba(183,191,217,0.09)  | #B2BBC5    | scale(1)        | none                          | border: 1px solid rgba(33,34,38,0.06)
HOVER         | rgba(183,191,217,0.2)   | #121317    | scale(1)        | none                          | opacity: 1
ACTIVE/CLICK  | rgba(183,191,217,0.25)  | #121317    | scale(1)        | none                          | border-color: var(--theme-inverse-surface)
FOCUS         | –                       | –          | –               | –                             | –
MECHANISM: CSS transition
DURATION: 300ms  EASING: cubic-bezier(0.25, 0.46, 0.45, 0.94)
⚑ SPECIAL BEHAVIOR: backdrop-filter: blur(8px) is applied globally to the chip containers, giving them a frosted look.
```

---

## 1.6 — STATE MACHINES

```
STATE MACHINE: Typed Header
Location: Welcome Hero
Type: Typewriter
STATES:
  State A: Empty cursor blinking at position 0
  State B: Progressively rendering letters
  State C: Complete sentence typed, blinking cursor idle
INITIAL STATE: A
TRANSITION A→B:
  Trigger: component view initialization + delay (1000ms)
  Letters: textContent indices rendered one by one over delay step
TRANSITION B→C:
  Trigger: last character rendered
  Cursor: transitions to infinite blinking pulse animation (1000ms cycle)
LOOP: no
INTERNAL LAYOUT:
  Container: inline-flex container wrapping characters and blinking cursor element
```

```
STATE MACHINE: Use Cases Active State
Location: Section 5
Type: Cycler
STATES:
  State 0: Active chip: Enterprise, Morphing particles: professional textures, Content: Enterprise Copy
  State 1: Active chip: Frontend, Morphing particles: frontend textures, Content: Frontend Copy
  State 2: Active chip: Fullstack, Morphing particles: fullstack textures, Content: Fullstack Copy
  State 3: Active chip: Science, Morphing particles: science textures, Content: Science Copy
  State 4: Active chip: Marketer, Morphing particles: marketer textures, Content: Marketer Copy
INITIAL STATE: 0
TRANSITION:
  Trigger: click event on chip index N
  Chip: updates active border style and opacity
  Particles: morph coordinates to index N points layout over 800ms
  Header/Body: triggers typed text sequence to render new description
LOOP: no (user-controlled)
```

---

## 1.7 — SCROLL CHOREOGRAPHY MAP

```
Scroll %  │ Viewport Position    │ Event / Animation Trigger
─────────────────────────────────────────────────────────────────────
0%        │ Page load            │ Hero entrance timelines play, typing begins
~15%      │ Welcome Hero bottom  │ Hero video starts fading out to opacity 0
~25%      │ Video section enter  │ YouTube preview cursor tracking active
~40%      │ Agent First section  │ Features stagger slide-up animation
~60%      │ Use Cases enters     │ Particle canvas starts active rendering
~80%      │ Latest Blogs enters  │ Carousel carousel drag handlers bind
~100%     │ Footer enters        │ Bottom compact CTA buttons fade-in
─────────────────────────────────────────────────────────────────────
SCROLL BEHAVIORS:
  Parallax elements: background particle canvas translates at 0.4x scroll speed
  Sticky elements: WebGL canvas remains fixed in background from 50% to 75% scroll depth
  Nav state change: nav container adds frosted glass backdrop-filter after 80px scroll
```

---

## 1.8 — TECHNICAL STACK

```
  Framework: Angular (confidence: high)
  Animation: GSAP (confidence: high)
  Scroll:    GSAP ScrollTrigger (confidence: high)
  UI Lib:    Tailwind / native CSS Variables (confidence: high)
  Other:     WebGL (Three.js/custom shader particle system)
```

---

## 1.9 — MOTION PHILOSOPHY + COPY VOICE

```
MOTION PHILOSOPHY:
Physics-based, lightweight, and fluid. The interface behaves like a physical system with gravitational attraction between particles, creating a cinematic, tech-forward feel. The motion makes the platform feel alive and responsive, guiding attention to key features without distracting.

COPY VOICE PATTERN:
  Tone:          Philosophical, bold, concise
  Sentence form: Short fragments mixed with bold assertions
  Key device:    Paradox / direct address ("Build the new way")
  Example pattern: "Experience liftoff with the next-gen agent platform."
```
