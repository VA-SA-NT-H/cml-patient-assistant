import { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTheme } from '../theme/ThemeProvider';
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

const CORE_TYPES = [
  { key: 'bcr_abl1', label: 'BCR-ABL1', unit: '%' },
  { key: 'cbc_wbc', label: 'WBC', unit: 'K/µL' },
  { key: 'cbc_platelets', label: 'Platelets', unit: 'K/µL' },
  { key: 'cbc_hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
  { key: 'blast_percentage', label: 'Blast %', unit: '%' },
  { key: 'cbc_rbc', label: 'RBC', unit: 'M/µL' },
  { key: 'basophils', label: 'Basophils', unit: '%' },
  { key: 'eosinophils', label: 'Eosinophils', unit: '%' },
];

const STATUS_ORDER = { 'Good': 0, 'Watch': 1, 'Concern': 2 };

const getStatusForTest = (testType: string, value: string): { text: string; color: string } | null => {
  const val = parseFloat(value.replace('%', '').trim());
  if (isNaN(val)) return null;

  if (testType === 'bcr_abl1') {
    if (val <= 0.1) return { text: 'Good', color: '#2A9D8F' };
    if (val <= 1) return { text: 'Watch', color: '#E9A23B' };
    return { text: 'Concern', color: '#D32F2F' };
  }
  if (testType === 'cbc_wbc') {
    if (val >= 4.5 && val <= 11.0) return { text: 'Good', color: '#2A9D8F' };
    if (val >= 3.0 && val <= 15.0) return { text: 'Watch', color: '#E9A23B' };
    return { text: 'Concern', color: '#D32F2F' };
  }
  if (testType === 'cbc_platelets') {
    if (val >= 150 && val <= 400) return { text: 'Good', color: '#2A9D8F' };
    if (val >= 100 && val <= 500) return { text: 'Watch', color: '#E9A23B' };
    return { text: 'Concern', color: '#D32F2F' };
  }
  if (testType === 'cbc_hemoglobin') {
    if (val >= 12.0 && val <= 17.0) return { text: 'Good', color: '#2A9D8F' };
    if (val >= 10.0 && val <= 19.0) return { text: 'Watch', color: '#E9A23B' };
    return { text: 'Concern', color: '#D32F2F' };
  }
  return null;
};

const getOverallStatus = (results: Record<string, { value: string }>): { text: string; color: string } | null => {
  let worst: 'Good' | 'Watch' | 'Concern' | null = null;

  for (const [testType, r] of Object.entries(results)) {
    const status = getStatusForTest(testType, r.value);
    if (!status) continue;
    if (worst === null || STATUS_ORDER[status.text as keyof typeof STATUS_ORDER] > STATUS_ORDER[worst]) {
      worst = status.text as 'Good' | 'Watch' | 'Concern';
    }
  }

  if (!worst) return null;
  if (worst === 'Good') return { text: 'Good', color: '#2A9D8F' };
  if (worst === 'Watch') return { text: 'Watch', color: '#E9A23B' };
  return { text: 'Concern', color: '#D32F2F' };
};

interface Props {
  refreshKey?: number;
  onRefresh?: () => void;
  data: LabResult[];
}

export const LabSummaryTable = ({ onRefresh, data }: Props) => {
  const { mode } = useTheme();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editResults, setEditResults] = useState<{ id: number | null; test_type: string; value: string; unit: string }[]>([]);
  const [deleteDate, setDeleteDate] = useState<string>('');
  const [deleteResults, setDeleteResults] = useState<Record<string, { id: number }>>({});
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (date: string, results: Record<string, { id: number; value: string; unit: string }>) => {
    setSelectedDate(date);
    const allResults = Object.entries(results).map(([testType, r]) => ({
      id: r.id,
      test_type: testType,
      value: r.value,
      unit: r.unit,
    }));
    setEditResults(allResults);
    setEditOpen(true);
  };

  const updateEditValue = (index: number, value: string) => {
    const updated = [...editResults];
    updated[index].value = value;
    setEditResults(updated);
  };

  const addNewTestToEdit = (testType: string) => {
    const preset = CORE_TYPES.find(c => c.key === testType);
    if (!preset) return;
    if (editResults.some(r => r.test_type === testType)) return;
    setEditResults([...editResults, { id: null, test_type: preset.key, value: '', unit: preset.unit }]);
  };

  const removeTestFromEdit = (index: number) => {
    setEditResults(editResults.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    try {
      for (const r of editResults) {
        if (!r.value) continue;
        if (r.id) {
          // Update existing
          await apiClient.put(`/api/lab-results/${r.id}`, {
            value: r.value,
            test_date: selectedDate,
          });
        } else {
          // Create new
          await apiClient.post('/api/lab-results', {
            test_type: r.test_type,
            value: r.value,
            unit: r.unit,
            test_date: selectedDate,
          });
        }
      }
      setEditOpen(false);
      setSelectedDate('');
      setEditResults([]);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const handleDeleteDate = (date: string, results: Record<string, { id: number }>) => {
    setDeleteDate(date);
    setDeleteResults(results);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      for (const r of Object.values(deleteResults)) {
        await apiClient.delete(`/api/lab-results/${r.id}`);
      }
      setDeleteOpen(false);
      setDeleteDate('');
      setDeleteResults({});
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (data.length === 0) return null;

  // Collect all test types present in data
  const allTypes = new Set(data.map(r => r.test_type));
  const extraTypes = Array.from(allTypes).filter(
    t => !CORE_TYPES.some(c => c.key === t)
  );
  const columnTypes = [...CORE_TYPES, ...extraTypes.map(t => ({ key: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), unit: '' }))];

  // Group by date
  const dateMap = new Map<string, Record<string, { id: number; value: string; unit: string }>>();
  for (const r of data) {
    const existing = dateMap.get(r.test_date);
    if (existing) {
      existing[r.test_type] = { id: r.id, value: r.value, unit: r.unit };
    } else {
      dateMap.set(r.test_date, { [r.test_type]: { id: r.id, value: r.value, unit: r.unit } });
    }
  }

  const rows = Array.from(dateMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]));

  const availableTestsForEdit = CORE_TYPES.filter(
    p => !editResults.some(r => r.test_type === p.key)
  );

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          mb: 1.5,
        }}
      >
        Lab results overview
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 600,
            '& th, & td': {
              py: 1,
              px: 1.5,
              textAlign: 'left',
              fontSize: '0.8rem',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& th': {
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            },
            '& td': {
              fontFamily: '"JetBrains Mono", monospace',
            },
            '& tr:last-child td': {
              borderBottom: 'none',
            },
            '& tr:hover td': {
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            },
          }}
        >
          <Box component="thead">
            <Box component="tr">
              <Box component="th">Date</Box>
              {columnTypes.map(t => (
                <Box component="th" key={t.key}>{t.label}</Box>
              ))}
              <Box component="th">Status</Box>
              <Box component="th" sx={{ textAlign: 'right' }}>Actions</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map(([date, results], i) => {
              const status = getOverallStatus(results);
              return (
                <Box component="tr" key={i}>
                  <Box component="td" sx={{ fontFamily: '"IBM Plex Sans", sans-serif', whiteSpace: 'nowrap' }}>
                    {formatDate(date)}
                  </Box>
                  {columnTypes.map(t => {
                    const r = results[t.key];
                    return (
                      <Box component="td" key={t.key}>
                        {r ? (
                          <>
                            {r.value}
                            {r.unit && <span style={{ opacity: 0.5, fontSize: '0.6rem', marginLeft: 2 }}>{r.unit}</span>}
                          </>
                        ) : '—'}
                      </Box>
                    );
                  })}
                  <Box component="td">
                    {status ? (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 0.5,
                          py: 0.15,
                          borderRadius: 0.5,
                          bgcolor: mode === 'dark' ? `${status.color}22` : `${status.color}11`,
                          color: status.color,
                          fontSize: '0.65rem',
                          fontWeight: 500,
                        }}
                      >
                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: status.color }} />
                        {status.text}
                      </Box>
                    ) : '—'}
                  </Box>
                  <Box component="td" sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Edit all">
                      <IconButton size="small" onClick={() => handleEdit(date, results)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete all">
                      <IconButton size="small" onClick={() => handleDeleteDate(date, results)} sx={{ color: 'text.secondary' }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Edit Dialog - All results for this date */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit results — {formatDate(selectedDate)}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {editResults.map((r, i) => {
              const preset = CORE_TYPES.find(c => c.key === r.test_type);
              return (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label={preset?.label || r.test_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    type="number"
                    value={r.value}
                    onChange={(e) => updateEditValue(i, e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    InputProps={{
                      endAdornment: (
                        <Typography variant="caption" color="text.secondary">
                          {r.unit || preset?.unit || ''}
                        </Typography>
                      ),
                    }}
                  />
                  <IconButton size="small" onClick={() => removeTestFromEdit(i)}>
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              );
            })}

            {availableTestsForEdit.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {availableTestsForEdit.map(p => (
                  <Button
                    key={p.key}
                    size="small"
                    variant="outlined"
                    onClick={() => addNewTestToEdit(p.key)}
                    startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                    sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.25 }}
                  >
                    {p.label}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save all</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
        <DialogTitle>Delete results</DialogTitle>
        <DialogContent>
          <Typography>
            Delete all {Object.keys(deleteResults).length} result{Object.keys(deleteResults).length !== 1 ? 's' : ''} from {formatDate(deleteDate)}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
