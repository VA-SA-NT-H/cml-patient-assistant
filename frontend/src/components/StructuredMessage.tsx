import { Box, Typography, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Block {
  type: 'explanation' | 'key_points' | 'steps' | 'table' | 'warning' | 'sources';
  title?: string;
  content: string | string[] | { headers: string[]; rows: string[][] };
}

interface StructuredMessageProps {
  blocks: Block[];
  summary?: string;
  safety_note?: string | null;
  sources?: string[];
  urgency?: 'routine' | 'attention_urgent' | 'attention_emergency';
}

export const StructuredMessage = ({
  blocks,
  summary,
  safety_note,
  sources,
  urgency = 'routine',
}: StructuredMessageProps) => {

  const urgencyBorderColor = urgency === 'attention_emergency'
    ? '#D32F2F'
    : urgency === 'attention_urgent'
    ? '#E9A23B'
    : 'transparent';

  const renderBlock = (block: Block, index: number) => {
    switch (block.type) {
      case 'explanation':
        return (
          <Box key={index} sx={{ mb: 1.5 }}>
            {block.title && (
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {block.title}
              </Typography>
            )}
            <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {block.content as string}
            </Typography>
          </Box>
        );

      case 'key_points':
        return (
          <Box key={index} sx={{ mb: 1.5 }}>
            {block.title && (
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {block.title}
              </Typography>
            )}
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {(block.content as string[]).map((item, i) => (
                <Box component="li" key={i} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'steps':
        return (
          <Box key={index} sx={{ mb: 1.5 }}>
            {block.title && (
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {block.title}
              </Typography>
            )}
            <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
              {(block.content as string[]).map((item, i) => (
                <Box component="li" key={i} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'table': {
        const tableContent = block.content as { headers: string[]; rows: string[][] };
        return (
          <Box key={index} sx={{ mb: 1.5 }}>
            {block.title && (
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {block.title}
              </Typography>
            )}
            <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {tableContent.headers.map((h, i) => (
                      <TableCell key={i} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableContent.rows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell key={j} sx={{ fontSize: '0.8rem' }}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      }

      case 'warning':
        return (
          <Alert
            key={index}
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{ mb: 1.5, fontSize: '0.85rem' }}
          >
            {block.title && (
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {block.title}
              </Typography>
            )}
            {block.content as string}
          </Alert>
        );

      case 'sources':
        return (
          <Box key={index} sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            {(block.content as string[]).map((source, i) => (
              <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.6 }}>
                {source}
              </Typography>
            ))}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        borderLeft: urgencyBorderColor !== 'transparent' ? `3px solid ${urgencyBorderColor}` : 'none',
        pl: urgencyBorderColor !== 'transparent' ? 1.5 : 0,
      }}
    >
      {/* Summary */}
      {summary && (
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, lineHeight: 1.5 }}>
          {summary}
        </Typography>
      )}

      {/* Blocks */}
      {blocks.map((block, index) => renderBlock(block, index))}

      {/* Safety Note */}
      {safety_note && (
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon />}
          sx={{ mt: 1.5, fontSize: '0.85rem' }}
        >
          {safety_note}
        </Alert>
      )}

      {/* Sources (if not already in blocks) */}
      {sources && sources.length > 0 && !blocks.some(b => b.type === 'sources') && (
        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {sources.map((source, i) => (
            <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.6 }}>
              {source}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};
