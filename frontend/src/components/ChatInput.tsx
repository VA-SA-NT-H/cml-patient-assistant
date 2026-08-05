import { useState, KeyboardEvent } from 'react';
import { Box, TextField, IconButton, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderRadius: '24px',
          border: 1,
          borderColor: 'divider',
          '&:focus-within': {
            borderColor: 'primary.main',
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Message CML Assistant..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          variant="standard"
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            '& .MuiInputBase-root': {
              p: 1,
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          sx={{ ml: 1 }}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
};