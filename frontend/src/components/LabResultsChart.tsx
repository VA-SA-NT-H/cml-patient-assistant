import { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { Box, Typography } from '@mui/material';

interface LabResult {
  value: string;
  test_date: string;
}

interface Props {
  testType: string;
}

export const LabResultsChart = ({ testType }: Props) => {
  const [data, setData] = useState<LabResult[]>([]);

  useEffect(() => {
    fetchData();
  }, [testType]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/lab-results?test_type=${testType}`);
      const results = await response.json();
      setData(results);
    } catch (error) {
      console.error('Failed to fetch lab results:', error);
    }
  };

  if (data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">No BCR-ABL1 data yet. Add lab results to see trends.</Typography>
      </Box>
    );
  }

  const xLabels = data.map(d => d.test_date);
  const values = data.map(d => {
    const v = parseFloat(d.value);
    return v > 0 ? v : 0.001;
  });

  return (
    <LineChart
      xAxis={[{ data: xLabels, scaleType: 'point' }]}
      yAxis={[{
        scaleType: 'log',
        min: 0.001,
        max: 100,
        data: [0.001, 0.01, 0.1, 1, 10, 100],
      }]}
      series={[{
        data: values,
        label: 'BCR-ABL1 IS %',
        color: '#8b5cf6',
      }]}
      height={300}
      margin={{ left: 60, right: 20, top: 20, bottom: 30 }}
    />
  );
};