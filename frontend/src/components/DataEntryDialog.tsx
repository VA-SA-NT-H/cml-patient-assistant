import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, IconButton, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TEST_TYPES = [
  { key: 'bcr_abl1', label: 'BCR-ABL1', unit: '%', placeholder: 'e.g. 0.01' },
  { key: 'blast_percentage', label: 'Blast %', unit: '%', placeholder: 'e.g. 2.5' },
  { key: 'cbc_platelets', label: 'Platelets', unit: 'K/µL', placeholder: 'e.g. 245' },
  { key: 'cbc_wbc', label: 'WBC', unit: 'K/µL', placeholder: 'e.g. 6.2' },
  { key: 'cbc_rbc', label: 'RBC', unit: 'M/µL', placeholder: 'e.g. 4.8' },
  { key: 'cbc_hemoglobin', label: 'Hemoglobin', unit: 'g/dL', placeholder: 'e.g. 13.5' },
  { key: 'basophils', label: 'Basophils', unit: '%', placeholder: 'e.g. 0.5' },
  { key: 'eosinophils', label: 'Eosinophils', unit: '%', placeholder: 'e.g. 2.1' },
];

interface TestEntry {
  key: string;
  value: string;
}

export const DataEntryDialog = ({ open, onClose, onSaved }: Props) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tests, setTests] = useState<TestEntry[]>([
    { key: 'bcr_abl1', value: '' },
    { key: 'cbc_wbc', value: '' },
    { key: 'cbc_platelets', value: '' },
    { key: 'cbc_hemoglobin', value: '' },
  ]);
  const [customTests, setCustomTests] = useState<{ label: string; value: string; unit: string }[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateTestValue = (index: number, value: string) => {
    const updated = [...tests];
    updated[index].value = value;
    setTests(updated);
  };

  const removeTest = (index: number) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  const addPresetTest = (key: string) => {
    if (tests.some(t => t.key === key)) return;
    const preset = TEST_TYPES.find(t => t.key === key);
    if (preset) {
      setTests([...tests, { key: preset.key, value: '' }]);
    }
  };

  const addCustomTest = () => {
    if (!customLabel.trim() || !customValue.trim()) return;
    setCustomTests([...customTests, { label: customLabel.trim(), value: customValue.trim(), unit: customUnit.trim() }]);
    setCustomLabel('');
    setCustomValue('');
    setCustomUnit('');
  };

  const removeCustomTest = (index: number) => {
    setCustomTests(customTests.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const results: any[] = [];

    for (const t of tests) {
      if (!t.value || isNaN(parseFloat(t.value))) continue;
      const preset = TEST_TYPES.find(p => p.key === t.key);
      results.push({
        test_type: t.key,
        value: t.value,
        unit: preset?.unit || '',
        test_date: date,
      });
    }

    for (const ct of customTests) {
      results.push({
        test_type: ct.label.toLowerCase().replace(/\s+/g, '_'),
        value: ct.value,
        unit: ct.unit,
        test_date: date,
      });
    }

    if (results.length === 0) {
      setError('Enter at least one test result');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/api/lab-results/bulk', { results });
      setTests([
        { key: 'bcr_abl1', value: '' },
        { key: 'cbc_wbc', value: '' },
        { key: 'cbc_platelets', value: '' },
        { key: 'cbc_hemoglobin', value: '' },
      ]);
      setCustomTests([]);
      setError('');
      onSaved();
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const availablePresets = TEST_TYPES.filter(p => !tests.some(t => t.key === p.key));

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Add lab results</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Test date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& input[type="date"]::-webkit-calendar-picker-indicator': {
                filter: (theme) => theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
              },
            }}
          />

          {/* Preset test inputs */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
              Test results
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {tests.map((t, i) => {
                const preset = TEST_TYPES.find(p => p.key === t.key);
                return (
                  <Box key={t.key} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      label={preset?.label || t.key}
                      type="number"
                      value={t.value}
                      onChange={(e) => updateTestValue(i, e.target.value)}
                      placeholder={preset?.placeholder}
                      size="small"
                      sx={{ flex: 1 }}
                      InputProps={{
                        endAdornment: preset ? (
                          <Typography variant="caption" color="text.secondary">{preset.unit}</Typography>
                        ) : null,
                      }}
                    />
                    <IconButton size="small" onClick={() => removeTest(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>

            {/* Add preset test dropdown */}
            {availablePresets.length > 0 && (
              <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {availablePresets.map(p => (
                  <Button
                    key={p.key}
                    size="small"
                    variant="outlined"
                    onClick={() => addPresetTest(p.key)}
                    sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.25 }}
                  >
                    + {p.label}
                  </Button>
                ))}
              </Box>
            )}
          </Box>

          {/* Custom test input */}
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 1 }}>
              Add a different test
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Test name"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                size="small"
                sx={{ flex: 2 }}
              />
              <TextField
                label="Value"
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Unit"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <IconButton size="small" onClick={addCustomTest} disabled={!customLabel.trim() || !customValue.trim()}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>

            {customTests.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {customTests.map((ct, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {ct.label}: {ct.value} {ct.unit}
                    </Typography>
                    <IconButton size="small" onClick={() => removeCustomTest(i)}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {error && (
            <Typography variant="caption" color="error">{error}</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          {saving ? 'Saving...' : 'Save results'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
