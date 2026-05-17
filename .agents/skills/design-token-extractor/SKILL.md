---
name: design-token-extractor
description: Extract and structure design tokens from existing CSS, Tailwind config, Figma variables, or design descriptions. Use when asked to extract tokens, create a token system, audit design consistency, or migrate from hardcoded values to a token architecture. Outputs tokens in CSS custom properties, Tailwind config, and Style Dictionary JSON formats.
---

# Design Token Extractor

Extract design tokens from any source and structure them into a portable, multi-format token system.

## Step 1: Identify Source Material

Accept any of:
- CSS files (scan for repeated values)
- Tailwind `tailwind.config.js` or `tailwind.config.ts`
- Figma variable exports (JSON)
- Design descriptions ("primary blue is #2563eb, used for buttons and links")
- Screenshots (extract approximate values)
- Existing component code

## Step 2: Token Categories

Extract tokens in this hierarchy:

### Primitive Tokens (raw values — never use directly in components)
```
color.blue.50 → #eff6ff
color.blue.500 → #3b82f6
color.blue.900 → #1e3a8a
space.1 → 4px
space.2 → 8px
font-size.sm → 14px
font-size.base → 16px
border-radius.sm → 4px
border-radius.md → 8px
duration.fast → 150ms
duration.base → 250ms
```

### Semantic Tokens (reference primitives — use these in components)
```
color.background.default → color.neutral.50
color.background.subtle → color.neutral.100
color.text.primary → color.neutral.900
color.text.secondary → color.neutral.500
color.text.disabled → color.neutral.300
color.border.default → color.neutral.200
color.interactive.primary → color.blue.600
color.interactive.primary.hover → color.blue.700
color.interactive.destructive → color.red.600
space.component.padding.sm → space.3
space.component.padding.md → space.4
space.layout.section → space.16
```

### Component Tokens (specific overrides — use sparingly)
```
button.height.md → 40px
button.padding.x → space.4
card.radius → border-radius.lg
input.border.color → color.border.default
```

## Step 3: Output Formats

Always output all three formats:

### CSS Custom Properties
```css
/* primitives */
:root {
  --color-blue-500: #3b82f6;
  --space-4: 16px;
}

/* semantic */
:root {
  --color-interactive-primary: var(--color-blue-500);
  --space-component-padding-md: var(--space-4);
}
```

### Tailwind Config Extension
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'interactive-primary': 'var(--color-interactive-primary)',
        'text-primary': 'var(--color-text-primary)',
      },
      spacing: {
        'component-md': 'var(--space-component-padding-md)',
      }
    }
  }
}
```

### Style Dictionary JSON (W3C Design Tokens format)
```json
{
  "color": {
    "interactive": {
      "primary": {
        "$value": "{color.blue.500}",
        "$type": "color",
        "$description": "Primary interactive element color — buttons, links, focus rings"
      }
    }
  }
}
```

## Consistency Audit

After extracting tokens, report:
- **Duplicate values**: Same hex used with different names
- **Near-duplicates**: Values within 10% of each other (e.g., `#374151` and `#3f4451`)
- **Unmapped values**: Hardcoded values in components that have no token
- **Unused tokens**: Tokens defined but not referenced

## Naming Conventions

- Use kebab-case
- Semantic tokens: `{category}.{property}.{variant}.{state}`
- No color names in semantic tokens (`interactive-primary` not `blue-button`)
- States: `default`, `hover`, `active`, `disabled`, `focus`
- Scale: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`
