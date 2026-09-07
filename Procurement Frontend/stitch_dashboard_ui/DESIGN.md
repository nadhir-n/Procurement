---
name: Fiscal Precision
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
  on-surface-variant: '#424752'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727784'
  outline-variant: '#c2c6d4'
  surface-tint: '#005db9'
  primary: '#0057ae'
  on-primary: '#ffffff'
  primary-container: '#2570d0'
  on-primary-container: '#f6f6ff'
  inverse-primary: '#aac7ff'
  secondary: '#795900'
  on-secondary: '#ffffff'
  secondary-container: '#ffc329'
  on-secondary-container: '#6f5100'
  tertiary: '#006546'
  on-tertiary: '#ffffff'
  tertiary-container: '#00815a'
  on-tertiary-container: '#dbffe9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458d'
  secondary-fixed: '#ffdf9f'
  secondary-fixed-dim: '#f9bd22'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#68fcbf'
  tertiary-fixed-dim: '#45dfa4'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  stat-value:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  card-gap: 20px
  section-margin: 32px
---

## Brand & Style

This design system is built for clarity, institutional trust, and rapid data processing. The brand personality is **Professional, Efficient, and Reliable**, catering to financial controllers and operations managers who require high-density information without cognitive fatigue.

The visual style is **Corporate Modern**, characterized by:
- **Functional Minimalism:** A focus on high-contrast data points and meaningful white space.
- **Structured Precision:** Alignment with a strict grid and consistent component grouping to reduce visual noise.
- **Action-Oriented Hierarchy:** Use of vibrant brand colors only for primary actions and key data indicators, ensuring the user's eye is drawn to what matters most.

## Colors

The palette is optimized for a light-mode financial interface where neutral backgrounds allow data visualizations to stand out.

- **Primary Blue (#2570D0):** Used for primary buttons, active navigation states, and the dominant "PO Spend" data category.
- **Neutral Surface:** The page background uses a cool light gray to provide contrast for the pure white cards, creating a layered depth effect.
- **Semantic Accents:** 
    - **Green (#34D399):** Reserved for "Active" or "Online" statuses.
    - **Yellow (#FBBF24):** Utilized for "Non-PO Spend" and attention-required items.
    - **Light Blue:** Used for secondary data series and soft icon backgrounds.

## Typography

The system utilizes **Inter** for its exceptional legibility in data-heavy environments. 

- **Data Emphasis:** Financial figures use `stat-value` or `display-lg` with bold weights and tighter letter spacing to ensure they feel grounded and authoritative.
- **Hierarchy:** Card headers use `headline-md` for clear sectioning. Labels and secondary metadata use `body-sm` or `label-md` to maintain a clear information architecture.
- **Responsiveness:** Large displays scale down on mobile to prevent horizontal overflow of currency strings.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum width of 1440px for desktop clarity.

- **Rhythm:** An 8px base unit governs all dimensions.
- **Grid:** A 12-column system is used for desktop. 
    - **Desktop:** 24px outer margins, 16px gutters.
    - **Tablet:** 16px outer margins, 12px gutters.
    - **Mobile:** Single column stack with 16px margins.
- **Reflow:** Top-level summary cards reflow from a 4-column row on desktop to a 2x2 grid on tablet, and a vertical stack on mobile.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Canvas:** The lowest layer is the light gray page background.
- **Cards:** Pure white surfaces sit atop the canvas, defined by a 1px solid border (`#E2E8F0`).
- **Interaction:** A very subtle, highly diffused shadow (4px blur, 2% opacity) may be applied to cards on hover to indicate interactivity, but the default state is flat to maintain a professional, "paper-like" interface.

## Shapes

The design system uses a **Soft** shape language to appear modern yet approachable.

- **Standard Radius:** 8px (`0.5rem`) for cards, input fields, and large buttons.
- **Small Elements:** 4px (`0.25rem`) for tags and checkboxes.
- **Interactive Pill:** 100px for status badges and user profile avatars to distinguish them from structural layout elements.

## Components

### Cards
Cards are the primary container. They feature a pure white background, 8px border-radius, and a subtle light-gray border. Headers within cards should be separated by a thin horizontal divider if the content below is a list or complex chart.

### Navigation Tabs
Horizontal tabs use a clean typographic style. The active state is indicated by the Primary Blue color and a 3px thick bottom underline that spans the width of the text label.

### Summary Stat Cards
These feature a 48x48px soft-colored square background on the left containing a centered icon. The data is stacked to the right: a gray `body-sm` label on top and a bold `stat-value` below.

### Buttons
- **Primary:** Solid Primary Blue background with white text.
- **Secondary:** White background with Primary Blue border and text.
- **Icon Buttons:** Square 40px buttons with centered icons, used for utility actions like "Settings" or "Add".

### Input Fields & Selects
Defined by a 1px border. The dropdowns (e.g., Date Range) should use the `body-sm` font size to maintain a compact footprint in the header area.

### Status Indicators
Small 8px circular dots paired with text. Use Green for "Active/Online" and Yellow for "Pending/Action Required".