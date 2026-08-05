import { Box, Card, CardContent, Typography } from '@mui/material';

interface Milestone {
  milestone_type: string;
  achieved: boolean;
  achieved_date: string | null;
}

interface Props {
  milestones: Milestone[];
}

export const MilestoneCards = ({ milestones }: Props) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
      {milestones.map(m => (
        <Card key={m.milestone_type} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6">{m.milestone_type}</Typography>
            <Typography variant="caption" color="text.secondary">
              {m.achieved ? 'Achieved' : 'Not achieved'}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};