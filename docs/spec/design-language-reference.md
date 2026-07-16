# Design Language Reference — Google Antigravity Pricing Reference

This document is the official, descriptive extraction of the target design language from the Google Antigravity pricing page (https://antigravity.google/pricing). It records the computed styles extracted via automated browser tools.

---

## 1. Typography

### 1.1 Font Family
- **Primary Font**: `"Google Sans Flex", "Google Sans", sans-serif`
- **Fallback Font**: System UI font stack.

### 1.2 Observed Typography Scale

| Token Role | Element / Class | Computed Size | Weight | Line Height | Letter Spacing | Color |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero / Headline** | Page Title | `54px` | `450` | `56.16px` | `normal` | `#121317` (`rgb(18, 19, 23)`) |
| **Headline LG** | Card Headers (`h2.heading-6`) | `28px` | `450` | `30.24px` | `-0.1px` | `#121317` (`rgb(18, 19, 23)`) |
| **Headline MD** | Card Subheadings / Badges | `14.5px` / `16px` | `430` / `450` | `21.02px` | `0.11px` | `#45474D` (`rgb(69, 71, 77)`) |
| **Body MD** | Feature Lists, Details | `16px` | `400` | `24px` | `normal` | `#121317` (`rgb(18, 19, 23)`) |
| **Primary CTA Button** | `.button.button-primary` | `17.5px` | `450` | `25.38px` | `0.18px` | `#FFFFFF` (`rgb(255, 255, 255)`) |
| **Secondary Nav Button** | `.button.button-compact` | `14.5px` | `450` | `21.02px` | `0.11px` | `#45474D` (`rgb(69, 71, 77)`) |

### 1.3 Weight Threshold Policy
- The page does not use `300` (Light) or `700` (Bold) weights for headings.
- A unified weight of `450` (medium-light/regular-plus) is used for display headlines, title headings, and CTAs alike.
- Standard body copy is rendered at weight `400` (Regular).

---

## 2. Color Palette

### 2.1 Backgrounds
- **Canvas/Viewport Background**: `#FFFFFF` (`rgb(255, 255, 255)`)
- **Pricing Card Background**: `#F8F9FC` (`rgb(248, 249, 252)`) — a very soft, light-grey tint.

### 2.2 Text Hierarchy
- **Primary Text**: `#121317` (`rgb(18, 19, 23)`) — a rich dark charcoal.
- **Secondary/Muted Text**: `#45474D` (`rgb(69, 71, 77)`) — a medium slate grey.

### 2.3 Accents & Highlights
- **Accent/Brand Color**: `#3279F9` (`rgb(50, 121, 249)`) — a clean Google blue.
- **Accent Locations**: Exclusively used for card tags/pills (e.g. "Generally Available", "Get a Taste", "New!") and footnote/asterisk links (`*`). No other elements, borders, or texts use the accent color.

### 2.4 Success & Positive States
- **Checkmarks**: Monochrome `#121317` (`rgb(18, 19, 23)`). Check icons are styled identically to the body text color, not green or highlighted.

---

## 3. Spacing, Density & Component Treatments

### 3.1 Density
- **Card Padding**: `24px` on all sides.
- **Card Corner Radius**: `36px` (generously rounded corners).
- **Button Padding**: `10px 24px` for primary CTAs.
- **Button Corner Radius**: `9999px` (fully rounded pill buttons).
- **Border Treatments**: Cards have no borders (`0px none`). Nav/interactive items use soft outline boundaries (`rgba(33, 34, 38, 0.06)`).

### 3.2 Component States
- **Primary Button**: Background `#121317` (`rgb(18, 19, 23)`), text `#FFFFFF`. Hovers to `#2F3034` (`rgb(47, 48, 52)`).
- **Secondary Button**: Background `#E1E6EC` (`rgb(225, 230, 236)`), text `#121317`.
- **Card Layout**: A clean bento-style 4-column desktop grid with no shadows, relying entirely on the contrast between `#FFFFFF` canvas and `#F8F9FC` card backgrounds.

---

## 4. Visual Evidence (Rendering)

The full pricing layout rendering is saved inside the artifacts directory:
- [pricing_page.png](file:///Users/yvesdarbouze/.gemini/antigravity/brain/80408936-7203-445d-8a3d-ebf4d31d5e15/pricing_page.png)
