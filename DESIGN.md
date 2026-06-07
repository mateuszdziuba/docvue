---
name: High-End Beauty & Wellness
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#4f4443'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#817473'
  outline-variant: '#d2c3c1'
  surface-tint: '#6f5957'
  primary: '#6f5957'
  on-primary: '#ffffff'
  primary-container: '#f4d7d4'
  on-primary-container: '#725c5a'
  inverse-primary: '#dcc0bd'
  secondary: '#576156'
  on-secondary: '#ffffff'
  secondary-container: '#d9e3d4'
  on-secondary-container: '#5c655a'
  tertiary: '#5f5f59'
  on-tertiary: '#ffffff'
  tertiary-container: '#dfded6'
  on-tertiary-container: '#62625c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f9dcd9'
  primary-fixed-dim: '#dcc0bd'
  on-primary-fixed: '#271816'
  on-primary-fixed-variant: '#564240'
  secondary-fixed: '#dbe5d7'
  secondary-fixed-dim: '#bfc9bb'
  on-secondary-fixed: '#151e15'
  on-secondary-fixed-variant: '#40493f'
  tertiary-fixed: '#e4e3db'
  tertiary-fixed-dim: '#c8c7bf'
  on-tertiary-fixed: '#1b1c17'
  on-tertiary-fixed-variant: '#474742'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  h1:
    fontFamily: Noto Serif
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Noto Serif
    fontSize: 36px
    fontWeight: '400'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.12em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  section-gap: 120px
---

## Brand & Style

The brand identity centers on "Atmospheric Luxury"—a state of calm, intentional indulgence. This design system targets an affluent, discerning clientele who value serenity as much as results. The emotional response should be one of immediate decompression, achieved through a "Sanctuary" aesthetic.

We employ a **Minimalist** design style elevated by **Soft-Tactile** influences. This means removing all unnecessary decorative elements and allowing high-quality imagery and negative space to drive the experience. The UI feels airy and light, avoiding the rigid sterility of traditional corporate minimalism in favor of a warm, inviting environment that mimics a physical high-end spa lounge.

## Colors

The palette is rooted in organic, earthy tones that evoke nature and skin health.

- **Blush Pink (Primary):** Used for primary calls to action and subtle highlights; it represents the "glow" of beauty.
- **Sage Green (Secondary):** Used for restorative elements, secondary buttons, and success states; it conveys tranquility and botanical wellness.
- **Cream (Tertiary/Background):** The canvas of the application. Avoid pure white (#FFFFFF) to prevent eye strain and maintain a premium, "paper-like" feel.
- **Deep Charcoal (Text):** Used for all primary communication to ensure high legibility and a grounded, sophisticated contrast against the pastels.
- **Muted Taupe (Accent):** Used for borders, iconography, and subtle separators to maintain a cohesive, soft-focus look.

## Typography

This design system utilizes a high-contrast typographic pairing to establish a clear hierarchy of "Editorial Beauty."

**Noto Serif** is reserved for large display headings. Its classic proportions convey luxury and heritage. Letter spacing for H1 and H2 should be slightly tightened to create a tighter visual "lockup" for titles.

**Manrope** provides a modern, balanced counterpoint for all functional text. It is used for body copy, navigation, and interface labels. We utilize a generous line height (1.6) for body text to increase readability and contribute to the "airy" feel of the layout. All small labels should be set in uppercase with increased letter spacing to provide a clean, organized look to functional metadata.

## Layout & Spacing

This design system uses a **Fixed Grid** approach for large screens, centering content within a 1280px container to maintain control over line lengths and image focal points.

The spacing rhythm is intentional and generous. We prioritize vertical "breathing room" (Section Gaps) to prevent the user from feeling overwhelmed. Alignment should follow a 12-column structure with wide gutters, allowing for asymmetrical layouts that feel like a high-end fashion magazine. Padding within components should always favor the top and bottom to create a sense of vertical elegance.

## Elevation & Depth

To maintain a minimalist aesthetic, we avoid heavy shadows. Instead, we use **Ambient Shadows** and **Tonal Layering**:

- **Surface 1 (Base):** Cream (#FFFDF5).
- **Surface 2 (Floating Cards):** Pure White with a 10% opacity Charcoal shadow, highly diffused (Blur: 30px, Y-Offset: 10px). This makes cards feel like they are softly hovering over the cream base.
- **Glassmorphism:** Navigation bars and modal overlays should use a subtle backdrop blur (12px) with a 70% opacity Cream tint. This allows the soft colors of the background content to bleed through, maintaining a sense of place.
- **Interaction:** Upon hover, elements should not "pop" toward the user. Instead, they should subtly deepen in shadow or slightly shift in hue to a richer pastel.

## Shapes

The shape language is defined by "Softened Geometry." All interactive elements use a **Rounded** (0.5rem) base radius to mirror the organic curves found in beauty and wellness.

- **Cards & Modals:** Use `rounded-xl` (1.5rem) to feel friendly and protective.
- **Buttons:** Use `rounded-full` (pill-shaped) for primary actions to distinguish them clearly from informational containers.
- **Imagery:** Photography should always feature slightly rounded corners to soften the transition between the image and the cream background.

## Components

- **Buttons:** Primary buttons are pill-shaped, filled with Blush Pink, and use the Label-Caps typography. Secondary buttons use a Thin Charcoal outline with a transparent background.
- **Chips/Filters:** Used for service categories (e.g., "Massage," "Facials"). These should be Sage Green with a low-opacity fill, turning opaque upon selection.
- **Input Fields:** Minimalist design with only a bottom border in Taupe. Upon focus, the label should float upward using the Label-Caps style, and the border should transition to Charcoal.
- **Cards:** Service cards should feature large-scale imagery at the top. Use generous internal padding (32px) for the text area below the image.
- **Navigation:** A "Ghost" header that is completely transparent until scroll, at which point it gains the Cream glassmorphism effect. Navigation links should be Manrope 14px with ample horizontal spacing.
- **Specialty Component (The Booking Bar):** A persistent, unobtrusive bar at the bottom of the viewport on mobile, or a floating compact card on desktop, allowing for "Book Now" access at any time without interrupting the browsing experience.
