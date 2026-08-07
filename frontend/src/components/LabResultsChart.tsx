import { Box, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '../theme/ThemeProvider';
import { formatDate } from '../utils/formatDate';

interface LabResult {
  value: string;
  test_date: string;
}

interface Props {
  testType: string;
  data: LabResult[];
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

const ZONES = [
  { label: '100%', pos: 100 },
  { label: '10%', pos: 75 },
  { label: '1%', pos: 50 },
  { label: '0.1%', pos: 33 },
  { label: '0.01%', pos: 17 },
  { label: '0%', pos: 0 },
];

const getMarkerPosition = (value: number): number => {
  if (value <= 0) return 0;
  const logMin = Math.log10(0.001);
  const logMax = Math.log10(100);
  const logVal = Math.log10(Math.max(value, 0.001));
  return Math.max(0, Math.min(100, ((logVal - logMin) / (logMax - logMin)) * 100));
};

export const LabResultsChart = ({ data }: Props) => {
  const { mode } = useTheme();

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

  let trend: 'improving' | 'stable' | 'rising' | null = null;
  if (data.length >= 2) {
    const prev = parseFloat(data[data.length - 2].value);
    const diff = latestValue - prev;
    if (diff < -0.001) trend = 'improving';
    else if (diff > 0.001) trend = 'rising';
    else trend = 'stable';
  }

  // Prepare chart data
  const xLabels = data.map(d => formatDate(d.test_date));
  const yValues = data.map(d => parseFloat(d.value));

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

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.75 }}>
          <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
            {latest.value}%
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {formatDate(latest.test_date)}
          </Typography>
        </Box>

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
          <Box
            sx={{
              position: 'absolute',
              left: `${markerPos}%`,
              top: -4,
              transform: 'translateX(-50%)',
              zIndex: 2,
            }}
          >
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

      {/* ── Line Chart ── */}
      {data.length >= 2 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 1 }}>
            BCR-ABL1 trend
          </Typography>
          <Box sx={{ width: '100%', height: 220 }}>
            <LineChart
              xAxis={[{
                data: xLabels,
                scaleType: 'point',
                tickLabelStyle: {
                  fontSize: 10,
                  fill: mode === 'dark' ? '#aaa' : '#666',
                },
              }]}
              yAxis={[{
                min: 0,
                tickLabelStyle: {
                  fontSize: 10,
                  fill: mode === 'dark' ? '#aaa' : '#666',
                },
              }]}
              series={[{
                data: yValues,
                color: mode === 'dark' ? '#555' : '#bbb',
                colorGetter: ({ value }) => value != null ? getZone(value).color : '#888',
                showMark: true,
              }]}
              height={220}
              margin={{ top: 20, bottom: 30, left: 50, right: 20 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5, justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#2A9D8F' }}>
              MMR threshold: ≤ 0.1%
            </Typography>
          </Box>
        </Box>
      )}

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
