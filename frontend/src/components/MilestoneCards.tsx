import { Box, Card, CardContent, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface Milestone {
  milestone_type: string;
  achieved: boolean;
  achieved_date: string | null;
}

interface Props {
  milestones: Milestone[];
}

const MILESTONE_LABELS: Record<string, { label: string; threshold: string }> = {
  ccyr: { label: 'CCyR', threshold: 'BCR-ABL1 ≤ 1%' },
  mmr: { label: 'MMR', threshold: 'BCR-ABL1 ≤ 0.1%' },
  mr4: { label: 'MR4', threshold: 'BCR-ABL1 ≤ 0.01%' },
  mr4_5: { label: 'MR4.5', threshold: 'BCR-ABL1 ≤ 0.0032%' },
  mrd_negative: { label: 'MRD Negative', threshold: 'Undetectable' },
};

const ALL_MILESTONES = ['ccyr', 'mmr', 'mr4', 'mr4_5'];

export const MilestoneCards = ({ milestones }: Props) => {
  const milestoneMap = Object.fromEntries(milestones.map(m => [m.milestone_type, m]));

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
      {ALL_MILESTONES.map(type => {
        const info = MILESTONE_LABELS[type];
        const m = milestoneMap[type];
        const achieved = m?.achieved ?? false;

        return (
          <Card
            key={type}
            elevation={0}
            sx={{
              border: 1,
              borderColor: achieved ? 'success.main' : 'divider',
              bgcolor: achieved ? 'success.light' : 'background.paper',
              opacity: achieved ? 1 : 0.6,
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              {achieved ? (
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              ) : (
                <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: 40 }} />
              )}
              <Typography variant="h6" sx={{ mt: 1 }}>{info.label}</Typography>
              <Typography variant="caption" color="text.secondary">{info.threshold}</Typography>
              {achieved && m?.achieved_date && (
                <Typography variant="caption" display="block" color="success.dark" sx={{ mt: 0.5 }}>
                  Achieved: {m.achieved_date}
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};