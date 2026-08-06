import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button, CircularProgress, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ScienceIcon from '@mui/icons-material/Science';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { LabResultsChart } from '../components/LabResultsChart';
import { CBCResults } from '../components/CBCResults';
import { TreatmentTimeline } from '../components/TreatmentTimeline';
import { MilestoneCards } from '../components/MilestoneCards';
import { WarningBanner } from '../components/WarningBanner';
import { DataEntryDialog } from '../components/DataEntryDialog';
import { TreatmentEntryDialog } from '../components/TreatmentEntryDialog';
import { FileUploadDialog } from '../components/FileUploadDialog';
import { OtherResults } from '../components/OtherResults';
import { LabResultsTable } from '../components/LabResultsTable';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api';

interface DashboardData {
  latest_values: Record<string, { value: string; unit: string; test_date: string }>;
  current_treatment: { drug_name: string; dosage_mg: number; start_date: string } | null;
  warnings: { severity: string; condition: string; message: string }[];
  milestones: { milestone_type: string; achieved: boolean; achieved_date: string | null }[];
  total_results: number;
}

interface DashboardProps {
  refreshKey?: number;
}

export const Dashboard = ({ refreshKey = 0 }: DashboardProps) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryOpen, setEntryOpen] = useState(false);
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { mode } = useTheme();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/dashboard');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, refreshKey]);

  const handleReset = async () => {
    try {
      setResetting(true);
      await apiClient.delete('/api/reset');
      setResetDialogOpen(false);
      await fetchDashboard();
    } catch (error) {
      console.error('Failed to reset dashboard:', error);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={32} sx={{ color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Loading your data...
        </Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <ScienceIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
        <Typography color="text.secondary" variant="body2">
          Could not load your lab data
        </Typography>
        <Button variant="outlined" size="small" onClick={fetchDashboard}>
          Try again
        </Button>
      </Box>
    );
  }

  const latestBCR = data.latest_values?.bcr_abl1;
  const bcrAchieved = latestBCR ? parseFloat(latestBCR.value) <= 0.1 : false;

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }} className="stagger-in">
      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              mb: 0.5,
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your treatment snapshot — updated as you log results
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <Tooltip title="Refresh data">
            <IconButton
              onClick={fetchDashboard}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete all records">
            <IconButton
              onClick={() => setResetDialogOpen(true)}
              size="small"
              color="error"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { borderColor: 'error.main' },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setEntryOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #E8573A 0%, #C4432B 100%)',
              boxShadow: '0 2px 8px rgba(232, 87, 58, 0.25)',
            }}
          >
            Add result
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<MedicalServicesIcon sx={{ fontSize: 16 }} />}
            onClick={() => setTreatmentOpen(true)}
          >
            Add treatment
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
            onClick={() => setUploadOpen(true)}
          >
            Upload
          </Button>
        </Box>
      </Box>

      {/* ── Warnings ── */}
      {data.warnings.length > 0 && <WarningBanner warnings={data.warnings} />}

      {/* ── Thesis: BCR-ABL1 ── */}
      <Card
        elevation={0}
        sx={{
          mb: 4,
          overflow: 'visible',
          background: mode === 'dark'
            ? 'linear-gradient(135deg, rgba(232, 87, 58, 0.06) 0%, rgba(42, 157, 143, 0.04) 100%)'
            : 'linear-gradient(135deg, rgba(232, 87, 58, 0.04) 0%, rgba(42, 157, 143, 0.02) 100%)',
          border: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(232, 87, 58, 0.12)' : 'rgba(232, 87, 58, 0.1)',
        }}
      >
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                  fontSize: '0.6rem',
                }}
              >
                BCR-ABL1 International Scale
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
                <Typography
                  className="gradient-text"
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '3rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {latestBCR ? latestBCR.value : '—'}
                </Typography>
                {latestBCR && (
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {latestBCR.unit}
                  </Typography>
                )}
              </Box>
            </Box>

            {latestBCR && (
              <Box sx={{ textAlign: 'right' }}>
                <Chip
                  size="small"
                  icon={bcrAchieved ? <TrendingDownIcon sx={{ fontSize: 14 }} /> : <TrendingUpIcon sx={{ fontSize: 14 }} />}
                  label={bcrAchieved ? 'Major molecular response' : 'Above MMR threshold'}
                  color={bcrAchieved ? 'success' : 'warning'}
                  sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Last tested: {latestBCR.test_date}
                </Typography>
              </Box>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, lineHeight: 1.6 }}>
            {bcrAchieved
              ? 'Your BCR-ABL1 level is within the major molecular response range (≤ 0.1%). This is a strong indicator that your treatment is working effectively.'
              : latestBCR
              ? 'Your BCR-ABL1 is above the MMR threshold (≤ 0.1%). Continue following your treatment plan and discuss results with your doctor.'
              : 'Add a lab result to see your BCR-ABL1 trend and response assessment.'}
          </Typography>
        </CardContent>
      </Card>

      {/* ── BCR-ABL1 Trend ── */}
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          mb: 1.5,
        }}
      >
        BCR-ABL1 trend
      </Typography>
      <Box sx={{ mb: 4 }}>
        <LabResultsChart testType="bcr_abl1" />
      </Box>

      {/* ── Blood Counts ── */}
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          mb: 2,
        }}
      >
        Blood counts
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
        <Card elevation={0}>
          <CardContent sx={{ p: 2.5 }}>
            <CBCResults testType="cbc_wbc" title="White Blood Cells" unit="K/µL" />
          </CardContent>
        </Card>
        <Card elevation={0}>
          <CardContent sx={{ p: 2.5 }}>
            <CBCResults testType="cbc_platelets" title="Platelets" unit="K/µL" />
          </CardContent>
        </Card>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Card elevation={0}>
          <CardContent sx={{ p: 2.5 }}>
            <CBCResults testType="cbc_hemoglobin" title="Hemoglobin" unit="g/dL" />
          </CardContent>
        </Card>
      </Box>

      {/* ── Treatment History ── */}
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          mb: 1.5,
        }}
      >
        Treatment history
      </Typography>
      <Box sx={{ mb: 4 }}>
        <TreatmentTimeline />
      </Box>

      {/* ── Achievements ── */}
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          mb: 1.5,
        }}
      >
        Milestones
      </Typography>
      <MilestoneCards milestones={data.milestones} />

      {/* ── Other Results ── */}
      <OtherResults />

      {/* ── All Lab Results ── */}
      <LabResultsTable refreshKey={refreshKey} onRefresh={fetchDashboard} />

      {/* ── Disclaimer ── */}
      <Box
        sx={{
          mt: 5,
          pt: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, opacity: 0.6 }}>
          This tool is for informational support only and does not replace professional
          medical advice. Always consult your healthcare provider before making changes
          to your treatment.
        </Typography>
      </Box>

      {/* ── Reset Dialog ── */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
          Delete all records?
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            This will permanently delete all your lab results, treatments, and milestone data.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setResetDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            color="error"
            variant="contained"
            disabled={resetting}
            startIcon={resetting ? <CircularProgress size={16} /> : <DeleteOutlineIcon />}
          >
            {resetting ? 'Deleting...' : 'Delete everything'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialogs ── */}
      <DataEntryDialog open={entryOpen} onClose={() => setEntryOpen(false)} onSaved={fetchDashboard} />
      <TreatmentEntryDialog open={treatmentOpen} onClose={() => setTreatmentOpen(false)} onSaved={fetchDashboard} />
      <FileUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={fetchDashboard} />
    </Box>
  );
};
