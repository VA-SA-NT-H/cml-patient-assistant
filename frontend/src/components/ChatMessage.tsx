import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '../theme/ThemeProvider';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const { mode } = useTheme();
  const isUser = role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          maxWidth: '70%',
          borderRadius: '16px',
          bgcolor: isUser 
            ? 'primary.main' 
            : mode === 'dark' ? 'grey.900' : 'grey.100',
          color: isUser ? 'white' : 'text.primary',
        }}
      >
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </Typography>
      </Paper>
    </Box>
  );
};