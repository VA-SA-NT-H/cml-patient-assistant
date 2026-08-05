import { useState } from 'react';
import { Box, TextField, IconButton, Paper, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useTheme } from '../theme/ThemeProvider';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const { mode } = useTheme();

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = message.trim().length > 0;

  return (
    <Box
      sx={{
        px: 3,
        pb: 2.5,
        pt: 1,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          p: 0.75,
          borderRadius: 3,
          border: '1.5px solid',
          borderColor: 'divider',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          bgcolor: 'background.paper',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: mode === 'dark'
              ? '0 0 0 3px rgba(232, 87, 58, 0.12), 0 4px 16px rgba(232, 87, 58, 0.08)'
              : '0 0 0 3px rgba(232, 87, 58, 0.08), 0 4px 16px rgba(232, 87, 58, 0.05)',
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Ask about CML, medications, side effects..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          variant="standard"
          aria-label="Chat message input"
          slotProps={{
            input: {
              disableUnderline: true,
            },
          }}
          sx={{
            '& .MuiInputBase-root': {
              p: 1,
              fontSize: '0.9rem',
            },
            '& .MuiInputBase-input::placeholder': {
              opacity: 0.45,
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!hasContent || disabled}
          aria-label="Send message"
          sx={{
            ml: 0.5,
            width: 40,
            height: 40,
            borderRadius: 2,
            background: hasContent
              ? 'linear-gradient(135deg, #E8573A 0%, #C4432B 100%)'
              : 'transparent',
            color: hasContent ? 'white' : 'text.secondary',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              background: hasContent
                ? 'linear-gradient(135deg, #C4432B 0%, #E8573A 100%)'
                : 'transparent',
              transform: hasContent ? 'scale(1.05)' : 'none',
            },
            '&:disabled': {
              background: 'transparent',
              color: 'text.secondary',
            },
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Paper>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          mt: 0.75,
          color: 'text.secondary',
          opacity: 0.5,
          fontSize: '0.65rem',
        }}
      >
        Enter to send · Shift+Enter for new line
      </Typography>
    </Box>
  );
};
