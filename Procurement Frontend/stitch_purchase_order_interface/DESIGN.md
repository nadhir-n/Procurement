---
name: Enterprise Precision
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
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
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
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
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
  sidebar-width: 260px
  container-padding: 2rem
  gutter-md: 1.5rem
  row-height-sm: 40px
  row-height-md: 56px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
---

## Brand & Style

This design system is built for the high-stakes environment of enterprise procurement. The brand personality is **authoritative, efficient, and transparent**, aimed at procurement officers, department heads, and financial controllers who require speed without sacrificing accuracy.

The visual style follows a **Corporate / Modern** approach. It prioritizes information density and clarity through a structured layout, subtle depth, and a professional color palette. The UI is designed to feel like a powerful tool—reliable and unobtrusive—where whitespace is used strategically to separate complex data sets rather than for purely aesthetic purposes. Key attributes include:
- **Clarity:** High-contrast text and explicit status indicators.
- **Reliability:** A geometric and stable grid system.
- **Efficiency:** Streamlined navigation and dense data presentation.

## Colors

The palette is anchored by "Slate Deep Blue" to convey stability and institutional trust. 

- **Primary (#1E293B):** Used for sidebar backgrounds, primary headings, and high-level navigation to provide a strong structural frame.
- **Secondary (#3B82F6):** A vibrant "Action Blue" used for primary buttons, active states, and selection highlights.
- **Tertiary/Status:** A functional set of semantic colors:
    - **Success (#10B981):** For fulfilled orders and approved requests.
    - **Warning (#F59E0B):** For pending approvals or low-stock alerts.
    - **Error (#EF4444):** For rejected items or budget overruns.
- **Neutral:** A range of cool grays from `Slate-50` (#F8FAFC) for backgrounds to `Slate-600` for secondary text, ensuring a soft but professional workspace.

## Typography

The typography system utilizes **Hanken Grotesk** for headings to provide a modern, sharp executive feel. **Inter** is the workhorse for body copy and UI elements due to its exceptional legibility at small sizes. **JetBrains Mono** is reserved for technical identifiers like PO numbers and SKU codes to distinguish data from prose.

- **Headlines:** Use Hanken Grotesk with tighter letter-spacing for a sophisticated look.
- **Body:** Inter at 14px is the standard for data tables to maximize info density while maintaining readability.
- **Data Mono:** Used specifically for alphanumeric strings (e.g., `PO-965412`) to prevent character confusion (e.g., 0 vs O).

## Layout & Spacing

This design system uses a **Fixed-Fluid Hybrid Grid**. 
- **Sidebar:** A fixed 260px left-hand navigation ensures persistent access to core modules.
- **Main Content:** A fluid area that expands to fill the viewport, using a 12-column grid for internal dashboard widgets and tables.
- **Data Density:** Spacing follows an 8px base unit, but transitions to 4px (stack-xs) for dense data environments like line-item tables.

**Breakpoints:**
- **Desktop (1440px+):** Full sidebar, 32px page margins.
- **Tablet (1024px):** Sidebar collapses to icons-only, 24px page margins.
- **Mobile (below 768px):** Sidebar moves to a hidden "hamburger" drawer, typography scales down, and tables transition to stacked card views.

## Elevation & Depth

To maintain a professional and clean aesthetic, depth is created primarily through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Background):** `Slate-50` (#F8FAFC). The canvas for the application.
- **Level 1 (Cards/Containers):** Pure White (#FFFFFF) with a 1px border in `Slate-200`. This is the primary surface for data tables and forms.
- **Level 2 (Dropdowns/Modals):** Pure White with a subtle, highly diffused ambient shadow (0px 10px 15px -3px rgba(0,0,0,0.05)) to suggest it is floating above the workspace.
- **Interaction:** Active inputs and focused rows use a 2px secondary color outline to indicate state without shifting the layout.

## Shapes

The shape language is **Soft (0.25rem / 4px)**. This choice strikes a balance between the rigid "sharp" corners of traditional legacy software and the overly "rounded" consumer apps.

- **Components:** Standard buttons, input fields, and checkboxes use a 4px radius.
- **Large Elements:** Main content containers and dashboard widgets use `rounded-lg` (8px) to softly frame large blocks of data.
- **Status Pills:** Use a fully rounded (pill-shaped) radius to clearly differentiate status indicators from interactive buttons.

## Components

### Buttons
- **Primary:** Solid `Secondary Blue` with white text. High emphasis.
- **Secondary:** Ghost style (Transparent background, `Slate-200` border, `Slate-700` text) for neutral actions like "Cancel" or "View".
- **Action Icons:** 32x32px hit area with subtle hover states.

### Data Tables
The core of the system. Tables must feature:
- **Sticky Headers:** Always visible when scrolling.
- **Zebra Striping:** Very subtle `Slate-50` on even rows to aid horizontal tracking.
- **Condensed Row Option:** A toggle for power users to reduce row height from 56px to 40px.

### Input Fields
- **Default State:** White background, 1px `Slate-300` border, `Inter` Body-md text.
- **Validation:** Clear red borders for errors, accompanied by 12px helper text below the field.

### Sidebar Navigation
- **Active State:** A left-aligned vertical "indicator bar" in `Secondary Blue` and a subtle background highlight to show the current location.
- **Grouping:** Use uppercase `Label-md` for category headers (e.g., PROCUREMENT, PAYABLES).

### Status Chips
- Small, pill-shaped badges with low-opacity background colors (e.g., 10% opacity of the semantic color) and high-opacity text of the same hue for maximum legibility.