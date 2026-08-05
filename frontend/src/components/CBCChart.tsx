import { Box, Typography } from '@mui/material';

interface Props {
  testType: string;
  title: string;
}

export const CBCChart = ({ testType, title }: Props) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Typography color="text.secondary">{title} ({testType}) chart placeholder</Typography>
    </Box>
  );
};