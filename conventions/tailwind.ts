import type { Convention } from '../lib/types';

export const tailwind: Convention = {
  name: 'Tailwind CSS',
  description:
    'A utility-first naming convention inspired by Tailwind CSS. Components and tokens use lowercase kebab-case with semantic prefixes and scale-based suffixes. Names are composable, predictable, and directly map to utility class patterns.',
  rules: `
## Tailwind-Inspired Design System Naming Rules

### General principles
- All names use lowercase kebab-case. No PascalCase, no camelCase, no underscores, no spaces.
- Names follow the pattern: {category}/{semantic}/{scale-or-variant}
- Avoid redundant words (e.g., "Component", "Element", "Button Component")

### Color tokens
- Pattern: color/{semantic}/{scale}
- Scale values: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
- Examples: color/primary-500, color/neutral-100, color/error-700
- Semantic names: primary, secondary, neutral, success, warning, error, info

### Spacing tokens
- Pattern: spacing/{value}
- Values follow Tailwind's default scale: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96
- Example: spacing/4, spacing/8, spacing/16

### Typography tokens
- Font size pattern: text/{scale}
  Scale values: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl, 9xl
- Font weight pattern: font/{weight}
  Weight values: thin, extralight, light, normal, medium, semibold, bold, extrabold, black
- Line height pattern: leading/{value}
  Values: none, tight, snug, normal, relaxed, loose, or numeric (3–10)
- Letter spacing pattern: tracking/{value}
  Values: tighter, tight, normal, wide, wider, widest
- Examples: text/xl, font/semibold, leading/relaxed

### Size tokens
- Width: w/{value} — values: auto, full, screen, or numeric (0–96)
- Height: h/{value} — values: auto, full, screen, or numeric (0–96)
- Generic size: size/{n} for square dimensions

### Component naming
- Pattern: {component}/{variant}/{state}
- All segments lowercase kebab-case
- Component: describes the element type (button, input, card, badge, avatar, modal, etc.)
- Variant: describes the visual style (primary, secondary, ghost, outline, destructive, etc.)
- State: optional modifier for interactive state (default, hover, active, disabled, focus, loading, error, success)
- If there is no meaningful variant, omit that segment: {component}/{state}
- Examples: button/primary/default, button/secondary/disabled, input/text/error, card/elevated, badge/success

### Semantic prefixes for utility tokens
- Background color: bg-{semantic}-{scale}
- Text color: text-{semantic}-{scale}
- Border color: border-{semantic}-{scale}
- Ring/focus: ring-{semantic}-{scale}

### Forbidden patterns
- PascalCase or CamelCase (Button, ButtonPrimary)
- Underscores (button_primary, Primary_Button)
- Spaces in names (Primary Button, Hover State)
- ALL CAPS segments (TEXT/LARGE, BUTTON/PRIMARY)
- Redundant suffixes like "Component", "Element", "Base", "Default" as standalone names
- Generic names without category context (e.g., "Large", "Red", "Small")
`.trim(),
  examples: [
    {
      good: 'button/primary/default',
      bad: 'Button_Primary',
      why: 'Uses lowercase kebab-case with clear category/variant/state structure instead of PascalCase with underscore.',
    },
    {
      good: 'color/primary-500',
      bad: 'Primary Button Color',
      why: 'Follows color/{semantic}-{scale} token pattern; the bad name uses spaces and is not a valid token reference.',
    },
    {
      good: 'text/xl',
      bad: 'TEXT/LARGE',
      why: 'Lowercase typography token with standard Tailwind scale value; CAPS segments are forbidden.',
    },
    {
      good: 'spacing/4',
      bad: 'btn-hover',
      why: 'spacing/4 is a proper spacing token. btn-hover mixes a component abbreviation with a state and has no category context.',
    },
    {
      good: 'input/text/error',
      bad: 'ButtonComponent/Hover State',
      why: 'input/text/error follows {component}/{variant}/{state}; the bad name uses PascalCase, redundant "Component" suffix, and a space in the state segment.',
    },
  ],
};
