import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { apiClient } from '../api';
import { formatDate } from '../utils/formatDate';

interface LabResult {
  id: number;
  test_type: string;
  value: string;
  unit: string;
  test_date: string;
  notes: string | null;
}

export const OtherResults = () => {
  const [results, setResults] = useState<LabResult[]>([]);

  useEffect(() => {
    fetchOtherResults();
  }, []);

  const fetchOtherResults = async () => {
    try {
      const response = await apiClient.get('/api/lab-results');
      const data = await response.json();
      const otherResults = data.filter((r: LabResult) =>
        !['bcr_abl1', 'cbc_wbc', 'cbc_platelets', 'cbc_hemoglobin'].includes(r.test_type)
      );
      setResults(otherResults);
    } catch (error) {
      console.error('Failed to fetch other results:', error);
    }
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          mb: 1.5,
        }}
      >
        Other results
      </Typography>
      <Card elevation={0}>
        <CardContent sx={{ p: 2.5 }}>
          {results.map((r) => (
            <Box
              key={r.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <ScienceIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {r.test_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(r.test_date)}
                  {r.notes && ` — ${r.notes}`}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {r.value} {r.unit}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};
