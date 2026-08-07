import { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api';
import { formatDate } from '../utils/formatDate';

interface MedicationEntry {
  name: string;
  cost: string;
}

interface CheckupRecord {
  id: number;
  checkup_date: string;
  doctor_advice: string | null;
  medications_bought: string | null;
  medication_cost: string | null;
  created_at: string;
}

const parseMedications = (raw: string | null): MedicationEntry[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [{ name: raw, cost: '' }];
  } catch {
    return [{ name: raw, cost: '' }];
  }
};

const serializeMedications = (meds: MedicationEntry[]): string | undefined => {
  const valid = meds.filter(m => m.name.trim());
  if (valid.length === 0) return undefined;
  return JSON.stringify(valid);
};

export const CheckupRecords = ({ data }: { data: CheckupRecord[] }) => {
  const [records, setRecords] = useState<CheckupRecord[]>(data);
  const { mode } = useTheme();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CheckupRecord | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAdvice, setFormAdvice] = useState('');
  const [formMeds, setFormMeds] = useState<MedicationEntry[]>([{ name: '', cost: '' }]);

  const fetchRecords = async () => {
    try {
      const response = await apiClient.get('/api/checkup-records');
      const result = await response.json();
      setRecords(result);
    } catch (error) {
      console.error('Failed to fetch checkup records:', error);
    }
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAdvice('');
    setFormMeds([{ name: '', cost: '' }]);
  };

  const handleAdd = async () => {
    try {
      await apiClient.post('/api/checkup-records', {
        checkup_date: formDate,
        doctor_advice: formAdvice || undefined,
        medications_bought: serializeMedications(formMeds),
      });
      resetForm();
      setAddOpen(false);
      fetchRecords();
    } catch (err) {
      console.error('Failed to add checkup record:', err);
    }
  };

  const handleEdit = (r: CheckupRecord) => {
    setSelected(r);
    setFormDate(r.checkup_date);
    setFormAdvice(r.doctor_advice || '');
    const meds = parseMedications(r.medications_bought);
    setFormMeds(meds.length > 0 ? meds : [{ name: '', cost: '' }]);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    try {
      await apiClient.put(`/api/checkup-records/${selected.id}`, {
        checkup_date: formDate,
        doctor_advice: formAdvice || undefined,
        medications_bought: serializeMedications(formMeds),
      });
      resetForm();
      setEditOpen(false);
      setSelected(null);
      fetchRecords();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const handleDelete = (r: CheckupRecord) => {
    setSelected(r);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;
    try {
      await apiClient.delete(`/api/checkup-records/${selected.id}`);
      setDeleteOpen(false);
      setSelected(null);
      fetchRecords();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const addMedication = () => {
    setFormMeds([...formMeds, { name: '', cost: '' }]);
  };

  const removeMedication = (index: number) => {
    setFormMeds(formMeds.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: 'name' | 'cost', value: string) => {
    const updated = [...formMeds];
    updated[index] = { ...updated[index], [field]: value };
    setFormMeds(updated);
  };

  const renderMedications = (meds: MedicationEntry[]) => {
    if (meds.length === 0) return null;
    return (
      <Box sx={{ mt: 0.5 }}>
        {meds.map((med, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {med.name}
            </Typography>
            {med.cost && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', opacity: 0.7 }}>
                — {med.cost}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  const renderMedicationForm = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {formMeds.map((med, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            label={`Medication ${formMeds.length > 1 ? index + 1 : ''}`}
            value={med.name}
            onChange={(e) => updateMedication(index, 'name', e.target.value)}
            placeholder="e.g. Imatinib 400mg"
            size="small"
            sx={{ flex: 2 }}
          />
          <TextField
            label="Cost"
            value={med.cost}
            onChange={(e) => updateMedication(index, 'cost', e.target.value)}
            placeholder="e.g. 500"
            size="small"
            sx={{ flex: 1 }}
          />
          {formMeds.length > 1 && (
            <Tooltip title="Remove medication">
              <IconButton onClick={() => removeMedication(index)} size="small" sx={{ mt: 0.5 }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ))}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={addMedication}
        sx={{ textTransform: 'none', fontSize: '0.75rem', alignSelf: 'flex-start' }}
      >
        Add another medication
      </Button>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
          }}
        >
          Checkup records
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => { resetForm(); setAddOpen(true); }}
          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
        >
          Add record
        </Button>
      </Box>

      {records.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
          No checkup records yet. Add one to track doctor visits and medications.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {records.map((r) => {
            const meds = parseMedications(r.medications_bought);
            return (
              <Box
                key={r.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                      {formatDate(r.checkup_date)}
                    </Typography>
                    {r.doctor_advice && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {r.doctor_advice}
                      </Typography>
                    )}
                    {meds.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          Medications:
                        </Typography>
                        {renderMedications(meds)}
                      </Box>
                    )}
                  </Box>
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEdit(r)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(r)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add checkup record</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Checkup date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  filter: (theme) => theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
                },
              }}
            />
            <TextField
              label="Doctor's advice (optional)"
              value={formAdvice}
              onChange={(e) => setFormAdvice(e.target.value)}
              multiline
              rows={2}
            />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, fontSize: '0.85rem' }}>
                Medications
              </Typography>
              {renderMedicationForm()}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit checkup record</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Checkup date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  filter: (theme) => theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
                },
              }}
            />
            <TextField
              label="Doctor's advice (optional)"
              value={formAdvice}
              onChange={(e) => setFormAdvice(e.target.value)}
              multiline
              rows={2}
            />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, fontSize: '0.85rem' }}>
                Medications
              </Typography>
              {renderMedicationForm()}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete record</DialogTitle>
        <DialogContent>
          <Typography>Delete checkup record from {formatDate(selected?.checkup_date || '')}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
