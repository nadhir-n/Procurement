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
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#46566c'
  on-tertiary: '#ffffff'
  tertiary-container: '#5e6e85'
  on-tertiary-container: '#e9f0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '700'
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
  container-margin: 24px
  gutter-table: 12px
  row-padding-y: 16px
  sidebar-width: 240px
  header-height: 64px
---

## Brand & Style

This design system is built for mission-critical enterprise operations, focusing on clarity, efficiency, and high-density information management. The brand personality is **Professional, Systematic, and Precise**. It is designed for procurement professionals and financial administrators who require a tool that feels reliable and "heavy-duty" yet modern and frictionless.

The design style is **Corporate / Modern** with a focus on:
- **Functional Density:** Maximizing information on screen without compromising legibility.
- **Deep Hierarchies:** Clear distinction between navigational, structural, and content layers.
- **High-Contrast Utility:** Using a deep navy foundation to anchor the interface, contrasted with crisp white surfaces for content clarity.
- **Subtle Precision:** Utilizing razor-thin borders and micro-interactions that reinforce a sense of technical accuracy.

## Colors

The palette is anchored by "Deep Atlantic" navy for the structural sidebar, providing a grounded frame for the application. 

- **Primary:** An energetic "System Blue" used for primary actions, active states, and focus indicators.
- **Secondary:** A rich "Slate Navy" used for the primary sidebar and high-level headers.
- **Neutral:** A comprehensive scale of grays from "Off-White" backgrounds to "Steel" borders, ensuring that data points remain the focal point.
- **Semantic:** Status colors use a "Washout" technique—saturated text on low-opacity backgrounds—to ensure they are distinguishable without creating visual noise in high-density tables.

## Typography

This design system uses **Hanken Grotesk** across all roles. Its sharp terminals and modern geometry provide the clinical precision required for financial data.

- **Scale:** The typography scale is compact. We favor `14px` for body text to allow for more data rows per viewport.
- **Labels:** Uppercase labels with slight letter-spacing are used for table headers and metadata to distinguish them from actionable content.
- **Numerical Data:** Tabular figures should be enabled via CSS (`font-variant-numeric: tabular-nums`) to ensure that columns of numbers align perfectly for easy comparison.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The sidebar and top-bar are fixed, while the main content area utilizes a fluid grid that optimizes for wide-screen data visualization.

- **Sidebar:** A collapsed and expanded state for the sidebar allows users to prioritize workspace.
- **Grid:** A 12-column grid is used for dashboard layouts, but table views utilize a "Column-Flex" approach where columns have minimum widths and expand to fill available space.
- **Rhythm:** A 4px baseline grid ensures consistent alignment. Table rows use `16px` vertical padding to maintain breathability even in dense datasets.
- **Breakpoints:**
  - *Desktop (1440px+):* Full sidebar, multi-column cards.
  - *Tablet (768px - 1439px):* Icon-only sidebar, reflowing grid to 2 columns.
  - *Mobile (<767px):* Hidden sidebar (hamburger), single column stack, table horizontally scrolls.

## Elevation & Depth

To maintain a "SaaS" professional feel, depth is communicated through **Tonal Layering** and **Subtle Contours** rather than heavy shadows.

- **Layer 0 (Background):** `Neutral-50` (#F8FAFC) serves as the canvas.
- **Layer 1 (Cards/Tables):** White (#FFFFFF) surfaces with a `1px` border in `Neutral-200`. No shadow is used here to keep the UI flat and fast.
- **Layer 2 (Dropdowns/Modals):** Subtle ambient shadows (0px 4px 20px rgba(0,0,0,0.08)) are used to separate floating elements from the content plane.
- **Contrast Strokes:** Internal dividers in tables use a `1px` stroke in `Neutral-100` to create vertical rhythm without visual weight.

## Shapes

The shape language is **Soft (0.25rem / 4px)**. This provides a balance between the rigid "sharp" edges of traditional enterprise software and the overly "bubbly" feel of consumer apps.

- **Small (4px):** Used for buttons, input fields, and status tags.
- **Medium (8px):** Used for primary content containers and cards.
- **Large (12px):** Used for modals and large surface area panels.
- **Circular:** Reserved strictly for avatars and notification pips.

## Components

### Buttons
- **Primary:** Solid Blue, White text, 4px radius. High emphasis.
- **Secondary:** Ghost style (Transparent background, Blue border/text) or Subtle (Light gray background).
- **Icon Buttons:** Square 32x32px or 40x40px with centered icons for utility actions.

### Status Chips
- Use high-chroma text on a 10-15% opacity background of the same color. 
- Example: "Converted to PO" uses Primary Blue text on a Light Blue tint.

### Data Tables
- **Header:** Sticky positioning, `Label-MD` typography, `Neutral-50` background.
- **Rows:** Alternating "Zebra" striping or subtle hover states (`Neutral-50`).
- **Cells:** Vertical alignment centered, `Body-SM` typography.

### Input Fields
- White background, `Neutral-300` border.
- On focus: `Primary-Blue` border with a subtle 2px glow.
- Placeholder text: `Tertiary-Slate`.

### Sidebar Navigation
- Icons on the left, labels on the right. 
- Active state: Vertical "Blue Pillar" on the left edge with a subtle background highlight.
- Grouping: Clear headers for sections like "Procurement" and "Payables".