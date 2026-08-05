import { Box, Typography, Paper, Avatar } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { useTheme } from '../theme/ThemeProvider';
import ReactMarkdown from 'react-markdown';

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
        justifyContent: 'flex-start',
        mb: 3,
        px: 3,
        gap: 1.5,
        flexDirection: isUser ? 'row-reverse' : 'row',
        animation: 'fadeInUp 0.35s ease-out both',
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          mt: 0.5,
          flexShrink: 0,
          bgcolor: isUser
            ? 'linear-gradient(135deg, #E8573A 0%, #C4432B 100%)'
            : 'linear-gradient(135deg, #2A9D8F 0%, #1F7A6E 100%)',
          boxShadow: isUser
            ? '0 2px 6px rgba(232, 87, 58, 0.25)'
            : '0 2px 6px rgba(42, 157, 143, 0.25)',
        }}
      >
        {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <SmartToyIcon sx={{ fontSize: 18 }} />}
      </Avatar>

      {/* Message */}
      <Box
        sx={{
          maxWidth: '72%',
          minWidth: 0,
        }}
      >
        {/* Label */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.5,
            fontWeight: 500,
            color: isUser ? 'primary.main' : 'secondary.main',
            fontSize: '0.65rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {isUser ? 'You' : 'Assistant'}
        </Typography>

        {/* Bubble */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: isUser
              ? '16px 4px 16px 16px'
              : '4px 16px 16px 16px',
            bgcolor: isUser
              ? mode === 'dark'
                ? 'linear-gradient(135deg, #E8573A 0%, #D44E35 100%)'
                : '#F5F5F5'
              : mode === 'dark'
              ? '#1A1A1A'
              : '#FFFFFF',
            color: isUser
              ? mode === 'dark'
                ? '#FFFFFF'
                : '#1A1A1A'
              : mode === 'dark'
              ? '#E0E0E0'
              : '#1A1A1A',
            border: isUser
              ? mode === 'dark'
                ? 'none'
                : '1px solid rgba(0, 0, 0, 0.08)'
              : '1px solid',
            borderColor: mode === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.08)',
            boxShadow: isUser
              ? mode === 'dark'
                ? '0 2px 12px rgba(232, 87, 58, 0.2)'
                : '0 1px 4px rgba(0, 0, 0, 0.08)'
              : mode === 'dark'
              ? '0 1px 4px rgba(0, 0, 0, 0.2)'
              : '0 1px 4px rgba(0, 0, 0, 0.08)',
            lineHeight: 1.7,
          }}
        >
          {isUser ? (
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.875rem',
                lineHeight: 1.7,
                color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A',
              }}
            >
              {content}
            </Typography>
          ) : (
            <Box
              className="markdown-content"
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.7,
                color: mode === 'dark' ? '#E0E0E0' : '#1A1A1A',
                '& p': { m: '0 0 0.75em' },
                '& p:last-child': { m: 0 },
                '& ul, & ol': { m: '0 0 0.75em', pl: 2.5 },
                '& li': { mb: 0.5 },
                '& li:last-child': { mb: 0 },
                '& strong': { fontWeight: 600 },
                '& em': { fontStyle: 'italic' },
                '& code': {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85em',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
                '& a': {
                  color: 'primary.main',
                  textDecoration: 'none',
                  borderBottom: '1px solid',
                  borderColor: 'primary.main',
                  '&:hover': { opacity: 0.8 },
                },
              }}
            >
              <ReactMarkdown>{content}</ReactMarkdown>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};
