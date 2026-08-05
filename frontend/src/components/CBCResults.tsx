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

interface ZoneConfig {
  zones: { min: number; max: number; label: string; color: string; status: string }[];
  normalLabel: string;
  barGradient: string;
}

interface Props {
  testType: string;
  title: string;
  unit: string;
  zoneConfig?: ZoneConfig;
}

const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  cbc_wbc: {
    normalLabel: 'Normal (4.5–11.0 K/µL)',
    barGradient: 'linear-gradient(90deg, #D32F2F 0%, #E9A23B 25%, #2A9D8F 40%, #2A9D8F 60%, #E9A23B 75%, #D32F2F 100%)',
    zones: [
      { min: 0, max: 4.5, label: 'Low — Leukopenia', color: '#E9A23B', status: 'Watch' },
      { min: 4.5, max: 11.0, label: 'Normal range', color: '#2A9D8F', status: 'Good' },
      { min: 11.0, max: Infinity, label: 'High — Leukocytosis', color: '#D32F2F', status: 'Concern' },
    ],
  },
  cbc_platelets: {
    normalLabel: 'Normal (150–400 K/µL)',
    barGradient: 'linear-gradient(90deg, #D32F2F 0%, #E9A23B 25%, #2A9D8F 40%, #2A9D8F 60%, #E9A23B 75%, #D32F2F 100%)',
    zones: [
      { min: 0, max: 150, label: 'Low — Thrombocytopenia', color: '#E9A23B', status: 'Watch' },
      { min: 150, max: 400, label: 'Normal range', color: '#2A9D8F', status: 'Good' },
      { min: 400, max: Infinity, label: 'High — Thrombocytosis', color: '#D32F2F', status: 'Concern' },
    ],
  },
  cbc_hemoglobin: {
    normalLabel: 'Normal (12.0–17.0 g/dL)',
    barGradient: 'linear-gradient(90deg, #D32F2F 0%, #E9A23B 25%, #2A9D8F 40%, #2A9D8F 60%, #E9A23B 75%, #D32F2F 100%)',
    zones: [
      { min: 0, max: 12.0, label: 'Low — Anemia', color: '#E9A23B', status: 'Watch' },
      { min: 12.0, max: 17.0, label: 'Normal range', color: '#2A9D8F', status: 'Good' },
      { min: 17.0, max: Infinity, label: 'High', color: '#D32F2F', status: 'Concern' },
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

export const CBCResults = ({ testType, title, unit }: Props) => {
  const [data, setData] = useState<LabResult[]>([]);
  const { mode } = useTheme();
  const config = ZONE_CONFIGS[testType];

  useEffect(() => {
    fetchData();
  }, [testType]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/lab-results?test_type=${testType}`);
      const results = await response.json();
      setData(results);
    } catch (error) {
      console.error('Failed to fetch CBC data:', error);
    }
  };

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
      // For hemoglobin, lower might be bad (anemia)
      trend = diff > 0.1 ? 'improving' : diff < -0.1 ? 'rising' : 'stable';
    } else {
      // For WBC and platelets, staying in normal range is good
      const inNormalNow = latestValue >= config.zones[1].min && latestValue < config.zones[1].max;
      const inNormalBefore = prev >= config.zones[1].min && prev < config.zones[1].max;
      if (inNormalNow && !inNormalBefore) trend = 'improving';
      else if (!inNormalNow && inNormalBefore) trend = 'rising';
      else trend = 'stable';
    }
  }

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
          {/* Marker */}
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

        {/* Labels */}
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

      {/* ── Recent Results Table ── */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.75 }}>
          Recent {title.toLowerCase()} results
        </Typography>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            '& th, & td': {
              py: 0.75,
              px: 1,
              textAlign: 'left',
              fontSize: '0.75rem',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& th': {
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.6rem',
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
              <Box component="th">{title}</Box>
              <Box component="th">Status</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {[...data].reverse().slice(0, 5).map((result, i) => {
              const val = parseFloat(result.value);
              const z = getZoneForValue(val, config);
              return (
                <Box component="tr" key={i}>
                  <Box component="td" sx={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                    {result.test_date}
                  </Box>
                  <Box component="td" sx={{ fontWeight: 500 }}>
                    {result.value} <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>{unit}</span>
                  </Box>
                  <Box component="td">
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.75,
                        py: 0.2,
                        borderRadius: 0.75,
                        bgcolor: mode === 'dark' ? `${z.color}22` : `${z.color}11`,
                        color: z.color,
                        fontSize: '0.65rem',
                        fontWeight: 500,
                      }}
                    >
                      <Box
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          bgcolor: z.color,
                        }}
                      />
                      {z.status}
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
