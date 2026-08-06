import { useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { apiClient } from '../api';
import { formatDate } from '../utils/formatDate';

interface ParsedRow {
  test_type: string;
  value: string;
  unit: string;
  test_date: string;
  notes: string;
  valid: boolean;
  error: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const FileUploadDialog = ({ open, onClose, onSaved }: Props) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadEndpoint = (fileName: string): string => {
    if (fileName.endsWith('.csv')) return '/api/upload-csv';
    if (fileName.endsWith('.pdf')) return '/api/upload-pdf';
    if (/\.(jpg|jpeg|png)$/i.test(fileName)) return '/api/upload-image';
    return '/api/upload-csv';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const endpoint = getUploadEndpoint(file.name);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiClient.getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const rows = await response.json();
      setParsedRows(rows);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) return;

    try {
      await apiClient.post('/api/lab-results/bulk', { results: validRows });
      setParsedRows([]);
      setFileName('');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Commit failed:', error);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Lab Report</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <input ref={fileInputRef} type="file" accept=".csv,.pdf,.jpg,.jpeg,.png" onChange={handleFileSelect}
            style={{ display: 'none' }} />
          <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Parsing...' : 'Select CSV, PDF, or Image'}
          </Button>
          {fileName && <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>{fileName}</Typography>}
        </Box>

        {parsedRows.length > 0 && (
          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Test Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedRows.map((row, i) => (
                  <TableRow key={i} sx={{ bgcolor: row.valid ? 'inherit' : 'error.light' }}>
                    <TableCell>
                      {row.valid ? (
                        <Chip size="small" label="OK" color="success" />
                      ) : (
                        <Chip size="small" label="Error" color="error" />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(row.test_date)}</TableCell>
                    <TableCell>{row.test_type}</TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{row.notes || row.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleCommit} variant="contained"
          disabled={parsedRows.filter(r => r.valid).length === 0}>
          Commit {parsedRows.filter(r => r.valid).length} Rows
        </Button>
      </DialogActions>
    </Dialog>
  );
};