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
    <Box sx={{ mb: 2 }}>
      {visible.map(w => (
        <Alert
          key={w.condition}
          severity={w.severity as 'error' | 'warning' | 'info'}
          sx={{ mb: 1 }}
          action={
            <IconButton size="small" onClick={() => setDismissed(prev => new Set(prev).add(w.condition))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          <AlertTitle>
            {w.severity === 'critical' ? 'Urgent' : w.severity === 'high' ? 'Warning' : 'Notice'}
          </AlertTitle>
          {w.message}
        </Alert>
      ))}
    </Box>
  );
};