import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box } from '@mui/material';
import { apiClient } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const DRUGS = [
  { value: 'Imatinib', label: 'Imatinib (Gleevec)' },
  { value: 'Dasatinib', label: 'Dasatinib (Sprycel)' },
  { value: 'Nilotinib', label: 'Nilotinib (Tasigna)' },
  { value: 'Bosutinib', label: 'Bosutinib (Bosulif)' },
  { value: 'Ponatinib', label: 'Ponatinib (Iclusig)' },
  { value: 'Asciminib', label: 'Asciminib (Scemblix)' },
];

export const TreatmentEntryDialog = ({ open, onClose, onSaved }: Props) => {
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!drugName) {
      setError('Please select a drug');
      return;
    }
    if (!dosage || isNaN(parseInt(dosage)) || parseInt(dosage) <= 0) {
      setError('Please enter a valid dosage in mg');
      return;
    }

    try {
      await apiClient.post('/api/treatments', {
        drug_name: drugName,
        dosage_mg: parseInt(dosage),
        start_date: startDate,
        end_date: endDate || null,
        reason_for_change: reason || null,
      });
      setDrugName('');
      setDosage('');
      setEndDate('');
      setReason('');
      setError('');
      onSaved();
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Treatment</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField select label="Drug" value={drugName} onChange={(e) => { setDrugName(e.target.value); setError(''); }}>
            {DRUGS.map(d => (
              <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Dosage (mg)" type="number" value={dosage}
            onChange={(e) => { setDosage(e.target.value); setError(''); }}
            error={!!error} helperText={error} />
          <TextField label="Start date" type="date" value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& input[type="date"]::-webkit-calendar-picker-indicator': {
                filter: (theme) => theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
              },
            }} />
          <TextField label="End date (optional)" type="date" value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& input[type="date"]::-webkit-calendar-picker-indicator': {
                filter: (theme) => theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
              },
            }} />
          <TextField label="Reason for change (optional)" value={reason}
            onChange={(e) => setReason(e.target.value)} multiline rows={2} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};
