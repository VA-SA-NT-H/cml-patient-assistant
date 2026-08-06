import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, setToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token);
      navigate('/');
    }
  }, [searchParams, setToken, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 6,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8573A 0%, #2A9D8F 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <LocalHospitalIcon sx={{ fontSize: 32, color: 'white' }} />
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          CML Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Your personalized CML management companion
        </Typography>

        <Button
          variant="contained"
          startIcon={<GoogleIcon />}
          onClick={login}
          fullWidth
          size="large"
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          Sign in with Google
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
          Secure authentication powered by Google OAuth
        </Typography>
      </Paper>
    </Box>
  );
};
