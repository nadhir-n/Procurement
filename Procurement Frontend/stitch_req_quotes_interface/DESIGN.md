---
name: Enterprise Procurement System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#5a5f62'
  on-secondary: '#ffffff'
  secondary-container: '#dce0e4'
  on-secondary-container: '#5e6367'
  tertiary: '#4b566a'
  on-tertiary: '#ffffff'
  tertiary-container: '#636e83'
  on-tertiary-container: '#ecf1ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dfe3e7'
  secondary-fixed-dim: '#c3c7cb'
  on-secondary-fixed: '#171c1f'
  on-secondary-fixed-variant: '#43474b'
  tertiary-fixed: '#d8e3fb'
  tertiary-fixed-dim: '#bcc7de'
  on-tertiary-fixed: '#111c2d'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
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
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 240px
  container-padding: 2rem
  gutter-md: 1rem
  stack-sm: 0.5rem
  stack-md: 1.5rem
---

## Brand & Style

This design system is engineered for high-stakes enterprise procurement environments where clarity, speed of data processing, and trust are paramount. The brand personality is **authoritative, efficient, and precise**, moving away from "trendy" aesthetics in favor of a timeless, utility-first approach.

The visual style is **Corporate / Modern**, characterized by:
- **Functional Density:** Information is prioritized with controlled spacing that balances readability with data volume.
- **Hierarchical Contrast:** A clear distinction between navigation (deep, immersive tones) and the workspace (bright, focused neutrals).
- **Subtle Modernism:** Utilizing soft corner radii and layered surfaces to reduce the visual fatigue common in legacy enterprise software.
- **Action-Oriented:** A disciplined use of color to signify state, urgency, and primary task completion.

## Colors

The palette is divided into two distinct functional zones:

### Navigation (The Anchor)
The sidebar utilizes a **Deep Navy (#111827)** and **Slate (#1E293B)** foundation. This creates a strong vertical anchor that recedes visually, allowing the main content to pop. Active navigation items use high-contrast primary blue accents.

### Workspace (The Canvas)
The primary workspace uses a **Crisp White** for containers against a **Light Gray/Slate (#F8FAFC)** background. This provides enough contrast to define card boundaries without the harshness of a pure white-on-white layout.

### Functional Accents
- **Primary Blue (#2563EB):** Reserved for high-intent actions like "Record Bid" or "Submit".
- **Secondary Blue/Slate (#F1F5F9):** Used for "View" actions, supporting tasks, and ghost buttons.
- **Semantic Colors:** Emerald green for "Awarded" states and Amber for "Pending" or "Draft" states.

## Typography

The design system relies on **Inter** for its exceptional legibility in data-dense interfaces and its neutral, professional tone.

### Usage Guidelines
- **Headlines:** Use Semi-Bold (600) weights to establish clear section breaks. For page titles (e.g., "Request for Quotes"), use `headline-md`.
- **Data Tables:** Body text should primarily use `body-sm` (13px) for row content to maximize information density while maintaining legibility. Row headers should be `body-sm` with Medium (500) weight.
- **Labels:** Column headers in tables and form labels must use `label-bold` with a subtle letter spacing to distinguish them from interactive content.
- **Mobile Scaling:** On mobile devices, `display-lg` should scale down to `headline-md` size (24px) to prevent layout breaking.

## Layout & Spacing

This design system uses a **Fluid Workspace** model with a **Fixed Sidebar**.

### Layout Structure
- **Sidebar:** Fixed at 240px. On smaller screens (Tablets), it collapses into an icon-only rail or a hidden drawer.
- **Main Canvas:** A fluid area with a max-width of 1440px for content containers to ensure line lengths remain readable on ultra-wide monitors.
- **Grid:** A 12-column grid is used within the main canvas for dashboard widgets and form layouts.

### Spacing Rhythm
A strict 4px/8px baseline grid is used. 
- **16px (1rem):** Standard gutter between table columns and form fields.
- **24px (1.5rem):** Standard vertical rhythm between distinct page sections.
- **32px (2rem):** Outer margin for the primary content container.

## Elevation & Depth

To maintain a "Clean Professional" look, depth is communicated through **Tonal Layering** supplemented by **Ambient Shadows**.

- **Level 0 (Floor):** Workspace background (#F8FAFC). No shadow.
- **Level 1 (Card):** Main content containers. White background with a 1px border (#E2E8F0) and a very soft, diffused shadow (0px 1px 3px rgba(0,0,0,0.05)).
- **Level 2 (Popovers/Dropdowns):** Sharp contrast against white cards. Medium shadow (0px 10px 15px -3px rgba(0,0,0,0.1)).
- **Sidebar Depth:** The sidebar uses color (Navy) rather than shadow to indicate elevation, appearing "behind" the main workspace canvas.

## Shapes

The shape language is **Soft (0.25rem)** to reflect a modern enterprise feel that is approachable but remains serious and structured.

- **Standard Elements:** Buttons, Input fields, and Chips use a 4px (0.25rem) radius.
- **Containers:** Large content cards and modals use a 8px (0.5rem) radius to soften the overall interface.
- **Badges:** Status indicators (e.g., "Awarded") use a pill-shape (full rounding) to clearly distinguish them from interactive buttons.

## Components

### Buttons
- **Primary (Record Bid):** Solid Blue (#2563EB) background, White text. High visual weight.
- **Secondary (View Bids):** Light Blue/Slate (#F1F5F9) background, Dark Slate (#1E293B) text. Used for secondary navigation within rows.
- **Tertiary (Ghost):** No background, Slate text. Used for "Cancel" or "View Details."

### Data Tables
- **Header:** Light Slate background (#F8FAFC), 12px uppercase bold text.
- **Rows:** 52px minimum height. On hover, rows should transition to a very light blue (#F1F7FF) to provide a clear focus state.
- **Dividers:** 1px solid (#F1F5F9) horizontal lines only. No vertical lines between columns.

### Inputs
- **Search Fields:** White background, 1px border (#E2E8F0). Focus state uses a 2px Primary Blue ring with 20% opacity.
- **Prefix Icons:** Always 16px, colored in Neutral Slate (#94A3B8) to avoid competing with text content.

### Chips & Badges
- **Status Badges:** Use a light background of the semantic color (e.g., Light Green for "Awarded") with a dark-tone text of the same hue to ensure AA accessibility.