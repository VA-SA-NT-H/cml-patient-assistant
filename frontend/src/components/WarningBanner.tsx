import { Alert, AlertTitle, Box } from '@mui/material';

interface Warning {
  severity: string;
  condition: string;
  message: string;
}

interface Props {
  warnings: Warning[];
}

export const WarningBanner = ({ warnings }: Props) => {
  return (
    <Box sx={{ mb: 2 }}>
      {warnings.map(w => (
        <Alert key={w.condition} severity={w.severity as 'error' | 'warning' | 'info'} sx={{ mb: 1 }}>
          <AlertTitle>
            {w.severity === 'critical' ? 'Urgent' : w.severity === 'high' ? 'Warning' : 'Notice'}
          </AlertTitle>
          {w.message}
        </Alert>
      ))}
    </Box>
  );
};