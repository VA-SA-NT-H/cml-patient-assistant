import { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Box,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { ThemeToggle } from './ThemeToggle';

interface Session {
  session_id: string;
  title: string;
  created_at: string;
}

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onNavigateDashboard: () => void;
  isDashboard: boolean;
}

const DRAWER_WIDTH = 280;

export const Sidebar = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onNavigateDashboard,
  isDashboard,
}: SidebarProps) => {
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  const handleRename = (session: Session) => {
    setEditingSession(session.session_id);
    setEditTitle(session.title);
  };

  const handleSaveRename = () => {
    if (editingSession && editTitle.trim()) {
      onRenameSession(editingSession, editTitle.trim());
      setEditingSession(null);
      setEditTitle('');
    }
  };

  const handleDelete = (sessionId: string) => {
    setDeletingSession(sessionId);
  };

  const handleConfirmDelete = () => {
    if (deletingSession) {
      onDeleteSession(deletingSession);
      setDeletingSession(null);
    }
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap>
            CML Assistant
          </Typography>
          <ThemeToggle />
        </Box>
        
        <Divider />
        
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNewChat}
          >
            New Chat
          </Button>
          <Button
            fullWidth
            variant={isDashboard ? 'contained' : 'outlined'}
            startIcon={<DashboardIcon />}
            onClick={onNavigateDashboard}
            sx={{ mt: 1 }}
          >
            Dashboard
          </Button>
        </Box>
        
        <Divider />
        
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {sessions.map((session) => (
            <ListItem
              key={session.session_id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(session);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={currentSessionId === session.session_id}
                onClick={() => onSelectSession(session.session_id)}
                sx={{
                  px: 2,
                  py: 1,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ChatIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={session.title}
                  slotProps={{
                    primary: {
                      noWrap: true,
                      variant: 'body2',
                    },
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(session.session_id);
                  }}
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Rename Dialog */}
      <Dialog open={editingSession !== null} onClose={() => setEditingSession(null)}>
        <DialogTitle>Rename Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveRename();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingSession(null)}>Cancel</Button>
          <Button onClick={handleSaveRename}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingSession !== null} onClose={() => setDeletingSession(null)}>
        <DialogTitle>Delete Session</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this session?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingSession(null)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};