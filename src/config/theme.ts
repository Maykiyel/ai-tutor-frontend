import { Button, createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'lime',

  /**
   * The shade a filled surface takes, per colour scheme.
   *
   * The same value is used in both schemes, which is a deliberate consequence of a
   * limitation in Mantine rather than a preference. When it resolves a filled
   * variant it calls `parseThemeColor` **without a colour scheme**, so the
   * black-or-white decision is always made from the *light* scheme's primary shade.
   * A dark scheme can therefore never get dark text on a light filled surface, and
   * no `autoContrast` setting changes that: the flag is honoured, but it is
   * evaluated against the wrong scheme.
   *
   * So the shade is chosen to be readable with white text, and one value has to
   * serve both. `lime-7` `#4d7c0f` is that value:
   *
   * - on white, 4.99:1 — AA, where the old `lime-6` was 3.09:1 and failed for any
   *   label that was not large text;
   * - as the filled surface in the dark scheme, still 4.99:1, and 3.4:1 against the
   *   dark page behind it, so the button's own edge stays visible;
   * - on hover the shade steps to `lime-8` `#3f6212`, which is darker and so
   *   *more* legible at 7.25:1, not less.
   *
   * The cost is that a primary button in the dark scheme is now a deep green rather
   * than a bright lime. Bright lime is still the accent: the sidebar's active row
   * uses `lime-4` directly and reads at 7.58:1.
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
   * This cannot fix the button, for the reason above. It is kept because it does
   * fix the components that pass an explicit light shade — a `yellow.4` badge gets
   * dark text instead of unreadable white — and because it means a future change to
   * `primaryShade` is judged on the real colour rather than on an assumption.
   */
  autoContrast: true,

  colors: {
    lime: [
      '#f7fee7',
      '#ecfccb',
      '#d9f99d',
      '#bef264',
      '#a3e635',
      '#84cc16',
      '#65a30d',
      '#4d7c0f',
      '#3f6212',
      '#365314',
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
          '--nl-bg': 'var(--mantine-color-lime-4)',
          '--nl-color': 'var(--mantine-color-gray-8)',
          '--nl-hover': 'var(--mantine-color-lime-5)',
        },
      },
    },

    Button: Button.extend({
      defaultProps: {
        color: 'lime',
        variant: 'filled',
      },
    }),
  },
})
