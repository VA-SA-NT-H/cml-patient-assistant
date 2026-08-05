import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTheme } from '../theme/ThemeProvider';

export const ThemeToggle = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        onClick={toggleTheme}
        aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1.5,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: 'action.hover',
            transform: 'rotate(20deg)',
          },
        }}
      >
        {mode === 'dark' ? (
          <LightModeIcon sx={{ fontSize: 17, color: '#E9A23B' }} />
        ) : (
          <DarkModeIcon sx={{ fontSize: 17, color: '#1A1A1A' }} />
        )}
      </IconButton>
    </Tooltip>
  );
};
