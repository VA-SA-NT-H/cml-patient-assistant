import { useState, useEffect } from 'react';
import { Typography, Chip } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineDot, TimelineContent } from '@mui/lab';

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
    <Timeline position="left">
      {treatments.map((t, i) => (
        <TimelineItem key={t.id}>
          <TimelineSeparator>
            <TimelineDot color={t.end_date === null ? 'primary' : 'grey'} />
            {i < treatments.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t.drug_name} {t.dosage_mg}mg
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t.start_date} — {t.end_date || 'present'}
            </Typography>
            {t.end_date === null && (
              <Chip size="small" label="Current" color="primary" sx={{ ml: 1 }} />
            )}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};