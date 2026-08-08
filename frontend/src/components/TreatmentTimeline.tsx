import { useState } from 'react';
import {
  Typography, Chip, IconButton, Box, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MedicationIcon from '@mui/icons-material/Medication';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NotesIcon from '@mui/icons-material/Notes';
import { apiClient } from '../api';
import { formatDate } from '../utils/formatDate';
import { useTheme } from '../theme/ThemeProvider';

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
  const { mode } = useTheme();
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
  const [editSaving, setEditSaving] = useState(false);
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
    setEditSaving(true);
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
    } finally {
      setEditSaving(false);
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
    return (
      <Box
        sx={{
          py: 4,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <MedicationIcon sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
        <Typography color="text.secondary" variant="body2">
          No treatment history recorded yet
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>
          Add your first treatment to start tracking
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {treatments.map((t) => {
          const isActive = t.end_date === null;
          return (
            <Box
              key={t.id}
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                borderRadius: 2,
                border: '1px solid',
                borderColor: isActive
                  ? (theme) => theme.palette.mode === 'dark' ? 'rgba(42, 157, 143, 0.3)' : 'rgba(42, 157, 143, 0.25)'
                  : 'divider',
                bgcolor: isActive
                  ? (theme) => theme.palette.mode === 'dark' ? 'rgba(42, 157, 143, 0.04)' : 'rgba(42, 157, 143, 0.02)'
                  : 'transparent',
                overflow: 'hidden',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: isActive ? 'primary.main' : mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                },
              }}
            >
              {/* Left accent */}
              <Box
                sx={{
                  width: 4,
                  flexShrink: 0,
                  bgcolor: isActive ? '#2A9D8F' : mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }}
              />

              {/* Content */}
              <Box sx={{ flex: 1, py: 1.5, px: 2, minWidth: 0 }}>
                {/* Row 1: Drug + badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <MedicationIcon sx={{ fontSize: 16, color: isActive ? '#2A9D8F' : 'text.secondary', opacity: 0.7 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontSize: '0.9rem',
                    }}
                  >
                    {t.drug_name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                    }}
                  >
                    {t.dosage_mg}mg
                  </Typography>
                  {isActive && (
                    <Chip
                      size="small"
                      label="Current"
                      color="primary"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                    />
                  )}
                </Box>

                {/* Row 2: Date range */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: t.reason_for_change ? 0.5 : 0 }}>
                  <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.secondary', opacity: 0.5 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {formatDate(t.start_date)} — {t.end_date ? formatDate(t.end_date) : 'present'}
                  </Typography>
                </Box>

                {/* Row 3: Reason (if exists) */}
                {t.reason_for_change && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.5 }}>
                    <NotesIcon sx={{ fontSize: 13, color: 'text.secondary', opacity: 0.4, mt: 0.25 }} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.75rem',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {t.reason_for_change}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', pr: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, t)}
                  sx={{ color: 'text.secondary' }}
                >
                  <MoreVertIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          );
        })}
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
      <Dialog open={!!editing} onClose={() => !editSaving && setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
          Edit treatment
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField select label="Drug" value={editDrug} onChange={(e) => { setEditDrug(e.target.value); setEditError(''); }} disabled={editSaving}>
              {DRUGS.map(d => (
                <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Dosage (mg)" type="number" value={editDosage}
              onChange={(e) => { setEditDosage(e.target.value); setEditError(''); }}
              error={!!editError} helperText={editError} disabled={editSaving} />
            <TextField label="Start date" type="date" value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
              InputLabelProps={{ shrink: true }} disabled={editSaving} />
            <TextField label="End date (optional)" type="date" value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
              InputLabelProps={{ shrink: true }} disabled={editSaving} />
            <TextField label="Reason for change (optional)" value={editReason}
              onChange={(e) => setEditReason(e.target.value)} multiline rows={2} disabled={editSaving} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditing(null)} color="inherit" disabled={editSaving}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={editSaving}>
            {editSaving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            {editSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: 3, minWidth: { xs: 'auto', sm: 380 }, mx: { xs: 2, sm: 0 } } }}>
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
          Delete treatment record?
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            This will remove <strong>{deleteTarget?.drug_name} {deleteTarget?.dosage_mg}mg</strong> from your treatment history.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit" disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} /> : null}
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
