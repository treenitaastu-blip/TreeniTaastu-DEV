# Design — TreeniTaastu

A locked visual system for TreeniTaastu. Page-level work should extend this system rather than introduce unrelated themes.

## Genre

Editorial with a restrained product layer: calm, specific, human and functional.

## Macrostructure family

- Marketing pages: **Split Studio** with H2 Split Diptych, alternating proof/content blocks and N9 Edge-aligned navigation.
- App pages: **Workbench**, where function and progress carry the page.
- Auth pages: compact **Split Studio** with the product promise beside one focused form.
- Content pages: **Long Document** with no decorative cards.

## Theme

Custom tuned theme: “calm precision, human movement, restrained energy”. Existing cyan is preserved as a signal rather than a large surface.

- `--color-paper`: `oklch(98% 0.006 227)`
- `--color-paper-2`: `oklch(95.5% 0.009 227)`
- `--color-ink`: `oklch(22% 0.014 227)`
- `--color-ink-2`: `oklch(31% 0.014 227)`
- `--color-rule`: `oklch(84% 0.012 227)`
- `--color-accent`: `oklch(64.29% 0.124 226.92)` (`#009BC7`)
- `--color-focus`: `oklch(57% 0.19 227)`

## Typography

- Display: Bricolage Grotesque, weight 700, roman.
- Body: IBM Plex Sans, weight 400.
- Outlier: IBM Plex Mono, only for short functional labels when needed.
- Display tracking: `-0.035em`.
- Display scale: `clamp(2.75rem, 5vw + 1rem, 5.25rem)`.

## Spacing

4-point named scale. Pages use tokens from `tokens.css`; raw spacing values are avoided in page styles.

## Motion

- Motion-cut by default.
- Buttons use one short press response; page content does not animate section-by-section.
- Easings: `--ease-out`, `--ease-in`, `--ease-in-out` from `tokens.css`.
- Reduced motion: opacity-only or instant, no spatial movement beyond 150 ms.

## Microinteractions stance

- Visible focus rings appear instantly.
- Button press uses a 1 px downward translation.
- Successful auth remains quiet; errors and recovery information remain explicit.
- All interactive targets are at least 44 px high on touch screens.

## CTA voice

- Primary CTA: dark ink fill, light paper text, compact rectangular shape.
- Secondary CTA: transparent, hairline border, explicit destination.
- Labels stay on one line and name the action.

## Per-page allowances

- Marketing pages may use typographic proof panels but no invented metrics or testimonials.
- App pages do not add decorative enrichment; function carries the page.
- Auth pages use one form and one supporting promise panel.

## What pages MUST share

- The TreeniTaastu wordmark.
- Cyan accent placement at no more than roughly 5% of a viewport.
- Bricolage Grotesque display and IBM Plex Sans body typography.
- Focus, input, button and spacing behaviour.
- Tinted paper and graphite ink rather than pure white and black.

## What pages MAY differ on

- Macrostructure within the page family.
- Content density and supporting proof layout.
- Whether a footer is present on task-focused app views.

## Exports

### tokens.css

The source of truth is the root `tokens.css` file.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(98% 0.006 227);
  --color-paper-2: oklch(95.5% 0.009 227);
  --color-paper-3: oklch(92% 0.012 227);
  --color-ink: oklch(22% 0.014 227);
  --color-ink-2: oklch(31% 0.014 227);
  --color-rule: oklch(84% 0.012 227);
  --color-accent: oklch(64.29% 0.124 226.92);
  --color-focus: oklch(57% 0.19 227);
  --font-display: "Bricolage Grotesque", sans-serif;
  --font-body: "IBM Plex Sans", sans-serif;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(98% 0.006 227)", "$type": "color" },
    "paper-2": { "$value": "oklch(95.5% 0.009 227)", "$type": "color" },
    "ink": { "$value": "oklch(22% 0.014 227)", "$type": "color" },
    "accent": { "$value": "oklch(64.29% 0.124 226.92)", "$type": "color" },
    "focus": { "$value": "oklch(57% 0.19 227)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Bricolage Grotesque, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "IBM Plex Sans, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "sm": { "$value": "1rem", "$type": "dimension" },
    "md": { "$value": "1.5rem", "$type": "dimension" },
    "lg": { "$value": "2rem", "$type": "dimension" },
    "xl": { "$value": "3rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 98% 0.006 227;
  --foreground: 22% 0.014 227;
  --card: 95.5% 0.009 227;
  --card-foreground: 22% 0.014 227;
  --primary: 64.29% 0.124 226.92;
  --primary-foreground: 22% 0.014 227;
  --secondary: 92% 0.012 227;
  --secondary-foreground: 31% 0.014 227;
  --muted: 84% 0.012 227;
  --muted-foreground: 51% 0.014 227;
  --border: 84% 0.012 227;
  --input: 72% 0.016 227;
  --ring: 57% 0.19 227;
  --radius: 1rem;
}
```
