AUDIT_MODE: high-fidelity

## SITE DNA — Antigravity Aesthetic (Applied to PaperWorking)

### Source Reference
URL: https://antigravity.google/ (JS-rendered; tokens derived from codebase history + known Antigravity design language)

---

## DESIGN TOKENS

### Colors — Light Mode
| Role | Token | Value |
|---|---|---|
| Page background | `--color-background` | `#FDFFFC` |
| Surface | `--color-surface` | `#FDFFFC` |
| Surface elevated | `--color-surface-container-low` | `#F3F6F3` |
| On surface (primary text) | `--color-on-surface` | `#0d0a0b` |
| On surface (secondary) | `--color-on-surface-variant` | `#454955` |
| Primary brand | `--color-primary` | `#454955` |
| Outline / border | `--color-outline` | `rgba(13,10,11,0.08)` |
| Nav border | — | `rgba(13,10,11,0.07)` |
| CTA button bg | — | `#0d0a0b` |
| CTA button text | — | `#FDFFFC` |

### Colors — Dark Mode
| Role | Token | Value |
|---|---|---|
| Page background | `--color-background` | `#0d0a0b` |
| Surface | `--color-surface` | `#121014` |
| Surface elevated | `--color-surface-container` | `#1e1b20` |
| On surface (primary text) | `--color-on-surface` | `#FDFFFC` |
| CTA button bg | — | `#454955` |
| CTA button text | — | `#FDFFFC` |
| Nav border | — | `rgba(253,255,252,0.07)` |

### Typography
| Role | Font | Weight | Size | Tracking |
|---|---|---|---|---|
| Brand "Paper" | Inter | 700 bold | inherited | -0.01em |
| Brand "Working" | Inter | 300 thin | inherited | -0.01em |
| Nav links | Inter | 500 | 14px | 0 |
| CTA button | Inter | 600 | 14px | 0 |
| Footer column heads | Inter | 600 | 11px | 0.07em uppercase |
| Footer links | Inter | 400 | 14px | 0 |

### Nav Bar Anatomy
- Height: 64px (mobile) / 72px (desktop)
- Sticky top: 0
- Background: `rgba(253,255,252,0.92)` light / `rgba(13,10,11,0.92)` dark
- Backdrop blur: 16px
- Border-bottom: `1px solid rgba(13,10,11,0.07)` light / `rgba(253,255,252,0.07)` dark
- Max-width container: 1280px, centered
- Padding: 0 40px desktop / 0 20px mobile
- Logo: left-aligned
- Center links: Home | How It Works (dropdown) | Pricing | Support
- Right actions: Sign In (text link) | Start 14-Day Free Trial (pill CTA)
- CTA shape: `border-radius: 9999px` (full pill)
- CTA padding: 10px 20px

### Footer Anatomy
- 5 columns: Brand | Main Navigation | Support & Resources | Authentication | Legal
- Column header: 11px semibold uppercase, tracking-[0.07em], muted color
- Column links: 14px regular, muted → primary on hover
- Top border: `1px solid rgba(13,10,11,0.07)` light / `rgba(253,255,252,0.07)` dark
- Background: same as page (no color break)
- Top padding: 80px, bottom: 48px
- Max-width: 1280px

### Motion
- Nav entrance: None (immediate)
- Dropdown: opacity 0→1 + translateY(-6px→0), 160ms, cubic-bezier(0.19,1,0.22,1)
- Mobile drawer: translateX(-100%→0), 300ms, ease
- Hover transitions: 150ms ease for color changes
