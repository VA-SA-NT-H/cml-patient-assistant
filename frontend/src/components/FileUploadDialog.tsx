import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const FileUploadDialog = ({ open, onClose, onSaved }: Props) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Lab Report</DialogTitle>
      <DialogContent>
        {/* TODO: implement upload */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSaved} variant="contained">Upload</Button>
      </DialogActions>
    </Dialog>
  );
};