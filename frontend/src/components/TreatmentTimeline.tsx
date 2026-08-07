import { useState } from 'react';
import {
  Typography, Chip, IconButton, Box, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineDot, TimelineContent } from '@mui/lab';
import { apiClient } from '../api';
import { formatDate } from '../utils/formatDate';

interface Treatment {
  id: number;
  drug_name: string;
  dosage_mg: number;
  start_date: string;
  end_date: string | null;
  reason_for_change: string | null;
}

const DRUGS = [
  { value: 'Imatinib', label: 'Imatinib (Gleevec)' },
  { value: 'Dasatinib', label: 'Dasatinib (Sprycel)' },
  { value: 'Nilotinib', label: 'Nilotinib (Tasigna)' },
  { value: 'Bosutinib', label: 'Bosutinib (Bosulif)' },
  { value: 'Ponatinib', label: 'Ponatinib (Iclusig)' },
  { value: 'Asciminib', label: 'Asciminib (Scemblix)' },
];

export const TreatmentTimeline = ({ data }: { data: Treatment[] }) => {
  const [treatments, setTreatments] = useState<Treatment[]>(data);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<Treatment | null>(null);
  const [editing, setEditing] = useState<Treatment | null>(null);
  const [editDrug, setEditDrug] = useState('');
  const [editDosage, setEditDosage] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTreatments = async () => {
    try {
      const response = await apiClient.get('/api/treatments');
      const data = await response.json();
      setTreatments(data);
    } catch (error) {
      console.error('Failed to fetch treatments:', error);
    }
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, t: Treatment) => {
    setMenuAnchor(e.currentTarget);
    setMenuTarget(t);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTarget(null);
  };

  const handleEditOpen = () => {
    if (!menuTarget) return;
    setEditing(menuTarget);
    setEditDrug(menuTarget.drug_name);
    setEditDosage(String(menuTarget.dosage_mg));
    setEditStart(menuTarget.start_date);
    setEditEnd(menuTarget.end_date || '');
    setEditReason(menuTarget.reason_for_change || '');
    setEditError('');
    handleMenuClose();
  };

  const handleEditSave = async () => {
    if (!editDrug) {
      setEditError('Please select a drug');
      return;
    }
    if (!editDosage || isNaN(parseInt(editDosage)) || parseInt(editDosage) <= 0) {
      setEditError('Enter a valid dosage in mg');
      return;
    }
    try {
      await apiClient.put(`/api/treatments/${editing!.id}`, {
        drug_name: editDrug,
        dosage_mg: parseInt(editDosage),
        start_date: editStart,
        end_date: editEnd || null,
        reason_for_change: editReason || null,
      });
      setEditing(null);
      await fetchTreatments();
    } catch {
      setEditError('Failed to save. Please try again.');
    }
  };

  const handleDeleteOpen = () => {
    if (!menuTarget) return;
    setDeleteTarget(menuTarget);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/treatments/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchTreatments();
    } catch {
      console.error('Failed to delete treatment');
    } finally {
      setDeleting(false);
    }
  };

  if (treatments.length === 0) {
    return <Typography color="text.secondary">No treatment history recorded.</Typography>;
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Timeline position="left" sx={{ maxWidth: 500, p: 0, m: 0 }}>
          {treatments.map((t, i) => (
            <TimelineItem key={t.id}>
              <TimelineSeparator>
                <TimelineDot color={t.end_date === null ? 'primary' : 'grey'} />
                {i < treatments.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent sx={{ px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {t.drug_name} {t.dosage_mg}mg
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(t.start_date)} — {t.end_date ? formatDate(t.end_date) : 'present'}
                    </Typography>
                    {t.end_date === null && (
                      <Chip size="small" label="Current" color="primary" sx={{ ml: 1 }} />
                    )}
                    {t.reason_for_change && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                        {t.reason_for_change}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, t)}
                    sx={{ color: 'text.secondary', flexShrink: 0, ml: 1 }}
                  >
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Box>

      {/* ── Actions Menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { minWidth: 150, mt: 0.5 } } }}
      >
        <MenuItem onClick={handleEditOpen}>
          <ListItemIcon><EditOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteOpen}>
          <ListItemIcon><DeleteOutlineIcon sx={{ fontSize: 18, color: 'error.main' }} /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit treatment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField select label="Drug" value={editDrug} onChange={(e) => { setEditDrug(e.target.value); setEditError(''); }}>
              {DRUGS.map(d => (
                <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Dosage (mg)" type="number" value={editDosage}
              onChange={(e) => { setEditDosage(e.target.value); setEditError(''); }}
              error={!!editError} helperText={editError} />
            <TextField label="Start date" type="date" value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <TextField label="End date (optional)" type="date" value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <TextField label="Reason for change (optional)" value={editReason}
              onChange={(e) => setEditReason(e.target.value)} multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} color="inherit">Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save changes</Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: 3, minWidth: 380 } }}>
        <DialogTitle>Delete treatment record?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            This will remove <strong>{deleteTarget?.drug_name} {deleteTarget?.dosage_mg}mg</strong> from your treatment history.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
