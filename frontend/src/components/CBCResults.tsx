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

interface ZoneConfig {
  zones: { min: number; max: number; label: string; color: string; status: string }[];
  normalLabel: string;
  barGradient: string;
  normalMin: number;
  normalMax: number;
}

interface Props {
  testType: string;
  title: string;
  unit: string;
  zoneConfig?: ZoneConfig;
  data: LabResult[];
}

const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  cbc_wbc: {
    normalLabel: 'Normal (4.5–11.0 K/µL)',
    barGradient: 'linear-gradient(90deg, #D32F2F 0%, #E9A23B 25%, #2A9D8F 40%, #2A9D8F 60%, #E9A23B 75%, #D32F2F 100%)',
    normalMin: 4.5,
    normalMax: 11.0,
    zones: [
      { min: 0, max: 4.5, label: 'Low — Leukopenia', color: '#E9A23B', status: 'Watch' },
      { min: 4.5, max: 11.0, label: 'Normal range', color: '#2A9D8F', status: 'Good' },
      { min: 11.0, max: Infinity, label: 'High — Leukocytosis', color: '#D32F2F', status: 'Concern' },
    ],
  },
  cbc_platelets: {
    normalLabel: 'Normal (150–400 K/µL)',
    barGradient: 'linear-gradient(90deg, #D32F2F 0%, #E9A23B 25%, #2A9D8F 40%, #2A9D8F 60%, #E9A23B 75%, #D32F2F 100%)',
    normalMin: 150,
    normalMax: 400,
    zones: [
      { min: 0, max: 150, label: 'Low — Thrombocytopenia', color: '#E9A23B', status: 'Watch' },
      { min: 150, max: 400, label: 'Normal range', color: '#2A9D8F', status: 'Good' },
      { min: 400, max: Infinity, label: 'High — Thrombocytosis', color: '#D32F2F', status: 'Concern' },
    ],
  },
  cbc_hemoglobin: {
    normalLabel: 'Normal (12.0–17.0 g/dL)',
    barGradient: 'linear-gradient(90deg, #D32F2F 0%, #E9A23B 25%, #2A9D8F 40%, #2A9D8F 60%, #E9A23B 75%, #D32F2F 100%)',
    normalMin: 12.0,
    normalMax: 17.0,
    zones: [
      { min: 0, max: 12.0, label: 'Low — Anemia', color: '#E9A23B', status: 'Watch' },
      { min: 12.0, max: 17.0, label: 'Normal range', color: '#2A9D8F', status: 'Good' },
      { min: 17.0, max: Infinity, label: 'High', color: '#D32F2F', status: 'Concern' },
    ],
  },
  cbc_rbc: {
    normalLabel: 'Normal (4.0–5.5 M/µL)',
    barGradient: 'linear-gradient(90deg, #D32F2F 0%, #E9A23B 25%, #2A9D8F 40%, #2A9D8F 60%, #E9A23B 75%, #D32F2F 100%)',
    normalMin: 4.0,
    normalMax: 5.5,
    zones: [
      { min: 0, max: 4.0, label: 'Low — Anemia', color: '#E9A23B', status: 'Watch' },
      { min: 4.0, max: 5.5, label: 'Normal range', color: '#2A9D8F', status: 'Good' },
      { min: 5.5, max: Infinity, label: 'High', color: '#D32F2F', status: 'Concern' },
    ],
  },
};

const getZoneForValue = (value: number, config: ZoneConfig) => {
  for (const zone of config.zones) {
    if (value >= zone.min && value < zone.max) return zone;
  }
  return config.zones[config.zones.length - 1];
};

const getMarkerPosition = (value: number, config: ZoneConfig): number => {
  const normalZone = config.zones.find(z => z.label.includes('Normal'));
  if (!normalZone) return 50;
  const rangeMin = config.zones[0].min;
  const rangeMax = config.zones[config.zones.length - 1].max === Infinity
    ? normalZone.max * 2
    : config.zones[config.zones.length - 1].max;
  return Math.max(0, Math.min(100, ((value - rangeMin) / (rangeMax - rangeMin)) * 100));
};

export const CBCResults = ({ testType, title, unit, data }: Props) => {
  const { mode } = useTheme();
  const config = ZONE_CONFIGS[testType];

  if (!config || data.length === 0) {
    return (
      <Box
        sx={{
          p: 3,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Typography color="text.secondary" variant="body2">
          No {title} data yet
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Add lab results to see your {title} trend
        </Typography>
      </Box>
    );
  }

  const latest = data[data.length - 1];
  const latestValue = parseFloat(latest.value);
  const zone = getZoneForValue(latestValue, config);
  const markerPos = getMarkerPosition(latestValue, config);

  let trend: 'improving' | 'stable' | 'rising' | null = null;
  if (data.length >= 2) {
    const prev = parseFloat(data[data.length - 2].value);
    const diff = latestValue - prev;
    if (Math.abs(diff) < 0.1) trend = 'stable';
    else if (testType === 'cbc_hemoglobin') {
      trend = diff > 0.1 ? 'improving' : diff < -0.1 ? 'rising' : 'stable';
    } else {
      const inNormalNow = latestValue >= config.zones[1].min && latestValue < config.zones[1].max;
      const inNormalBefore = prev >= config.zones[1].min && prev < config.zones[1].max;
      if (inNormalNow && !inNormalBefore) trend = 'improving';
      else if (!inNormalNow && inNormalBefore) trend = 'rising';
      else trend = 'stable';
    }
  }

  // Prepare chart data
  const chartData = data.map(d => ({
    date: d.test_date,
    value: parseFloat(d.value),
  }));
  const xLabels = chartData.map(d => formatDate(d.date));
  const yValues = chartData.map(d => d.value);

  return (
    <Box>
      {/* ── Zone Bar ── */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title} reference zones
          </Typography>
          <Chip
            icon={
              zone.status === 'Good' ? <CheckCircleIcon /> :
              zone.status === 'Watch' ? <WarningAmberIcon /> :
              <ErrorIcon />
            }
            label={zone.label}
            size="small"
            sx={{
              bgcolor: mode === 'dark'
                ? `${zone.color}22`
                : `${zone.color}11`,
              color: zone.color,
              fontWeight: 500,
              fontSize: '0.65rem',
              border: `1px solid ${zone.color}30`,
              '& .MuiChip-icon': { color: zone.color, fontSize: 14 },
            }}
          />
        </Box>

        {/* Value + Date */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.75 }}>
          <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
            {latest.value} <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>{unit}</span>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {formatDate(latest.test_date)}
          </Typography>
        </Box>

        {/* The bar */}
        <Box
          sx={{
            position: 'relative',
            height: 24,
            borderRadius: 1.5,
            overflow: 'visible',
            background: config.barGradient,
            opacity: 0.8,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: `${markerPos}%`,
              top: -3,
              transform: 'translateX(-50%)',
              zIndex: 2,
            }}
          >
            <Box
              sx={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `7px solid ${mode === 'dark' ? '#fff' : '#000'}`,
                mx: 'auto',
              }}
            />
            <Box
              sx={{
                bgcolor: mode === 'dark' ? '#fff' : '#000',
                color: mode === 'dark' ? '#000' : '#fff',
                px: 0.75,
                py: 0.15,
                borderRadius: 0.75,
                fontSize: '0.65rem',
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                mt: 0.15,
              }}
            >
              {latest.value}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#E9A23B', fontSize: '0.5rem', opacity: 0.8 }}>
            Low
          </Typography>
          <Typography variant="caption" sx={{ color: '#2A9D8F', fontSize: '0.5rem', opacity: 0.8 }}>
            Normal
          </Typography>
          <Typography variant="caption" sx={{ color: '#D32F2F', fontSize: '0.5rem', opacity: 0.8 }}>
            High
          </Typography>
        </Box>
      </Box>

      {/* ── Line Chart ── */}
      {data.length >= 2 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 1 }}>
            {title} trend
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
                colorGetter: ({ value }) => value != null ? getZoneForValue(value, config).color : '#888',
                showMark: true,
              }]}
              height={220}
              margin={{ top: 20, bottom: 30, left: 50, right: 20 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5, justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#2A9D8F' }}>
              Normal: {config.normalMin}–{config.normalMax} {unit}
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Trend summary ── */}
      {trend && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {trend === 'improving' && `Your ${title} is moving in a good direction.`}
            {trend === 'stable' && `Your ${title} has been stable since your last test.`}
            {trend === 'rising' && `Your ${title} has changed since your last test. Share this with your doctor.`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
