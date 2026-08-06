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
  useMediaQuery,
  useTheme,
  Avatar,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

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

const DRAWER_WIDTH = 264;

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const { user, logout } = useAuth();

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    if (isMobile) setMobileOpen(false);
  };

  const handleNavigateDashboard = () => {
    onNavigateDashboard();
    if (isMobile) setMobileOpen(false);
  };

  const handleNewChat = () => {
    onNewChat();
    if (isMobile) setMobileOpen(false);
  };

  const handleCloseSidebar = () => {
    if (isMobile) setMobileOpen(false);
    else setDesktopOpen(false);
  };

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

  const drawerContent = (
    <>
      {/* Logo */}
      <Box
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #E8573A 0%, #C4432B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(232, 87, 58, 0.3)',
            }}
          >
            <MedicalServicesIcon sx={{ color: 'white', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '0.9rem',
                lineHeight: 1.2,
                color: 'text.primary',
              }}
            >
              CML Assistant
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.6rem',
                lineHeight: 1,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Patient Support
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ThemeToggle />
          {!isMobile && (
            <Tooltip title="Close sidebar">
              <IconButton onClick={handleCloseSidebar} size="small" sx={{ ml: 0.5 }}>
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Divider sx={{ mx: 2, opacity: 0.4 }} />

      {/* Actions */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewChat}
          sx={{
            py: 1.25,
            background: 'linear-gradient(135deg, #E8573A 0%, #C4432B 100%)',
            boxShadow: '0 2px 8px rgba(232, 87, 58, 0.25)',
            fontSize: '0.85rem',
            '&:hover': {
              background: 'linear-gradient(135deg, #C4432B 0%, #E8573A 100%)',
              boxShadow: '0 4px 12px rgba(232, 87, 58, 0.35)',
            },
          }}
        >
          New Chat
        </Button>
        <Button
          fullWidth
          variant={isDashboard ? 'contained' : 'outlined'}
          startIcon={<DashboardIcon />}
          onClick={handleNavigateDashboard}
          sx={{
            py: 1.25,
            fontSize: '0.85rem',
            ...(isDashboard
              ? {
                  background: 'linear-gradient(135deg, #2A9D8F 0%, #1F7A6E 100%)',
                  boxShadow: '0 2px 8px rgba(42, 157, 143, 0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1F7A6E 0%, #2A9D8F 100%)',
                    boxShadow: '0 4px 12px rgba(42, 157, 143, 0.35)',
                  },
                }
              : {}),
          }}
        >
          Dashboard
        </Button>
      </Box>

      <Divider sx={{ mx: 2, opacity: 0.4 }} />

      {/* Sessions */}
      <Box sx={{ px: 2.5, pt: 2, pb: 0.75 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontSize: '0.6rem',
          }}
        >
          Conversations
        </Typography>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {sessions.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 5,
              px: 2,
            }}
          >
            <ChatIcon sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.3, mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ fontSize: '0.8rem' }}>
              Your conversations live here
            </Typography>
          </Box>
        ) : (
          sessions.map((session) => (
            <ListItem
              key={session.session_id}
              disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(session);
                    }}
                    sx={{
                      opacity: 0,
                      transition: 'opacity 0.15s',
                      '&:hover': { opacity: 1 },
                      '.MuiListItem-root:hover &': { opacity: 0.5 },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(session.session_id);
                    }}
                    sx={{
                      opacity: 0,
                      transition: 'opacity 0.15s',
                      color: 'error.main',
                      '&:hover': { opacity: 1 },
                      '.MuiListItem-root:hover &': { opacity: 0.5 },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              }
              sx={{ mb: 0.25 }}
            >
              <ListItemButton
                selected={currentSessionId === session.session_id}
                onClick={() => handleSelectSession(session.session_id)}
                sx={{
                  borderRadius: 2,
                  px: 1.5,
                  py: 1,
                  transition: 'all 0.15s ease-out',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  '&.Mui-selected': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(232, 87, 58, 0.12)'
                        : 'rgba(232, 87, 58, 0.08)',
                    borderLeft: '2px solid',
                    borderColor: 'primary.main',
                    '&:hover': {
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(232, 87, 58, 0.16)'
                          : 'rgba(232, 87, 58, 0.12)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                    '& .MuiListItemText-primary': {
                      color: 'text.primary',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ChatIcon sx={{ fontSize: 16, opacity: 0.6 }} />
                </ListItemIcon>
                <ListItemText
                  primary={session.title}
                  slotProps={{
                    primary: {
                      noWrap: true,
                      variant: 'body2',
                      sx: { fontWeight: 400, fontSize: '0.8rem' },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Avatar
              src={user.picture_url}
              alt={user.name}
              sx={{ width: 32, height: 32 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 500, fontSize: '0.8rem' }}
              >
                {user.name}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block' }}
              >
                {user.email}
              </Typography>
            </Box>
            <Tooltip title="Sign out">
              <IconButton onClick={logout} size="small" color="error">
                <LogoutIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            opacity: 0.5,
            fontSize: '0.6rem',
            letterSpacing: '0.05em',
            display: 'block',
            textAlign: 'center',
          }}
        >
          v1.0.0
        </Typography>
      </Box>
    </>
  );

  return (
    <>
      {/* Hamburger button - always visible when sidebar is closed */}
      {((isMobile && !mobileOpen) || (!isMobile && !desktopOpen)) && (
        <IconButton
          onClick={() => isMobile ? setMobileOpen(true) : setDesktopOpen(true)}
          sx={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 1300,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          aria-label="Open menu"
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {/* Single Drawer for both mobile and desktop */}
      <Drawer
        variant="temporary"
        open={isMobile ? mobileOpen : desktopOpen}
        onClose={() => isMobile ? setMobileOpen(false) : setDesktopOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(180deg, #0A0A0A 0%, #000000 100%)'
                : 'linear-gradient(180deg, #FAFAFA 0%, #F0F0F0 100%)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Rename Dialog */}
      <Dialog
        open={editingSession !== null}
        onClose={() => setEditingSession(null)}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 360 },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
          Rename conversation
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename();
            }}
            placeholder="Give this conversation a name"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditingSession(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveRename}
            variant="contained"
            disabled={!editTitle.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deletingSession !== null}
        onClose={() => setDeletingSession(null)}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 360 },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
          Delete conversation
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            This conversation will be permanently deleted. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeletingSession(null)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
