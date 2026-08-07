import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Card, CardContent, IconButton, InputAdornment,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { apiClient } from '../api';
import { useAuth } from '../context/AuthContext';

type Step = 'input' | 'validating' | 'saving' | 'done';

const STEPS = [
  {
    label: 'Open Google AI Studio',
    detail: 'A free platform from Google for building with Gemini models.',
    href: 'https://aistudio.google.com/apikey',
  },
  {
    label: 'Sign in with your Google account',
    detail: 'Use any Google account — the key is free and has a generous free tier.',
  },
  {
    label: 'Click "Create API key"',
    detail: 'You\'ll find this button on the API keys page. It generates a new key instantly.',
  },
  {
    label: 'Copy the key and paste it below',
    detail: 'The key is a long string starting with "AI". Keep it private — you\'re the only one who uses it.',
  },
];

export const Settings = () => {
  const { logout } = useAuth();
  const [apiKeyStatus, setApiKeyStatus] = useState<{ has_key: boolean; masked_value?: string }>({ has_key: false });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [step, setStep] = useState<Step>('input');

  useEffect(() => {
    fetchApiKeyStatus();
  }, []);

  const fetchApiKeyStatus = async () => {
    try {
      const response = await apiClient.get('/api/settings/has-key');
      const data = await response.json();
      if (data.has_key) {
        const keyResponse = await apiClient.getSetting('gemini_api_key');
        setApiKeyStatus({ has_key: true, masked_value: keyResponse.value });
      }
    } catch (error) {
      console.error('Failed to fetch API key status:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setKeyError('');
    setStep('validating');
    setKeySaving(true);
    try {
      const result = await apiClient.validateKey(apiKeyInput.trim());
      if (!result.valid) {
        setKeyError(result.error || 'Invalid API key. Check your key at Google AI Studio.');
        setStep('input');
        setKeySaving(false);
        return;
      }
      setStep('saving');
      await apiClient.saveSetting('gemini_api_key', apiKeyInput.trim());
      setApiKeyInput('');
      setStep('done');
      fetchApiKeyStatus();
    } catch {
      setKeyError('Failed to save. Please try again.');
      setStep('input');
    } finally {
      setKeySaving(false);
    }
  };

  const handleDeleteApiKey = async () => {
    try {
      await apiClient.deleteSetting('gemini_api_key');
      setApiKeyStatus({ has_key: false });
      setStep('input');
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleUpdateKey = () => {
    setStep('input');
    setApiKeyInput('');
  };

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Left nav */}
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            mb: 3,
          }}
        >
          Settings
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(42, 157, 143, 0.12)'
                : 'rgba(42, 157, 143, 0.06)',
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(42, 157, 143, 0.3)'
                : 'rgba(42, 157, 143, 0.2)',
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: apiKeyStatus.has_key ? '#2A9D8F' : '#E9A23B',
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
            API key
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
          onClick={logout}
          sx={{
            justifyContent: 'flex-start',
            px: 1.5,
            py: 0.75,
            fontSize: '0.78rem',
            borderRadius: 1.5,
            textTransform: 'none',
          }}
        >
          Sign out
        </Button>
      </Box>

      {/* Right content */}
      <Box sx={{ flex: 1, p: 4, maxWidth: 640 }}>
        <Typography
          variant="h5"
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          API key
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your Gemini API key lets the assistant talk to Google's AI model.
          Your key is encrypted and only used for your conversations.
        </Typography>

        {/* Current status */}
        <Card elevation={0} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: apiKeyStatus.has_key ? '#2A9D8F' : '#E9A23B',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {apiKeyStatus.has_key ? 'Key configured' : 'No key set'}
                </Typography>
                {apiKeyStatus.masked_value && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: '"JetBrains Mono", monospace', opacity: 0.7 }}
                  >
                    {apiKeyStatus.masked_value}
                  </Typography>
                )}
              </Box>
              {apiKeyStatus.has_key && (
                <Button size="small" variant="outlined" onClick={handleUpdateKey}>
                  Update
                </Button>
              )}
            </Box>

            {apiKeyStatus.has_key && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" color="error" onClick={handleDeleteApiKey}>
                  Remove key
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Input section */}
        {(step === 'input' || step === 'validating' || step === 'saving') && (
          <>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 600,
                mb: 1.5,
              }}
            >
              {apiKeyStatus.has_key ? 'Update your key' : 'Add your key'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                type={showKey ? 'text' : 'password'}
                placeholder="Paste your Gemini API key"
                value={apiKeyInput}
                onChange={(e) => { setApiKeyInput(e.target.value); setKeyError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveApiKey(); }}
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
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim() || step === 'validating' || step === 'saving'}
                startIcon={keySaving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined}
                sx={{
                  background: 'linear-gradient(135deg, #E8573A 0%, #C4432B 100%)',
                  boxShadow: '0 2px 8px rgba(232, 87, 58, 0.25)',
                  px: 3,
                }}
              >
                {step === 'validating' ? 'Checking...' : step === 'saving' ? 'Saving...' : 'Save'}
              </Button>
            </Box>

            {keyError && (
              <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>
                {keyError}
              </Alert>
            )}
          </>
        )}

        {/* Success state */}
        {step === 'done' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <CheckCircleOutlineIcon sx={{ color: '#2A9D8F', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2A9D8F' }}>
              Key saved successfully
            </Typography>
          </Box>
        )}

        {/* Step-by-step instructions */}
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              mb: 2,
            }}
          >
            Get a free API key
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STEPS.map((s, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                {/* Step indicator */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: '#2A9D8F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(42, 157, 143, 0.12)'
                          : 'rgba(42, 157, 143, 0.06)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        color: '#2A9D8F',
                      }}
                    >
                      {i + 1}
                    </Typography>
                  </Box>
                  {i < STEPS.length - 1 && (
                    <Box
                      sx={{
                        width: 2,
                        flex: 1,
                        minHeight: 24,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(42, 157, 143, 0.2)'
                            : 'rgba(42, 157, 143, 0.15)',
                        my: 0.5,
                      }}
                    />
                  )}
                </Box>

                {/* Step content */}
                <Box sx={{ pb: 2.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.25 }}>
                    {s.href ? (
                      <Box
                        component="a"
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {s.label}
                        <OpenInNewIcon sx={{ fontSize: 13 }} />
                      </Box>
                    ) : (
                      s.label
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    {s.detail}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
