---
name: hono-door-ui
description: A calm bilingual admin UI for issuing and managing short-lived public links.
colors:
  ink: "#17191C"
  body: "#343A42"
  muted: "#66717D"
  canvas: "#F7F8F8"
  surface: "#FFFFFF"
  surface-subtle: "#EEF2F4"
  line: "#D9E0E5"
  line-strong: "#C5CED6"
  primary: "#1769AA"
  primary-hover: "#12598F"
  primary-soft: "#EAF4FB"
  danger: "#B42318"
  danger-soft: "#FDECEC"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  page-y: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
    typography: "{typography.body}"
  button-secondary:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
    typography: "{typography.body}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    typography: "{typography.body}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "18px"
---

# Design System: hono-door-ui

## 1. Overview

**Creative North Star: "Quiet Control Room"**

`hono-door-ui` should feel like a compact control room for secure link operations: calm, direct, bilingual, and visibly trustworthy. The current implementation already uses a restrained product vocabulary: system typography, light surfaces, blue primary actions, simple borders, and small-radius controls. The next visual direction should refine that foundation with clearer hierarchy, better state treatment, more deliberate spacing, and a softer neutral palette.

This is a product UI, not a marketing surface. It should reject flashy SaaS dashboard styling, oversized metrics, heavy gradients, decorative card grids, and ornamental effects. The interface should let both developers and operator-like users complete the task without stopping to decode the UI.

**Key Characteristics:**
- Restrained light-first interface with functional dark-mode support.
- System font stack tuned for Japanese and English readability.
- One primary accent used for actions, active navigation, and status emphasis.
- Flat, border-led surfaces with rare, subtle elevation only when it clarifies layering.
- Copy and layout that make token lifecycle constraints explicit.

## 2. Colors

The palette is a quiet neutral system with a restrained blue accent. It should read as stable and lightweight, not corporate or decorative.

### Primary
- **Operational Blue** (#1769AA): Use for primary actions, active navigation, links that initiate work, and informational status emphasis. It should appear sparingly so it keeps command weight.
- **Pressed Operational Blue** (#12598F): Use for hover, active, or selected states of primary controls.
- **Blue Wash** (#EAF4FB): Use for low-emphasis info messages and selected backgrounds when a filled blue would be too loud.

### Neutral
- **Ink** (#17191C): Primary text and high-confidence labels.
- **Body Graphite** (#343A42): Secondary body text when hierarchy is needed without losing contrast.
- **Muted Slate** (#66717D): Help text, metadata labels, and low-priority descriptions. Do not use below readable contrast thresholds.
- **Quiet Canvas** (#F7F8F8): Page background. Keep it close to neutral; do not push it into cream, sand, or blue-tinted novelty.
- **Surface** (#FFFFFF): Form sections, result panels, token rows, and QR containers.
- **Soft Rail** (#EEF2F4): Secondary buttons, inactive nav items, and subtle grouped controls.
- **Line** (#D9E0E5): Default border and divider.
- **Strong Line** (#C5CED6): Input borders and high-contact controls.

### Semantic
- **Danger Red** (#B42318): Destructive actions such as manual archive. Use direct red only on the action or message that needs it.
- **Danger Wash** (#FDECEC): Error or destructive warning background.

### Named Rules

**The Accent Ration Rule.** Operational Blue should stay under roughly 10% of a screen. It marks active intent, not decoration.

**The No SaaS Gloss Rule.** Do not introduce purple-blue gradients, hero metrics, glass panels, or decorative glow effects.

## 3. Typography

**Display Font:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`  
**Body Font:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`  
**Label/Mono Font:** Same family unless a future token-hash component explicitly needs a monospace stack.

**Character:** Use a single system sans stack for speed, Japanese readability, and operational familiarity. The feeling should be precise and quiet rather than editorial or branded.

### Hierarchy

- **Display** (700, 2rem, 1.2): Page titles such as "Issue link", "Active links", and "Archive". Keep this fixed, not fluid.
- **Headline** (700, 1.25rem, 1.35): Optional future group headings when a page needs more hierarchy than the current `h2` scale.
- **Title** (700, 1rem, 1.45): Section titles, card titles, details summaries, and form group names.
- **Body** (400, 1rem, 1.7): Main explanatory copy. Keep prose line length under 75ch where possible.
- **Label** (500, 0.875rem, 1.45): Field labels and compact metadata labels. Avoid uppercase tracking; Japanese and English labels should remain plain and readable.
- **Help** (400, 0.75rem, 1.6): Inline field help and constraint explanations.

### Named Rules

**The Plain Language Rule.** Use concrete UI labels for token, room, link, archive, reissue, expiry, and max uses. Avoid clever phrasing.

**The Bilingual Parity Rule.** Japanese and English strings should have equivalent information density. Neither language should be a shorter afterthought.

## 4. Elevation

The system is flat by default. Depth comes from page background, white surfaces, borders, spacing, and open/closed disclosure states. Shadows are not part of the current implementation and should remain rare; if introduced, they should be structural and subtle, not decorative.

### Shadow Vocabulary

- **None at rest** (`box-shadow: none`): Default for panels, rows, inputs, buttons, and QR containers.
- **Future floating layer** (`0 6px 16px rgba(20, 28, 36, 0.10)`): Reserved for future popovers, menus, or temporary floating surfaces only.

### Named Rules

**The Border-First Rule.** Use 1px borders and tonal surfaces before adding shadows.

**The No Ghost Card Rule.** Do not combine a 1px border with a wide soft shadow on ordinary cards or buttons.

## 5. Components

### Buttons

- **Shape:** Small rounded rectangle (6px). Do not exceed 12px for standard controls.
- **Primary:** Operational Blue background, white text, 10px 14px padding, system body typography. Use for the next decisive action only.
- **Hover / Focus:** Darken to Pressed Operational Blue on hover. Focus should use a visible outline or ring with enough contrast, not color alone.
- **Secondary:** Soft Rail background with Ink text. Use for logout, saving secondary settings, and non-primary actions.
- **Danger:** Danger Red background with white text. Use only for destructive or irreversible actions such as archive.
- **Loading / Disabled:** Preserve the button's footprint and label context. Disabled opacity is acceptable, but the cursor and copy should communicate the pending state.

### Cards / Containers

- **Corner Style:** 8px for panels, link rows, token rows, and QR containers.
- **Background:** Surface on Quiet Canvas. Use Soft Rail only for controls and inactive nav states.
- **Shadow Strategy:** No shadow at rest. Use borders and spacing for separation.
- **Border:** 1px Line for panels and rows; Strong Line for inputs.
- **Internal Padding:** 18px for primary panels, 16px for list items, 12px for compact token rows.

### Inputs / Fields

- **Style:** White background, Strong Line border, 6px radius, 10px 12px padding, inherited font.
- **Focus:** Strong visible outline or border shift. The focused state must be obvious in both light and dark modes.
- **Error / Disabled:** Error copy should appear near the field or form group and not rely on red alone. Disabled fields should remain readable.
- **Content:** Long URLs, token hashes, and room IDs must wrap or scroll intentionally; never let them break layout.

### Navigation

- **Style:** Compact flex navigation with 6px radius items and 36px minimum height.
- **Default:** Soft Rail background and Ink text.
- **Active:** Operational Blue background and white text.
- **Responsive:** Wrap naturally on narrow screens. Do not collapse into a custom menu unless the navigation grows beyond the current three destinations.

### Status Messages

- **Info:** Use Blue Wash background with Operational Blue emphasis. Avoid colored side stripes thicker than 1px; prefer full background tint or a complete border.
- **Error:** Use Danger Wash with Danger Red text and direct action-oriented copy.
- **Empty:** Empty states should explain what condition produced the absence and what the user can do next.

### QR Panel

- **Shape:** Square panel with 8px radius and white background.
- **Behavior:** Preserve a stable square aspect ratio. The QR code must remain crisp and high-contrast in both light and dark page themes.
- **Copy:** Remind users that raw public URLs and QR codes are visible only immediately after issue or reissue.

## 6. Do's and Don'ts

### Do:

- **Do** keep the interface restrained, practical, and calm; the product should feel like a reliable admin tool.
- **Do** use Operational Blue (#1769AA) for primary actions, active nav, and informational status only.
- **Do** maintain WCAG AA-level contrast for body, help, placeholder, and status text.
- **Do** make Japanese and English copy structurally equivalent when i18n is implemented.
- **Do** preserve stable dimensions for QR panels, token rows, buttons, and form controls so loading labels do not shift the layout.
- **Do** explain irreversible behavior, raw-token limitations, expiry, and max-use constraints close to the action they affect.

### Don't:

- **Don't** make the UI look like a flashy SaaS dashboard.
- **Don't** use heavy gradients, gradient text, decorative glow, glassmorphism, hero metrics, or oversized marketing-style cards.
- **Don't** use repeated identical card grids as decoration; each panel must correspond to a real task or record.
- **Don't** use colored side-stripe borders thicker than 1px for alerts, rows, or callouts.
- **Don't** increase card, panel, or input radii beyond 12px unless the entire component vocabulary is intentionally revised.
- **Don't** assume English-only operators. Locale, labels, errors, and empty states must work in Japanese and English.
