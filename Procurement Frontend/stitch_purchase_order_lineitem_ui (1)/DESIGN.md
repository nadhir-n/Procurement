---
name: Enterprise Core
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#434654'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#535f73'
  on-secondary: '#ffffff'
  secondary-container: '#d4e0f8'
  on-secondary-container: '#576377'
  tertiary: '#004e32'
  on-tertiary: '#ffffff'
  tertiary-container: '#006844'
  on-tertiary-container: '#72e9af'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#d7e3fb'
  secondary-fixed-dim: '#bbc7de'
  on-secondary-fixed: '#101c2d'
  on-secondary-fixed-variant: '#3b475b'
  tertiary-fixed: '#82f9be'
  tertiary-fixed-dim: '#65dca4'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005235'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin: 24px
  container-max: 1440px
---

## Brand & Style

This design system is engineered for high-stakes enterprise resource planning, where clarity, precision, and speed of information processing are paramount. The aesthetic is **Corporate / Modern**, prioritizing functional utility over decorative flair. 

The brand personality is professional, reliable, and authoritative. It evokes an emotional response of organized control and trustworthiness through a structured layout and a disciplined use of color. The visual language utilizes a rigorous grid, subtle tonal layering, and high-density information architecture to support complex operational workflows without overwhelming the user.

## Colors

The palette is centered on "Trust Blue" and a sophisticated range of cool grays. This combination ensures a professional atmosphere while providing enough contrast for critical data points.

- **Primary:** A deep, vibrant blue used for primary actions, active navigation states, and key identifiers.
- **Secondary/Neutral:** A comprehensive scale of grays handles the bulk of the UI—borders, backgrounds, and secondary metadata.
- **Semantic Accents:** Colors are used strictly for status and intent. Success Green (`#36B37E`) is used for "Fulfilled" or "Approved" states. Warning and Error tones are reserved for exceptions and blockers.
- **Surface Strategy:** The background utilizes a very light neutral tint to reduce eye strain, while content containers remain pure white to pop against the canvas.

## Typography

The typography system uses a dual-font approach to balance character and utility. 

- **Hanken Grotesk** is used for headlines and major identifiers (like PO numbers) to provide a modern, sharp executive feel.
- **Inter** is the workhorse for all body text, inputs, and labels, chosen for its exceptional legibility in high-density data environments.
- **JetBrains Mono** is introduced specifically for reference numbers (SKUs, Transaction IDs, Requisition numbers) to ensure individual characters are distinct and easily readable.

Hierarchy is enforced through weight and color rather than just size. Labels use uppercase styling with increased tracking to clearly distinguish them from the data they describe.

## Layout & Spacing

The design system employs a **Fluid-Fixed Hybrid Grid**. The sidebar navigation and utility panels have fixed widths, while the primary content area scales to fill the viewport, capped at a maximum width of 1440px for optimal readability.

- **8pt Grid System:** All spacing is derived from a 4px base unit, with 8px and 16px being the most frequent increments for component padding.
- **High Density:** Padding is kept tight (8px-12px inside components) to allow as much data as possible to be visible above the fold.
- **Information Grouping:** Use 24px or 32px vertical margins to separate major logical sections (e.g., Order Details vs. Terms & Delivery).
- **Alignment:** Consistent left-alignment is mandatory for data labels, with corresponding values either immediately adjacent or right-aligned in table views to facilitate scanning.

## Elevation & Depth

To maintain a clean, professional look, this design system minimizes the use of heavy shadows. 

1.  **Tonal Layers:** The primary method of showing depth is through background color shifts. The main page background is neutral-light, while "cards" or "content containers" are pure white.
2.  **Low-Contrast Outlines:** Containers are defined by subtle 1px borders (`#DFE1E6`) rather than drop shadows. This creates a "flat-plan" look that feels more like a professional document.
3.  **Functional Elevation:** Soft, ambient shadows are reserved exclusively for temporary overlays, such as dropdown menus, tooltips, or modal dialogs, to signal they are "floating" above the workspace.

## Shapes

The shape language is conservative and geometric. A "Soft" (`0.25rem`) corner radius is used for standard components like buttons, input fields, and tags. This small radius takes the "edge" off the UI without making it appear too casual or consumer-focused. Large containers (cards) may use `rounded-lg` (`0.5rem`) to create a clear structural distinction.

## Components

- **Buttons:** Primary buttons use a solid blue fill with white text. Secondary buttons use a ghost style with a subtle border. Action icons within buttons should be 16px.
- **Status Chips:** Small, low-saturation background fills with high-contrast text. For "Fulfilled," use a light green background with dark green text and a leading 4px dot.
- **Data Tables:** Use a zebra-stripe pattern or subtle hover states to guide the eye across rows. Row height should be optimized at 40px for high density.
- **Input Fields:** Use a standard 1px border. On focus, the border should change to the primary blue with a 2px outer glow (0% blur).
- **Navigation Tabs:** Simple underlined style or "Pill" style for secondary navigation. The active state is indicated by a primary blue underline or fill.
- **Sidebar:** A light-grey vertical bar on the left for sub-navigation (Details, Line Items, etc.), using a subtle "Active" indicator bar on the left edge of the selected item.