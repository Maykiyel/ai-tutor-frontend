import { Button, createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'lime',

  primaryShade: {
    light: 6,
    dark: 4,
  },

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
