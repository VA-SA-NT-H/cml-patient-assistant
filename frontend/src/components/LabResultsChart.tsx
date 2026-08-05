import { useState, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { useTheme } from '../theme/ThemeProvider';

interface LabResult {
  value: string;
  test_date: string;
}

interface Props {
  testType: string;
}

interface ZoneInfo {
  label: string;
  color: string;
  bgLight: string;
  bgDark: string;
  iconName: 'check' | 'warning' | 'error';
}

const getZone = (value: number): ZoneInfo => {
  if (value <= 0.0032) {
    return {
      label: 'MR4.5 — Deep molecular response',
      color: '#16a34a',
      bgLight: 'rgba(22, 163, 74, 0.08)',
      bgDark: 'rgba(22, 163, 74, 0.15)',
      iconName: 'check',
    };
  }
  if (value <= 0.01) {
    return {
      label: 'MR4 — Excellent response',
      color: '#22c55e',
      bgLight: 'rgba(34, 197, 94, 0.08)',
      bgDark: 'rgba(34, 197, 94, 0.15)',
      iconName: 'check',
    };
  }
  if (value <= 0.1) {
    return {
      label: 'MMR — Major molecular response',
      color: '#2A9D8F',
      bgLight: 'rgba(42, 157, 143, 0.08)',
      bgDark: 'rgba(42, 157, 143, 0.15)',
      iconName: 'check',
    };
  }
  if (value <= 1) {
    return {
      label: 'CCyR — Complete cytogenetic response',
      color: '#E9A23B',
      bgLight: 'rgba(233, 162, 59, 0.08)',
      bgDark: 'rgba(233, 162, 59, 0.15)',
      iconName: 'warning',
    };
  }
  return {
    label: 'Below CCyR — Discuss with your doctor',
    color: '#D32F2F',
    bgLight: 'rgba(211, 47, 47, 0.08)',
    bgDark: 'rgba(211, 47, 47, 0.15)',
    iconName: 'error',
  };
};

// Positions for the zone markers on the bar (log scale mapped to 0-100%)
const getMarkerPosition = (value: number): number => {
  if (value <= 0) return 0;
  const logMin = Math.log10(0.001);
  const logMax = Math.log10(100);
  const logVal = Math.log10(Math.max(value, 0.001));
  return Math.max(0, Math.min(100, ((logVal - logMin) / (logMax - logMin)) * 100));
};

const ZONES = [
  { label: '100%', pos: 100 },
  { label: '10%', pos: 75 },
  { label: '1%', pos: 50 },
  { label: '0.1%', pos: 33 },
  { label: '0.01%', pos: 17 },
  { label: '0%', pos: 0 },
];

export const LabResultsChart = ({ testType }: Props) => {
  const [data, setData] = useState<LabResult[]>([]);
  const { mode } = useTheme();

  useEffect(() => {
    fetchData();
  }, [testType]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/lab-results?test_type=${testType}`);
      const results = await response.json();
      setData(results);
    } catch (error) {
      console.error('Failed to fetch lab results:', error);
    }
  };

  if (data.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 1,
        }}
      >
        <Typography color="text.secondary" variant="body2">
          No BCR-ABL1 results yet
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Add a lab result to see your treatment response
        </Typography>
      </Box>
    );
  }

  const latest = data[data.length - 1];
  const latestValue = parseFloat(latest.value);
  const zone = getZone(latestValue);
  const markerPos = getMarkerPosition(latestValue);

  // Determine trend from last 2 results
  let trend: 'improving' | 'stable' | 'rising' | null = null;
  if (data.length >= 2) {
    const prev = parseFloat(data[data.length - 2].value);
    const diff = latestValue - prev;
    if (diff < -0.001) trend = 'improving';
    else if (diff > 0.001) trend = 'rising';
    else trend = 'stable';
  }

  return (
    <Box>
      {/* ── Zone Bar ── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Treatment response zones
          </Typography>
          <Chip
            icon={
              zone.iconName === 'check' ? <CheckCircleIcon /> :
              zone.iconName === 'warning' ? <WarningAmberIcon /> :
              <ErrorIcon />
            }
            label={zone.label}
            size="small"
            sx={{
              bgcolor: mode === 'dark' ? zone.bgDark : zone.bgLight,
              color: zone.color,
              fontWeight: 500,
              fontSize: '0.7rem',
              border: `1px solid ${zone.color}30`,
              '& .MuiChip-icon': { color: zone.color },
            }}
          />
        </Box>

        {/* The bar */}
        <Box
          sx={{
            position: 'relative',
            height: 32,
            borderRadius: 2,
            overflow: 'visible',
            background: mode === 'dark'
              ? 'linear-gradient(90deg, #16a34a 0%, #22c55e 20%, #2A9D8F 35%, #E9A23B 55%, #D32F2F 80%, #b91c1c 100%)'
              : 'linear-gradient(90deg, #16a34a 0%, #22c55e 20%, #2A9D8F 35%, #E9A23B 55%, #D32F2F 80%, #b91c1c 100%)',
            opacity: 0.85,
          }}
        >
          {/* Marker */}
          <Box
            sx={{
              position: 'absolute',
              left: `${markerPos}%`,
              top: -4,
              transform: 'translateX(-50%)',
              zIndex: 2,
            }}
          >
            {/* Pointer triangle */}
            <Box
              sx={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `8px solid ${mode === 'dark' ? '#fff' : '#000'}`,
                mx: 'auto',
              }}
            />
            {/* Value label */}
            <Box
              sx={{
                bgcolor: mode === 'dark' ? '#fff' : '#000',
                color: mode === 'dark' ? '#000' : '#fff',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                mt: 0.25,
              }}
            >
              {latest.value}%
            </Box>
          </Box>
        </Box>

        {/* Zone labels */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
          {ZONES.map((z) => (
            <Typography
              key={z.label}
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.55rem',
                opacity: 0.7,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {z.label}
            </Typography>
          ))}
        </Box>

        {/* Zone names */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
          <Typography variant="caption" sx={{ color: '#16a34a', fontSize: '0.55rem', opacity: 0.8 }}>
            Deep response
          </Typography>
          <Typography variant="caption" sx={{ color: '#E9A23B', fontSize: '0.55rem', opacity: 0.8 }}>
            Partial
          </Typography>
          <Typography variant="caption" sx={{ color: '#D32F2F', fontSize: '0.55rem', opacity: 0.8 }}>
            High
          </Typography>
        </Box>
      </Box>

      {/* ── Recent Results Table ── */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 1 }}>
          Recent results
        </Typography>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            '& th, & td': {
              py: 1,
              px: 1.5,
              textAlign: 'left',
              fontSize: '0.8rem',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& th': {
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            },
            '& td': {
              fontFamily: '"JetBrains Mono", monospace',
            },
            '& tr:last-child td': {
              borderBottom: 'none',
            },
          }}
        >
          <Box component="thead">
            <Box component="tr">
              <Box component="th">Date</Box>
              <Box component="th">BCR-ABL1</Box>
              <Box component="th">Status</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {[...data].reverse().slice(0, 8).map((result, i) => {
              const val = parseFloat(result.value);
              const z = getZone(val);
              return (
                <Box component="tr" key={i}>
                  <Box component="td" sx={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                    {result.test_date}
                  </Box>
                  <Box component="td" sx={{ fontWeight: 500 }}>
                    {result.value}%
                  </Box>
                  <Box component="td">
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: mode === 'dark' ? z.bgDark : z.bgLight,
                        color: z.color,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: z.color,
                        }}
                      />
                      {val <= 0.1 ? 'Good' : val <= 1 ? 'Watch' : 'Concern'}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* ── Trend summary ── */}
      {trend && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {trend === 'improving' && 'Your BCR-ABL1 is trending down — your treatment is working well.'}
            {trend === 'stable' && 'Your BCR-ABL1 has been stable since your last test.'}
            {trend === 'rising' && 'Your BCR-ABL1 has risen since your last test. Share this with your doctor at your next visit.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
