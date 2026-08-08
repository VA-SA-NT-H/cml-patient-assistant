import { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import ChecklistIcon from '@mui/icons-material/Checklist';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api';
import { formatDate } from '../utils/formatDate';

interface NextCheckupProps {
  date: string | null;
  bringItems: string | null;
}

export const NextCheckup = ({ date, bringItems }: NextCheckupProps) => {
  const [nextDate, setNextDate] = useState<string | null>(date);
  const [bringItemsText, setBringItems] = useState<string>(bringItems || '');
  const [reminderId, setReminderId] = useState<number | null>(null);
  const { mode } = useTheme();
  const [editOpen, setEditOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formBringItems, setFormBringItems] = useState('');

  useEffect(() => {
    const fetchReminder = async () => {
      try {
        const response = await apiClient.get('/api/checkup-reminders');
        const data = await response.json();
        if (data.length > 0) {
          setReminderId(data[0].id);
          setNextDate(data[0].reminder_date);
          setBringItems(data[0].bring_items || '');
        }
      } catch (err) {
        console.error('Failed to fetch reminder:', err);
      }
    };
    fetchReminder();
  }, []);

  const handleSave = async () => {
    try {
      if (reminderId) {
        await apiClient.put(`/api/checkup-reminders/${reminderId}`, {
          reminder_date: formDate,
          bring_items: formBringItems,
        });
      } else {
        const response = await apiClient.post('/api/checkup-reminders', {
          reminder_date: formDate,
          bring_items: formBringItems,
        });
        const data = await response.json();
        setReminderId(data.id);
      }
      setNextDate(formDate);
      setBringItems(formBringItems);
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to save reminder:', err);
    }
  };

  const handleClear = async () => {
    try {
      if (reminderId) {
        await apiClient.delete(`/api/checkup-reminders/${reminderId}`);
      }
      setNextDate(null);
      setBringItems('');
      setReminderId(null);
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to clear reminder:', err);
    }
  };

  const getDaysRemaining = () => {
    if (!nextDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(nextDate);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: nextDate
                ? daysRemaining !== null && daysRemaining <= 7
                  ? 'rgba(232, 87, 58, 0.1)'
                  : 'rgba(42, 157, 143, 0.1)'
                : 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EventIcon sx={{
              fontSize: 20,
              color: nextDate
                ? daysRemaining !== null && daysRemaining <= 7
                  ? '#E8573A'
                  : '#2A9D8F'
                : 'text.secondary',
            }} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Next checkup
            </Typography>
            {nextDate ? (
              <Typography variant="caption" color="text.secondary">
                {formatDate(nextDate)}
                {daysRemaining !== null && (
                  <span style={{
                    marginLeft: 6,
                    color: daysRemaining <= 7 ? '#E8573A' : daysRemaining <= 30 ? '#E9A23B' : '#2A9D8F',
                    fontWeight: 500,
                  }}>
                    {daysRemaining === 0 ? 'Today' : daysRemaining === 1 ? 'Tomorrow' : `in ${daysRemaining} days`}
                  </span>
                )}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No checkup scheduled
              </Typography>
            )}
          </Box>
        </Box>
        <Button
          size="small"
          onClick={() => {
            setFormDate(nextDate || new Date().toISOString().split('T')[0]);
            setFormBringItems(bringItemsText);
            setEditOpen(true);
          }}
          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
        >
          {nextDate ? 'Change' : 'Set date'}
        </Button>
      </Box>

      {/* Bring items display */}
      {bringItemsText && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: mode === 'dark' ? 'rgba(232, 87, 58, 0.06)' : 'rgba(232, 87, 58, 0.04)',
            border: '1px solid',
            borderColor: mode === 'dark' ? 'rgba(232, 87, 58, 0.15)' : 'rgba(232, 87, 58, 0.12)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <ChecklistIcon sx={{ fontSize: 18, color: '#E8573A', mt: 0.25 }} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#E8573A', display: 'block', mb: 0.25 }}>
              Bring to your appointment
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-line' }}>
              {bringItemsText}
            </Typography>
          </Box>
        </Box>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Next checkup</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Checkup date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  filter: (theme) => theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
                },
              }}
            />
            <TextField
              label="Items to bring (optional)"
              value={formBringItems}
              onChange={(e) => setFormBringItems(e.target.value)}
              multiline
              rows={3}
              placeholder="e.g. Previous lab results, medication list, insurance card"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {nextDate && (
            <Button onClick={handleClear} color="error">Clear</Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
