import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ScienceIcon from '@mui/icons-material/Science';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Dashboard } from './pages/Dashboard';
import { useAuth } from './context/AuthContext';
import { apiClient } from './api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  session_id: string;
  title: string;
  created_at: string;
}

const QUICK_STARTERS = [
  { icon: <ScienceIcon sx={{ fontSize: 16 }} />, label: 'What is BCR-ABL1?', message: 'What is BCR-ABL1 and what does it mean for my CML?' },
  { icon: <LocalHospitalIcon sx={{ fontSize: 16 }} />, label: 'Side effects', message: 'What are the common side effects of TKI medications?' },
  { icon: <FavoriteIcon sx={{ fontSize: 16 }} />, label: 'Lifestyle tips', message: 'What lifestyle changes can help me manage CML better?' },
];

function formatSessionDate(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `Chat · ${month} ${day}, ${year} · ${h}:${minutes} ${ampm}`;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const { token } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardRefreshKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.setToken(token);
  }, [token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/api/sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleNewChat = async (): Promise<string | null> => {
    try {
      const title = formatSessionDate();
      const response = await apiClient.post('/api/sessions', { title });
      const data = await response.json();
      setSessions([data, ...sessions]);
      setCurrentSessionId(data.session_id);
      setMessages([]);
      navigate('/');
      return data.session_id;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    if (isDashboard) {
      navigate('/');
    }
    try {
      const response = await apiClient.get(`/api/sessions/${sessionId}/messages`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiClient.delete(`/api/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.session_id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    try {
      await apiClient.put(`/api/sessions/${sessionId}`, { title: newTitle });
      setSessions(sessions.map(s =>
        s.session_id === sessionId ? { ...s, title: newTitle } : s
      ));
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await handleNewChat();
    }

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const ws = new WebSocket(apiClient.getWsUrl());

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'chat',
          session_id: sessionId,
          message: content,
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'token') {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + data.content },
              ];
            }
            return [...prev, { role: 'assistant', content: data.content }];
          });
        } else if (data.type === 'complete') {
          setIsLoading(false);
          ws.close();
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message);
          setIsLoading(false);
          ws.close();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsLoading(false);
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onNavigateDashboard={() => navigate('/dashboard')}
        isDashboard={isDashboard}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {isDashboard ? (
          <Dashboard refreshKey={dashboardRefreshKey} />
        ) : (
          <>
            <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
              {messages.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    textAlign: 'center',
                    px: 4,
                    animation: 'fadeIn 0.5s ease-out',
                  }}
                >
                  {/* Medical icon with pulse */}
                  <Box
                    sx={{
                      position: 'relative',
                      mb: 4,
                    }}
                  >
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(232, 87, 58, 0.15) 0%, rgba(42, 157, 143, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(232, 87, 58, 0.1) 0%, rgba(42, 157, 143, 0.1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'breathe 3s ease-in-out infinite',
                      }}
                    >
                      <LocalHospitalIcon
                        sx={{
                          fontSize: 32,
                          color: 'primary.main',
                        }}
                      />
                    </Box>
                    {/* Pulse ring */}
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: -8,
                        borderRadius: '50%',
                        border: '1.5px solid',
                        borderColor: 'primary.main',
                        opacity: 0.3,
                        animation: 'pulse-ring 2.5s ease-out infinite',
                      }}
                    />
                  </Box>

                  <Typography
                    variant="h4"
                    sx={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      mb: 1.5,
                      color: 'text.primary',
                    }}
                  >
                    Your CML companion
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      maxWidth: 440,
                      mb: 4,
                      lineHeight: 1.7,
                    }}
                  >
                    Ask about your treatment, side effects, lab results, or anything
                    related to living well with CML.
                  </Typography>

                  {/* Quick starters */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      animation: 'fadeInUp 0.5s ease-out 0.2s both',
                    }}
                  >
                    {QUICK_STARTERS.map((starter) => (
                      <Chip
                        key={starter.label}
                        icon={starter.icon}
                        label={starter.label}
                        onClick={() => handleSendMessage(starter.message)}
                        sx={{
                          px: 1,
                          py: 2.5,
                          height: 'auto',
                          fontSize: '0.8rem',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(232, 87, 58, 0.08)'
                                : 'rgba(232, 87, 58, 0.04)',
                            transform: 'translateY(-1px)',
                          },
                          '& .MuiChip-icon': {
                            color: 'primary.main',
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={index}
                      role={message.role}
                      content={message.content}
                    />
                  ))}
                  {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', px: 3, mb: 2, gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2A9D8F 0%, #1F7A6E 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CircularProgress size={16} sx={{ color: 'white' }} />
                      </Box>
                      <Box
                        sx={{
                          py: 1.5,
                          px: 2,
                          borderRadius: '4px 16px 16px 16px',
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(0, 0, 0, 0.7)'
                              : 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Thinking...
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </Box>

            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
          </>
        )}
      </Box>
    </Box>
  );
}

export default App;
