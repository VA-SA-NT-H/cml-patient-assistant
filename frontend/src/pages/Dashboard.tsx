import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button } from '@mui/material';
import { LabResultsChart } from '../components/LabResultsChart';
import { CBCChart } from '../components/CBCChart';
import { TreatmentTimeline } from '../components/TreatmentTimeline';
import { MilestoneCards } from '../components/MilestoneCards';
import { WarningBanner } from '../components/WarningBanner';
import { DataEntryDialog } from '../components/DataEntryDialog';
import { FileUploadDialog } from '../components/FileUploadDialog';

interface DashboardData {
  latest_values: Record<string, { value: string; unit: string; test_date: string }>;
  current_treatment: { drug_name: string; dosage_mg: number; start_date: string } | null;
  warnings: { severity: string; condition: string; message: string }[];
  milestones: { milestone_type: string; achieved: boolean; achieved_date: string | null }[];
  total_results: number;
}

export const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryOpen, setEntryOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/dashboard');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Loading dashboard...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Failed to load dashboard data</Typography>
      </Box>
    );
  }

  const latestBCR = data.latest_values?.bcr_abl1;
  const latestWBC = data.latest_values?.cbc_wbc;

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>
      
      <Button variant="contained" onClick={() => setEntryOpen(true)} sx={{ mb: 2 }}>
        Add Lab Result
      </Button>
      <Button variant="outlined" onClick={() => setUploadOpen(true)} sx={{ mb: 2, ml: 1 }}>
        Upload Lab Report
      </Button>

      {data.warnings.length > 0 && <WarningBanner warnings={data.warnings} />}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">BCR-ABL1</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {latestBCR ? `${latestBCR.value}${latestBCR.unit}` : 'No data'}
            </Typography>
            {latestBCR && (
              <Chip
                size="small"
                label={parseFloat(latestBCR.value) <= 0.1 ? 'MMR Achieved' : 'Above MMR'}
                color={parseFloat(latestBCR.value) <= 0.1 ? 'success' : 'warning'}
                sx={{ mt: 1 }}
              />
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">WBC</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {latestWBC ? `${latestWBC.value} ${latestWBC.unit}` : 'No data'}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Current TKI</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {data.current_treatment
                ? `${data.current_treatment.drug_name} ${data.current_treatment.dosage_mg}mg`
                : 'No treatment recorded'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>BCR-ABL1 Trend</Typography>
      <Box sx={{ height: 300, mb: 3 }}>
        <LabResultsChart testType="bcr_abl1" />
      </Box>

      <Typography variant="h6" gutterBottom>CBC Trends</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
        <Box sx={{ height: 250 }}>
          <CBCChart testType="cbc_wbc" title="White Blood Cells" />
        </Box>
        <Box sx={{ height: 250 }}>
          <CBCChart testType="cbc_platelets" title="Platelets" />
        </Box>
      </Box>

      <Typography variant="h6" gutterBottom>Treatment History</Typography>
      <TreatmentTimeline />

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Achievements</Typography>
      <MilestoneCards milestones={data.milestones} />

      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          This app is for informational and tracking support only and does not replace professional medical diagnosis, advice, or treatment.
        </Typography>
      </Box>

      <DataEntryDialog open={entryOpen} onClose={() => setEntryOpen(false)} onSaved={fetchDashboard} />
      <FileUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={fetchDashboard} />
    </Box>
  );
};