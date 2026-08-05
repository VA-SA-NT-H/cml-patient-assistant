import { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { Box, Typography } from '@mui/material';

interface LabResult {
  value: string;
  test_date: string;
}

interface Props {
  testType: string;
  title: string;
}

export const CBCChart = ({ testType, title }: Props) => {
  const [data, setData] = useState<LabResult[]>([]);

  useEffect(() => { fetchData(); }, [testType]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/lab-results?test_type=${testType}`);
      const results = await response.json();
      setData(results);
    } catch (error) {
      console.error('Failed to fetch CBC data:', error);
    }
  };

  if (data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">No {title} data yet.</Typography>
      </Box>
    );
  }

  const xLabels = data.map(d => d.test_date);
  const values = data.map(d => parseFloat(d.value));

  return (
    <LineChart
      xAxis={[{ data: xLabels, scaleType: 'point' }]}
      series={[{
        data: values,
        label: title,
        color: '#7c3aed',
      }]}
      height={250}
      margin={{ left: 50, right: 20, top: 10, bottom: 30 }}
    />
  );
};