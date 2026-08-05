import { Box, Typography } from '@mui/material';

interface Props {
  testType: string;
}

export const LabResultsChart = ({ testType }: Props) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Typography color="text.secondary">Chart placeholder for {testType}</Typography>
    </Box>
  );
};