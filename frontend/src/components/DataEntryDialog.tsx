import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box } from '@mui/material';
import { apiClient } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TEST_TYPES = [
  { value: 'bcr_abl1', label: 'BCR-ABL1', unit: '%' },
  { value: 'cbc_wbc', label: 'WBC', unit: 'x10^9/L' },
  { value: 'cbc_platelets', label: 'Platelets', unit: 'x10^9/L' },
  { value: 'cbc_hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
  { value: 'other', label: 'Other', unit: '' },
];

export const DataEntryDialog = ({ open, onClose, onSaved }: Props) => {
  const [testType, setTestType] = useState('bcr_abl1');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('%');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleTypeChange = (type: string) => {
    setTestType(type);
    const found = TEST_TYPES.find(t => t.value === type);
    if (found) setUnit(found.unit);
  };

  const handleSubmit = async () => {
    if (!value || isNaN(parseFloat(value))) {
      setError('Please enter a valid numeric value');
      return;
    }
    if (testType === 'bcr_abl1' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
      setError('BCR-ABL1 must be between 0 and 100');
      return;
    }
    if (parseFloat(value) <= 0) {
      setError('Value must be positive');
      return;
    }

    try {
      await apiClient.post('/api/lab-results', { test_type: testType, value, unit, test_date: testDate, notes });
      setValue('');
      setNotes('');
      setError('');
      onSaved();
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Lab Result</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField select label="Test Type" value={testType} onChange={(e) => handleTypeChange(e.target.value)}>
            {TEST_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Value" type="number" value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            error={!!error} helperText={error} />
          <TextField label="Unit" value={unit}
            onChange={(e) => setUnit(e.target.value)} />
          <TextField label="Date" type="date" value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& input[type="date"]::-webkit-calendar-picker-indicator': {
                filter: (theme) => theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
              },
            }} />
          <TextField label="Notes (optional)" value={notes}
            onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};