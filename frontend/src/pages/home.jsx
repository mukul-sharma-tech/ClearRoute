import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Container, Typography, Box, Paper, ThemeProvider, createTheme } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import DashboardIcon from '@mui/icons-material/Dashboard';

const defaultTheme = createTheme({
  palette: {
    primary: { main: '#0F52BA' }, // Sapphire Blue
    secondary: { main: '#475569' }, // Slate Gray
    background: { default: '#F8FAFC' }
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
  shape: { borderRadius: 12 }
});

export default function HomeComponent() {
    const navigate = useNavigate();
    const role = localStorage.getItem('role') || 'Customer';
    const name = localStorage.getItem('name') || 'User';
    const [joinCode, setJoinCode] = useState('');

    const handleCreateSession = () => {
        const sessionId = Math.random().toString(36).substring(2, 12);
        navigate(`/${sessionId}`);
    };

    const handleJoinSession = () => {
        if (joinCode.trim()) {
            navigate(`/${joinCode.trim()}`);
        }
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', py: 8 }}>
                <Container maxWidth="sm">
                    <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: '#0F52BA', mb: 4, textAlign: 'center' }}>
                        ClearRoute
                    </Typography>

                    <Paper elevation={4} sx={{ p: 5, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
                            Welcome, {name}
                        </Typography>
                        <Box sx={{ display: 'inline-block', backgroundColor: '#E2E8F0', px: 2, py: 0.5, borderRadius: '9999px', mb: 4 }}>
                            <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 600 }}>
                                Role: {role}
                            </Typography>
                        </Box>

                        {role === 'Agent' ? (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body1" sx={{ color: '#475569', mb: 4 }}>
                                    Your support dashboard is ready. You can initialize a new secure session or monitor active routes.
                                </Typography>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    size="large" 
                                    startIcon={<VideocamIcon />}
                                    onClick={handleCreateSession}
                                    sx={{ mt: 2, mb: 2, py: 1.5, borderRadius: '9999px', width: '100%', fontWeight: 'bold' }}
                                >
                                    Initialize Support Session
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    color="primary" 
                                    size="large" 
                                    startIcon={<DashboardIcon />}
                                    onClick={() => navigate('/admin')}
                                    sx={{ py: 1.5, borderRadius: '9999px', width: '100%', fontWeight: 'bold' }}
                                >
                                    Operations Dashboard
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body1" sx={{ color: '#475569', mb: 3 }}>
                                    Please enter the secure session code provided by your support agent to begin.
                                </Typography>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Enter Session ID (e.g. x93b28f9)"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    sx={{ mb: 3, backgroundColor: '#F8FAFC' }}
                                />
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    size="large"
                                    onClick={handleJoinSession}
                                    disabled={!joinCode.trim()}
                                    sx={{ py: 1.5, borderRadius: '9999px', width: '100%', fontWeight: 'bold' }}
                                >
                                    Join Secure Session
                                </Button>
                            </Box>
                        )}

                        <Box sx={{ mt: 5, borderTop: '1px solid #E2E8F0', pt: 3 }}>
                            <Button color="secondary" onClick={() => {
                                localStorage.clear();
                                navigate('/');
                            }} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                Sign Out
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </ThemeProvider>
    );
}
