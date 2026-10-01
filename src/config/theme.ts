import { Button, createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'blue',

  /**
   * The shade a filled surface takes, per colour scheme.
   *
   * This one number governs more than buttons. Mantine derives
   * `--mantine-color-<primary>-text` from it, so **every label, link, and icon
   * painted in the primary colour on the page resolves to this shade in the light
   * scheme.** That is why a bright hue is such a trap: at `shade 4` a link is a
   * 1.5:1 smear on a light page. Choosing a dark shade is what makes primary-coloured
   * *text* legible, and it is a stricter requirement than making a button legible,
   * because text sits directly on the page rather than inside a filled shape.
   *
   * The same value serves both schemes, which is a consequence of a limitation in
   * Mantine rather than a preference: when it resolves a filled variant it calls
   * `parseThemeColor` **without a colour scheme**, so the black-or-white decision
   * is always made from the *light* scheme's primary shade. A dark scheme can
   * therefore never get dark text on a light filled surface, and no `autoContrast`
   * setting changes that — the flag is honoured, but evaluated against the wrong
   * scheme. So the shade has to work with white text in both.
   *
   * `blue-7` `#1d4ed8` is that shade, measured rather than eyeballed:
   *
   * - as primary-coloured text on white, 6.77:1, and 6.25:1 on the warm gray page;
   * - as a filled button with a white label, 6.77:1;
   * - against the dark page in the dark scheme it is still 6.77:1, and the button's
   *   own edge stays visible;
   * - on hover the shade steps to `blue-8` `#1e40af`, darker and so *more* legible.
   *
   * In the dark scheme, primary-coloured text is a different value entirely —
   * Mantine uses `blue-4` `#60a5fa` there — which is light on a dark page and reads
   * at 6.10:1. So the accent is cool and bright in the dark scheme and cool and
   * deep in the light one, without either being configured by hand.
   *
   * `theme.test.tsx` measures all of this rather than taking it on trust.
   */
  primaryShade: {
    light: 7,
    dark: 7,
  },

  /**
   * Let Mantine choose black or white for filled surfaces by luminance rather than
   * always assuming white.
   *
   * This cannot fix a filled button, for the reason above. It is kept because it
   * does fix the components that pass an explicit light shade — a `yellow.4` badge
   * gets dark text instead of unreadable white — and because it means a future
   * change to `primaryShade` is judged on the real colour rather than on an
   * assumption.
   */
  autoContrast: true,

  colors: {
    /**
     * A cool blue, replacing the lime this theme started with.
     *
     * Lime was a poor primary for anything drawn as *text* on this app's warm
     * near-white page: even at its most legible shade it read as a bright smear, and
     * a link or a label in it was unusable. Blue is deep enough at shade 7 to carry
     * text, and its dark-scheme counterpart at shade 4 is bright enough to carry
     * text on a dark page, so the same hue works in both without a second palette.
     *
     * The gray ramp below stays warm on purpose. A cool primary against a warm
     * neutral is a deliberate pairing and changing both would have been a larger
     * decision than the legibility problem called for.
     */
    blue: [
      '#eff6ff',
      '#dbeafe',
      '#bfdbfe',
      '#93c5fd',
      '#60a5fa',
      '#3b82f6',
      '#2563eb',
      '#1d4ed8',
      '#1e40af',
      '#1e3a8a',
    ],

    gray: [
      '#f6f6f2',
      '#eeeeea',
      '#e2e2dc',
      '#d2d2ca',
      '#b9b9b1',
      '#98988f',
      '#77776f',
      '#5d5d57',
      '#3a3a36',
      '#1d1d1b',
    ],
  },

  defaultRadius: 'md',

  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '600',
  },

  components: {
    NavLink: {
      styles: {
        root: {
          '--nl-bg': 'var(--mantine-color-blue-1)',
          '--nl-color': 'var(--mantine-color-blue-9)',
          '--nl-hover': 'var(--mantine-color-blue-2)',
        },
      },
    },

    Button: Button.extend({
      defaultProps: {
        color: 'blue',
        variant: 'filled',
      },
    }),
  },
})
