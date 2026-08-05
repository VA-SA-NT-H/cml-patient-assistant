import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

interface Treatment {
  id: number;
  drug_name: string;
  dosage_mg: number;
  start_date: string;
  end_date: string | null;
}

export const TreatmentTimeline = () => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  useEffect(() => { fetchTreatments(); }, []);

  const fetchTreatments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/treatments');
      const data = await response.json();
      setTreatments(data);
    } catch (error) {
      console.error('Failed to fetch treatments:', error);
    }
  };

  if (treatments.length === 0) {
    return <Typography color="text.secondary">No treatment history recorded.</Typography>;
  }

  return (
    <Box>
      {treatments.map(t => (
        <Box key={t.id} sx={{ mb: 1 }}>
          <Typography variant="subtitle2">{t.drug_name} {t.dosage_mg}mg</Typography>
          <Typography variant="caption" color="text.secondary">
            {t.start_date} — {t.end_date || 'present'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};