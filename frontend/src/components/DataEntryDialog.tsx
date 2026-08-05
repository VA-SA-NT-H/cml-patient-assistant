import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const DataEntryDialog = ({ open, onClose, onSaved }: Props) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Lab Result</DialogTitle>
      <DialogContent>
        {/* TODO: implement form */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSaved} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};