# Design System: PaperWorking App
**Project ID:** 11643693106955298243

## 1. Visual Theme & Atmosphere
The design system, titled "Luminous Glass," is an evolution of glassmorphism tailored for a high-performance SaaS dashboard. It evokes a sense of clarity, precision, and futuristic professionalism. The UI is designed to feel lightweight, almost ethereal, yet functionally robust. 

The aesthetic is characterized by:
- **Translucency:** Multiple layers of depth created through varying levels of background blur (frosted glass).
- **Luminous Gradients:** Soft, atmospheric background gradients that peek through transparent surfaces.
- **Micro-interactions:** Subtle haptic feedback and smooth transitions that reinforce the "physical" feel of the digital glass.
- **Minimalist Data:** A focus on high-readability metrics and clean visualizations that don't overwhelm the user.

## 2. Color Palette & Roles
The palette is anchored in professional "Paperworking" tones—deep blues and organic greens—balanced against high-transparency neutrals.

* **Primary Navy** (`#1B405B`): Used for high-emphasis actions, primary branding, and structural containers.
* **Deep Ocean Blue** (`#002A43`): Used for primary text on light backgrounds or high-contrast UI elements.
* **Status Info Navy** (`#163144`): Used for informational states and primary action pills.
* **Minty Seafoam** (`#D3E7DF`): Used for background highlights, success states, and secondary containers.
* **Deep Forest Green** (`#0D2A26`): Used for highly contrasted accents and dark mode components.
* **Paper White** (`#F9F9F9`): The foundation for surfaces and backgrounds to maintain a clean, document-like feel.
* **Frosted Glass Background** (`rgba(255, 255, 255, 0.4)`): Used for translucent surfaces layered over gradients.
* **Frosted Glass Border** (`rgba(255, 255, 255, 0.6)`): Used as a 1px border to define the edge of glass surfaces.

## 3. Typography Rules
This design system utilizes **Hanken Grotesk** (a geometric and clean sans-serif) to provide a highly legible experience. The type scale is optimized for data density.

* **Display/Headlines:** Display styles (48px, semi-bold) are reserved for primary dashboard metrics (e.g., total revenue). Headlines (32px, semi-bold) structure the main page content.
* **Body Text:** Standard body text (14px-16px, regular) is clean and highly readable.
* **Labels:** Label-caps (12px, semi-bold, 0.05em letter-spacing) are used for chart axes and secondary metadata.
* **Mobile Adjustments:** Headline sizes are reduced slightly on mobile to maximize screen real estate for cards and visualizations.

## 4. Component Stylings
* **Buttons:** Primary buttons are **Pill-shaped (fully rounded)** using the Status Info blue (`#163144`) with white text. Secondary buttons are frosted glass with a subtle white border. All buttons include a subtle inner glow to enhance the 3D glass effect.
* **Cards/Containers:** Features generously rounded corners (**16px radius**). They are built as frosted glass cards using the Glass Background (`rgba(255, 255, 255, 0.4)`) and have a 1px Glass Border (`rgba(255, 255, 255, 0.6)`) to define the edge. They utilize a `backdrop-filter: blur(20px)` to blur the underlying mesh gradients.
* **Inputs/Forms:** Fields are semi-transparent with a 1px bottom border or a full 8px rounded container. On focus, the border transitions to the primary brand color with a soft outer glow.
* **Data Visualizations:** Charts use thin stroke weights (1.5pt) and soft area gradients. Data points are represented by small, high-contrast white circles. Grids should be minimal, using dashed lines at 10% opacity.
* **Navigation Pill:** A floating bottom navigation bar, pill-shaped and frosted, containing high-contrast icons. The active state is indicated by a solid white circular background behind the icon.

## 5. Layout Principles
This design system uses a **Fluid Grid** model with a 4px base unit. 

* **Whitespace & Alignment:** Content is organized into a single-column stack on mobile with nested horizontal scrolling for "Quick Glance" cards.
* **Margins:** A standard 20px safe area (`container-padding`) on left/right edges.
* **Gutters:** 12px spacing (`grid-gutter`) between dashboard widgets.
* **Rhythm:** Elements are vertically separated by 16px (`stack-gap`) to maintain a sense of airiness while allowing for high information density.

**Elevation & Depth:**
Hierarchy is established through Backdrop Blurs and Tonal Stacking rather than traditional heavy shadows:
1. **Base Layer:** Soft mesh gradient (Primary to Secondary colors).
2. **Surface Level:** Frosted glass cards.
3. **Floating Level:** Active elements (like the navigation pill or tooltips) use a higher opacity white or the Status Info color with a soft, 15% opacity ambient shadow (20px blur, 10px Y-offset) to appear "closer" to the user.
