---
name: Enterprise Logic
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45474c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#00190e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00301e'
  on-tertiary-container: '#00a472'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
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
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  headline-md-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
  sidebar-width: 260px
  container-max: 1440px
  gutter: 20px
---

## Brand & Style

This design system is built upon a **Corporate / Modern** aesthetic, optimized for high-utility enterprise environments. It prioritizes data density and clarity without sacrificing visual sophistication. The brand personality is one of unwavering reliability and quiet efficiency, catering to professional users who manage complex procurement workflows.

The visual style leverages a "Clean Professionalism" approach:
- **Precision:** Mathematical alignments and consistent internal spacing.
- **Modernity:** A shift away from legacy heavy borders toward subtle tonal layering and refined typography.
- **Trust:** A dominant palette of deep navys provides a stable foundation, contrasted with high-clarity white surfaces for content focus.
- **Efficiency:** Streamlined interactions and a compact layout model that maximizes information density on high-resolution displays.

## Colors

The color strategy uses high-contrast functional zones to differentiate navigation from content.

- **Primary (Deep Navy):** Reserved for sidebar navigation, header backgrounds, and high-level structural elements. It conveys authority and permanence.
- **Secondary (Action Blue):** Used for primary buttons, active states, and focus indicators. It provides a clear path for user intent.
- **Tertiary (Success Green):** Utilized for positive status indicators, "approved" states, and completed procurement steps.
- **Neutral (Workspace Grays):** A refined range of cool grays (Slate) used for backgrounds, borders, and secondary text to reduce cognitive load in data-heavy tables.

**Status Palette:**
- **Warning:** #F59E0B (Amber) for pending actions.
- **Danger:** #EF4444 (Red) for rejected or overdue items.
- **Info:** #64748B (Slate) for draft or inactive states.

## Typography

The typography system balances modern character with utilitarian performance. 

- **Hanken Grotesk** is used for headings to provide a sharp, contemporary feel that distinguishes the product from generic enterprise software.
- **Inter** handles the majority of the UI for its exceptional legibility at small sizes and neutral tone.
- **JetBrains Mono** is strategically introduced for alphanumeric identifiers (PO numbers, GRN codes, SKU IDs). This monospaced choice ensures that complex codes are easy to scan and compare in vertical columns.

**Scalability:** On mobile, display sizes are reduced by approximately 20%, and line-height is tightened to accommodate smaller viewports while maintaining vertical rhythm.

## Layout & Spacing

The design system employs a **Fixed Grid** model for the main content area with a persistent sidebar.

- **Grid:** A 12-column grid is used for dashboard layouts. In the procurement list view, columns are fluid within the main container to maximize visibility of data strings.
- **Rhythm:** An 8px base unit (with a 4px half-step for tight components) governs all padding and margins.
- **Sidebar:** A fixed 260px left-hand navigation allows for deep nested menus (e.g., Procurement > Purchase Receives) while keeping the main workspace stable.
- **Density:** To achieve "high-density," vertical padding in table rows is capped at 12px, ensuring more records are visible above the fold.

## Elevation & Depth

This system utilizes **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to maintain a clean, professional "flat" look.

1.  **Level 0 (Base):** #F8FAFC (Slate 50). The background for the entire application.
2.  **Level 1 (Cards/Containers):** Pure White (#FFFFFF). Surfaces used for tables and form containers. These feature a 1px border in #E2E8F0 (Slate 200).
3.  **Level 2 (Overlays):** Modals and dropdowns. These use a subtle ambient shadow (0px 10px 15px -3px rgba(0, 0, 0, 0.05)) and a #CBD5E1 border to separate them from the Level 1 surfaces.

The sidebar uses a dark tonal depth (Primary Color) to visually "recede," pushing the white content area forward in the user's focus.

## Shapes

The shape language is **Soft (0.25rem)**, reflecting a precise and structured enterprise environment.

- **Standard Elements:** Input fields, buttons, and checkboxes use a 4px (0.25rem) radius.
- **Large Elements:** Main dashboard cards and modal containers use an 8px (0.5rem) radius to soften the larger geometric blocks.
- **Status Pills:** Status indicators (e.g., "Active," "Received") use a fully rounded (pill) shape to distinguish them from interactive buttons.

## Components

- **Buttons:**
    - *Primary:* Solid Action Blue with white text.
    - *Secondary:* Ghost style with Action Blue border and text.
    - *Utility:* Slate 100 background with Slate 700 text for low-priority actions (e.g., "View").
- **Tables:** The core of the system. Use "zebra striping" only on hover to maintain a clean look. Headers must be in Label-MD (Uppercase) with a Slate 50 background.
- **Data Cards:** Modernized containers for summary metrics. They feature a 1px Slate 200 border, no shadow, and Hanken Grotesk for the primary value.
- **Status Indicators:** Small dots or pill-shaped badges. Use Tertiary Green for "Received," Amber for "Pending," and Red for "Flagged."
- **Input Fields:** 1px Slate 200 border that transforms to 2px Action Blue on focus. Labels should sit above the field in Body-SM (Bold).
- **Navigation Items:** Sidebar links use a subtle background highlight and a left-side 3px accent bar for the active state.