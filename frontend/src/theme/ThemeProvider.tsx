import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as ThemeMode) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#E8573A',
        light: '#F28C7A',
        dark: '#C4432B',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#2A9D8F',
        light: '#52C4B8',
        dark: '#1F7A6E',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#D32F2F',
        light: '#EF5350',
        dark: '#C62828',
      },
      warning: {
        main: '#E9A23B',
        light: '#F0B962',
        dark: '#C78820',
      },
      success: {
        main: '#2A9D8F',
        light: '#52C4B8',
        dark: '#1F7A6E',
      },
      background: {
        default: mode === 'dark' ? '#000000' : '#F0F0F0',
        paper: mode === 'dark' ? '#0A0A0A' : '#FAFAFA',
      },
      text: {
        primary: mode === 'dark' ? '#E0E0E0' : '#1A1A1A',
        secondary: mode === 'dark' ? '#888888' : '#666666',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: '"IBM Plex Sans", "Noto Sans", "Inter", "Roboto", sans-serif',
      h1: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h3: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      h4: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      h5: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 600,
      },
      h6: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 600,
      },
      subtitle1: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 500,
      },
      subtitle2: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 500,
      },
      body1: {
        fontFamily: '"IBM Plex Sans", "Noto Sans", sans-serif',
        lineHeight: 1.7,
        letterSpacing: '0.01em',
      },
      body2: {
        fontFamily: '"IBM Plex Sans", "Noto Sans", sans-serif',
        lineHeight: 1.7,
        letterSpacing: '0.01em',
      },
      button: {
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: '0.02em',
      },
      caption: {
        fontFamily: '"IBM Plex Sans", sans-serif',
        letterSpacing: '0.03em',
      },
    },
    shape: {
      borderRadius: 10,
    },
    shadows: [
      'none',
      '0 1px 3px rgba(0, 0, 0, 0.06)',
      '0 2px 6px rgba(0, 0, 0, 0.08)',
      '0 4px 12px rgba(0, 0, 0, 0.1)',
      '0 8px 24px rgba(0, 0, 0, 0.12)',
      '0 12px 32px rgba(0, 0, 0, 0.14)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
      '0 16px 40px rgba(0, 0, 0, 0.16)',
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: mode === 'dark' ? '#333333 #000000' : '#CCCCCC #F0F0F0',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              backgroundColor: 'transparent',
              width: 6,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 6,
              backgroundColor: mode === 'dark' ? '#333333' : '#CCCCCC',
              minHeight: 24,
            },
            '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
              backgroundColor: mode === 'dark' ? '#555555' : '#AAAAAA',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
          contained: {
            boxShadow: '0 2px 8px rgba(232, 87, 58, 0.25)',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(232, 87, 58, 0.35)',
            },
          },
          outlined: {
            borderWidth: 1.5,
            '&:hover': {
              borderWidth: 1.5,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: '1px solid',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              transition: 'all 0.2s ease-in-out',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#E8573A',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#E8573A',
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: '0.75rem',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            border: '1px solid',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 6,
            fontSize: '0.75rem',
            backgroundColor: mode === 'dark' ? '#222222' : '#1A1A1A',
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
