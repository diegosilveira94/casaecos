import { createTheme } from '@mui/material/styles';

// The brand colors live only here. `primary.light` is the soft green behind what is selected.
export const theme = createTheme({
  // `md` is the same breakpoint as `useIsDesktop` (52rem).
  breakpoints: { values: { xs: 0, sm: 600, md: 832, lg: 1200, xl: 1536 } },
  palette: {
    primary: { main: '#186949', dark: '#0f4f36', light: '#e7f1ec', contrastText: '#fff' },
    error: { main: '#b42318' },
    text: { primary: '#18221e', secondary: '#65716c' },
    background: { default: '#f5f7f6', paper: '#fff' },
    divider: '#d6ded9',
  },
  typography: {
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { minWidth: '20rem' },
        // Lists here are layout, not bullet points.
        'ul, dl, dd': { margin: 0, padding: 0, listStyle: 'none' },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            scrollBehavior: 'auto !important',
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiButtonBase: {
      styleOverrides: {
        // Controls whose feature does not exist yet (COMING_SOON_PROPS).
        root: { '&[aria-disabled="true"]': { cursor: 'default' } },
      },
    },
    MuiDialogActions: {
      defaultProps: { disableSpacing: true },
      styleOverrides: { root: { flexWrap: 'wrap', gap: 8, padding: '12px 24px 16px' } },
    },
    MuiTextField: {
      // The label always stays above the control, so it never covers a placeholder or
      // the native time and select controls.
      defaultProps: { fullWidth: true, slotProps: { inputLabel: { shrink: true } } },
    },
  },
});
