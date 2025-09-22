/**
 * Design Tokens - Centralized design system values
 * Export from Figma and maintain consistency across the application
 */

export const designTokens = {
  // Color System
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3',  // Main primary
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1'
    },

    // Secondary Colors
    secondary: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',  // Main secondary
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121'
    },

    // Semantic Colors
    success: {
      light: '#4caf50',
      main: '#2e7d32',
      dark: '#1b5e20'
    },

    warning: {
      light: '#ff9800',
      main: '#f57c00',
      dark: '#e65100'
    },

    error: {
      light: '#f44336',
      main: '#d32f2f',
      dark: '#c62828'
    },

    info: {
      light: '#2196f3',
      main: '#1976d2',
      dark: '#0d47a1'
    },

    // Surface Colors
    surface: {
      background: '#ffffff',
      paper: '#ffffff',
      disabled: '#f5f5f5',
      divider: '#e0e0e0'
    },

    // Text Colors
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#bdbdbd',
      hint: '#9e9e9e',
      inverse: '#ffffff'
    },

    // Three.js Specific Colors
    threejs: {
      sceneBackground: '#f5f5f5',
      gridHelper: '#888888',
      ambientLight: '#404040',
      directionalLight: '#ffffff',
      objectHighlight: '#2196f3',
      objectSelected: '#1976d2'
    }
  },

  // Typography System
  typography: {
    fontFamily: {
      primary: '"Roboto", "Helvetica", "Arial", sans-serif',
      secondary: '"Inter", "Helvetica", "Arial", sans-serif',
      monospace: '"Roboto Mono", "Courier New", monospace'
    },

    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem'  // 36px
    },

    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    },

    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em'
    }
  },

  // Spacing System (8px base grid)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem'      // 128px
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px'
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },

  // Z-Index Scale
  zIndex: {
    auto: 'auto',
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    dropdown: 1000,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080
  },

  // Breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  // Animation & Transitions
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },

    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },

  // Component Specific Tokens
  components: {
    button: {
      height: {
        sm: '32px',
        md: '40px',
        lg: '48px'
      },
      padding: {
        sm: '0 12px',
        md: '0 16px',
        lg: '0 24px'
      }
    },

    input: {
      height: {
        sm: '32px',
        md: '40px',
        lg: '48px'
      },
      borderWidth: '1px',
      focusBorderWidth: '2px'
    },

    panel: {
      width: '300px',
      padding: '16px',
      borderRadius: '8px'
    },

    layerItem: {
      height: '48px',
      padding: '12px 16px',
      gap: '12px'
    }
  }
};

// CSS Custom Properties Generator
export function generateCSSVariables(tokens = designTokens) {
  const cssVars = {};

  function flatten(obj, prefix = '') {
    for (const key in obj) {
      const value = obj[key];
      const varName = prefix ? `${prefix}-${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value, varName);
      } else {
        cssVars[`--${varName}`] = value;
      }
    }
  }

  flatten(tokens);
  return cssVars;
}

// Theme Utility Functions
export const theme = {
  color: (path) => {
    const keys = path.split('.');
    let value = designTokens.colors;
    for (const key of keys) {
      value = value[key];
    }
    return value;
  },

  spacing: (size) => designTokens.spacing[size],

  fontSize: (size) => designTokens.typography.fontSize[size],

  shadow: (size) => designTokens.shadows[size],

  borderRadius: (size) => designTokens.borderRadius[size]
};

export default designTokens;