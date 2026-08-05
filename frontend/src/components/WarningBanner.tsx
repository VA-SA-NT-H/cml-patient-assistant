import { useState } from 'react';
import { Alert, AlertTitle, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface Warning {
  severity: string;
  condition: string;
  message: string;
}

interface Props {
  warnings: Warning[];
}

export const WarningBanner = ({ warnings }: Props) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = warnings.filter(w => !dismissed.has(w.condition));

  if (visible.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      {visible.map(w => (
        <Alert
          key={w.condition}
          severity={w.severity as 'error' | 'warning' | 'info'}
          sx={{
            mb: 1,
            border: '1px solid',
            borderColor:
              w.severity === 'error'
                ? 'rgba(211, 47, 47, 0.2)'
                : w.severity === 'warning'
                ? 'rgba(233, 162, 59, 0.2)'
                : 'rgba(42, 157, 143, 0.2)',
          }}
          action={
            <IconButton
              size="small"
              onClick={() => setDismissed(prev => new Set(prev).add(w.condition))}
              aria-label="Dismiss warning"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          <AlertTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
            {w.severity === 'critical' ? 'Urgent' : w.severity === 'high' ? 'Warning' : 'Notice'}
          </AlertTitle>
          {w.message}
        </Alert>
      ))}
    </Box>
  );
};
