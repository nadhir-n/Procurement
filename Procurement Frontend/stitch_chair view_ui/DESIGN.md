---
name: Systemic Asset Management
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
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  status-success: '#10B981'
  status-warning: '#F59E0B'
  status-error: '#EF4444'
  surface-bg: '#F8FAFC'
  border-subtle: '#E2E8F0'
typography:
  headline-lg:
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
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for high-utility enterprise environments where data density must coexist with visual clarity. The brand personality is **reliable, precise, and unobtrusive**, acting as a silent partner to the user’s workflow. 

We utilize a **Modern Corporate** style with a focus on functional minimalism. The aesthetic avoids unnecessary decoration, prioritizing logical grouping and information hierarchy. The emotional goal is to reduce cognitive load and instill confidence in the accuracy of the data being managed.

## Colors
The palette is rooted in a high-contrast foundation for maximum legibility.
- **Primary Blue:** Used for primary actions and interactive states to denote progress and connectivity.
- **Slate (Secondary):** Employed for primary headings and text to provide a grounded, authoritative feel.
- **Muted Gray (Neutral):** Reserved for labels, metadata, and borders to keep them secondary to the data values.
- **Functional Accents:** Success (Green), Warning (Orange), and Error (Red) are used strictly for status indicators and alerts to ensure they command immediate attention without overwhelming the UI.

## Typography
This design system utilizes **Inter** for its exceptional legibility in data-heavy interfaces.
- **Hierarchy:** Use `headline-lg` for page titles and `headline-sm` for card titles.
- **Labels:** Use `label-md` in uppercase for table headers and field labels to create a clear distinction from user input.
- **Data Values:** Standard body text should be used for data entry, while `data-mono` (tabular figures) should be used for SKU numbers, serial codes, and quantities to ensure vertical alignment in lists.

## Layout & Spacing
The system follows a strict **8px grid** (with a 4px sub-grid for tight components) to ensure mathematical harmony.
- **Grid System:** A 12-column fluid grid for desktop, collapsing to 1 column for mobile. 
- **Density:** We prioritize "Generous Whitespace." Cards and containers should use a minimum of 24px internal padding to prevent information from feeling cramped.
- **Breakpoints:**
  - **Mobile:** < 640px (1 column, 16px margins)
  - **Tablet:** 640px - 1024px (6 columns, 24px margins)
  - **Desktop:** > 1024px (12 columns, 32px margins)

## Elevation & Depth
To maintain a professional and clean look, the design system avoids heavy shadows.
- **Tonal Layers:** Use the background color (`#F8FAFC`) to separate the main canvas from the white cards.
- **Shadows:** Only one level of elevation is used for cards: `0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px rgba(0,0,0,0.06)`. This creates a subtle "lift" from the page.
- **Outlines:** All containers should feature a `1px` solid border in `#E2E8F0` to define boundaries clearly, even in low-light environments.

## Shapes
The shape language is structured and dependable. 
- **Standard Radius:** 8px (`rounded-md`) is the default for buttons, inputs, and cards.
- **Large Radius:** 12px (`rounded-lg`) is used for primary dashboard widgets and modal containers.
- **Pills:** Used exclusively for status tags (e.g., "In Stock", "Out of Order") to differentiate them from interactive buttons.

## Components
- **Buttons:** Primary buttons use a solid blue background with white text. Secondary buttons use a white background with a slate border.
- **Input Fields:** Focus states must be highly visible, utilizing a 2px blue ring. Labels are positioned above the field in muted neutral text.
- **Cards:** Used as the primary layout vehicle. Cards should have a white background, 1px subtle border, and 8px rounded corners.
- **Status Chips:** Small, pill-shaped indicators. Use a low-saturation background with a high-saturation text color (e.g., Light Green BG / Dark Green Text) for accessibility.
- **Data Tables:** Use zebra-striping (alternating rows with `#F8FAFC`) for long lists. Ensure "Action" columns are always right-aligned.
- **Inventory Metrics:** Use large, bold numbers with accompanying icons for high-level dashboard summaries.