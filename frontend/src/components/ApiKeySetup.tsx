import { useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, IconButton, InputAdornment,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { apiClient } from '../api';

interface Props {
  onComplete: () => void;
}

export const ApiKeySetup = ({ onComplete }: Props) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'validating' | 'saving' | 'done'>('input');

  const handleValidateAndSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setError('');
    setStep('validating');
    setValidating(true);

    try {
      const result = await apiClient.validateKey(apiKey.trim());
      if (!result.valid) {
        setError(result.error || 'Invalid API key. Check your key at Google AI Studio.');
        setStep('input');
        setValidating(false);
        return;
      }

      setStep('saving');
      setSaving(true);
      await apiClient.saveSetting('gemini_api_key', apiKey.trim());
      setStep('done');
      onComplete();
    } catch {
      setError('Failed to save. Please try again.');
      setStep('input');
    } finally {
      setValidating(false);
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        px: 4,
        animation: 'fadeIn 0.5s ease-out',
      }}
    >
      <Box
        sx={{
          maxWidth: 440,
          width: '100%',
          p: 4,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            mb: 1,
          }}
        >
          Connect your Gemini API key
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
          You need a free Gemini API key to use the AI assistant. Your key stays
          private and is only used for your conversations.
        </Typography>

        <Typography
          component="a"
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          variant="body2"
          sx={{
            color: 'primary.main',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            mb: 3,
            fontWeight: 500,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Get a free key at Google AI Studio
          <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Typography>

        <TextField
          fullWidth
          type={showKey ? 'text' : 'password'}
          placeholder="Paste your API key"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleValidateAndSave(); }}
          disabled={step === 'validating' || step === 'saving'}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowKey(!showKey)}
                    edge="end"
                  >
                    {showKey ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          onClick={handleValidateAndSave}
          disabled={!apiKey.trim() || step === 'validating' || step === 'saving'}
          startIcon={validating || saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : undefined}
          sx={{
            background: 'linear-gradient(135deg, #E8573A 0%, #C4432B 100%)',
            boxShadow: '0 2px 8px rgba(232, 87, 58, 0.25)',
          }}
        >
          {step === 'validating' ? 'Validating...' : step === 'saving' ? 'Saving...' : 'Validate & Save'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center', opacity: 0.6 }}>
          Your key is encrypted and stored securely. It is never shared with other users.
        </Typography>
      </Box>
    </Box>
  );
};
