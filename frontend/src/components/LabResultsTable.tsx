import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { apiClient } from '../api';

interface LabResult {
  id: number;
  test_type: string;
  value: string;
  unit: string;
  test_date: string;
  notes: string | null;
}

interface Props {
  refreshKey?: number;
  onRefresh?: () => void;
}

const TEST_TYPE_LABELS: Record<string, string> = {
  bcr_abl1: 'BCR-ABL1',
  cbc_wbc: 'WBC',
  cbc_platelets: 'Platelets',
  cbc_hemoglobin: 'Hemoglobin',
};

export const LabResultsTable = ({ refreshKey = 0, onRefresh }: Props) => {
  const [results, setResults] = useState<LabResult[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<LabResult | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => { fetchResults(); }, [refreshKey]);

  const fetchResults = async () => {
    try {
      const response = await apiClient.get('/api/lab-results');
      const data = await response.json();
      setResults(data.sort((a: LabResult, b: LabResult) => b.test_date.localeCompare(a.test_date)));
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const handleEdit = (result: LabResult) => {
    setSelected(result);
    setEditValue(result.value);
    setEditDate(result.test_date);
    setEditNotes(result.notes || '');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    try {
      await apiClient.put(`/api/lab-results/${selected.id}`, { value: editValue, test_date: editDate, notes: editNotes });
      setEditOpen(false);
      fetchResults();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await apiClient.delete(`/api/lab-results/${selected.id}`);
      setDeleteOpen(false);
      fetchResults();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete:', error);
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
        All lab results
      </Typography>
      <Card elevation={0}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                '& th': {
                  textAlign: 'left',
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                },
                '& td': {
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.85rem',
                  '&:last-child': { borderRight: 'none' },
                },
                '& tr:last-child td': { borderBottom: 'none' },
                '& tr:hover td': {
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                },
              }}
            >
              <Box component="thead">
                <Box component="tr">
                  <Box component="th">Test</Box>
                  <Box component="th">Value</Box>
                  <Box component="th">Date</Box>
                  <Box component="th">Notes</Box>
                  <Box component="th" sx={{ width: 80, textAlign: 'right' }}>Actions</Box>
                </Box>
              </Box>
              <Box component="tbody">
                {results.map((r) => (
                  <Box component="tr" key={r.id}>
                    <Box component="td" sx={{ fontWeight: 500 }}>
                      {TEST_TYPE_LABELS[r.test_type] || r.test_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Box>
                    <Box component="td">
                      <Typography component="span" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                        {r.value}
                      </Typography>
                      {' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        {r.unit}
                      </Typography>
                    </Box>
                    <Box component="td" color="text.secondary">{r.test_date}</Box>
                    <Box component="td" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.notes || '—'}
                    </Box>
                    <Box component="td" sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(r)}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => { setSelected(r); setDeleteOpen(true); }}>
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit lab result</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Value" type="number" value={editValue}
              onChange={(e) => setEditValue(e.target.value)} />
            <TextField label="Date" type="date" value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  filter: (theme) => theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
                },
              }} />
            <TextField label="Notes" value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)} multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete this record?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            This will permanently delete the {TEST_TYPE_LABELS[selected?.test_type || ''] || selected?.test_type} result from {selected?.test_date}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
