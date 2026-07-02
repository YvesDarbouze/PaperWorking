# Design Divergences Audit — paperworking.co

This report indexes the visual and structural divergences between the live production deployment at `paperworking.co` and the canonical **Luminous Glass** design system.

---

## Divergence Index

### 1. Phase Color Model (CRITICAL)
- **Divergence**: The live application styling is configured around a grayscale phase color system (defined in legacy files as `.pw-phase-sourcing` with `#f2f2f2`, `.pw-phase-contract` with `#cccccc`, etc.).
- **Impact**: Erases high-touch visual recognition of active phases.
- **Recommended Fix**: Overwrite color variables to map the four-phase color scale: Gold/Amber (`#F59E0B`) for Acquisition, Blue (`#3B82F6`) for Transaction, Orange (`#F97316`) for Rehab, and Green (`#10B981`) for Hold/Exit.

### 2. Day/Light Mode Artifacts (IMPORTANT)
- **Divergence**: Page settings and layout templates contain structural elements, theme toggle buttons, and text descriptions referencing a "day/light" visual theme.
- **Impact**: Direct contradiction of the locked pure-dark Obsidian theme requirement.
- **Recommended Fix**: Completely strip theme toggle options from settings interfaces and remove all styles mapped to light-theme background states.

### 3. Hydration Leakage (IMPORTANT)
- **Divergence**: View transitions and data-fetching cycles briefly render unstyled text elements ("Loading...") to the user during hydration.
- **Impact**: erodes institutional product feel on initial load.
- **Recommended Fix**: Replace basic text load indicators with proper skeletal layout wrappers (`.animate-pulse` glass boxes matching visual container sizes).

### 4. Non-Standard Button Shadows & Gradients (COSMETIC)
- **Divergence**: Interactive buttons in marketing sections use decorative background gradients and heavy black shadows instead of the locked frosted glass pattern (`.pw-btn`).
- **Impact**: Dilutes the minimalist, data-dense look, making the UI look like a generic marketing template.
- **Recommended Fix**: Apply the `.pw-btn` and `.glass-panel` utilities with subtle 3D white inset borders (`inset 0 1px 1px rgba(255,255,255,0.15)`).

### 5. Fallback Typography (COSMETIC)
- **Divergence**: Input elements and tabular values render using default system font stacks (`sans-serif`) rather than the locked brand font pair (**Hanken Grotesk** and **Plus Jakarta Sans**).
- **Impact**: Dilutes readability of financial grids and KPIs.
- **Recommended Fix**: Apply Tailwind font utilities (`font-sans` for body, `font-display` for headers) across all input components.
