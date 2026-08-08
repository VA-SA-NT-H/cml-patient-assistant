import { useState } from 'react';
import { Box, Typography, Paper, Avatar, IconButton, Tooltip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '../theme/ThemeProvider';
import ReactMarkdown from 'react-markdown';
import { StructuredMessage } from './StructuredMessage';

interface Block {
  type: 'explanation' | 'key_points' | 'steps' | 'table' | 'warning' | 'sources';
  title?: string;
  content: string | string[] | { headers: string[]; rows: string[][] };
}

interface ChatMessageProps {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  edited?: boolean;
  blocks?: Block[];
  summary?: string;
  safety_note?: string | null;
  sources?: string[];
  urgency?: 'routine' | 'attention_urgent' | 'attention_emergency';
  onCopy: (content: string) => void;
  onDelete?: (messageId: number) => void;
  disabled?: boolean;
}

export const ChatMessage = ({ 
  id, role, content, edited, blocks, summary, safety_note, sources, urgency,
  onCopy, onDelete, disabled 
}: ChatMessageProps) => {
  const { mode } = useTheme();
  const isUser = role === 'user';
  const hasBlocks = !isUser && blocks && blocks.length > 0;
  
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const handleCopy = () => {
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setDeleteConfirm(false); }}
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
            <>
              {edited && (
                <Typography variant="caption" sx={{ fontStyle: 'italic', opacity: 0.6, fontSize: '0.65rem', display: 'block', mb: 0.5 }}>
                  edited
                </Typography>
              )}
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
            </>
          ) : hasBlocks ? (
            <StructuredMessage
              blocks={blocks}
              summary={summary}
              safety_note={safety_note}
              sources={sources}
              urgency={urgency}
            />
          ) : content ? (
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
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Thinking...
            </Typography>
          )}
        </Paper>
        
        {/* Hover Actions - User Messages */}
        {isUser && isHovered && !disabled && id && (
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              mt: 0.5,
              justifyContent: 'flex-end',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <Tooltip title="Copy">
              <IconButton size="small" onClick={handleCopy} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => setDeleteConfirm(true)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            {deleteConfirm && (
              <>
                <Tooltip title="Confirm delete">
                  <IconButton size="small" onClick={() => onDelete?.(id)} sx={{ color: 'error.main' }}>
                    <CheckIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton size="small" onClick={() => setDeleteConfirm(false)} sx={{ color: 'text.secondary' }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        )}
        
        {/* Hover Actions - AI Replies */}
        {!isUser && isHovered && (
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              mt: 0.5,
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
              <IconButton size="small" onClick={handleCopy} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );
};
