import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Box, Chip, ThemeProvider, createTheme, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const server_url = `https://clearroute-p3pd.onrender.com`;

const defaultTheme = createTheme({
  palette: {
    primary: { main: '#0F52BA' },
    secondary: { main: '#22C55E' },
    background: { default: '#F8FAFC' }
  },
  typography: { fontFamily: '"Inter", "Segoe UI", sans-serif' },
  shape: { borderRadius: 12 }
});

export default function AdminDashboard() {
    const [sessions, setSessions] = useState([]);
    const [metrics, setMetrics] = useState({ totalSessions: 0, activeSessions: 0, totalUsers: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const sessionsRes = await axios.get(`${server_url}/api/v1/users/sessions`);
                setSessions(sessionsRes.data);

                const metricsRes = await axios.get(`${server_url}/api/v1/users/metrics`);
                setMetrics(metricsRes.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <ThemeProvider theme={defaultTheme}>
            <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', py: 4 }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, mt: 2 }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/home')} sx={{ mr: 2, color: '#475569' }}>
                            Back
                        </Button>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>
                            Operations Dashboard
                        </Typography>
                    </Box>

                    <Grid container spacing={4} sx={{ mb: 6 }}>
                        <Grid item xs={12} md={4}>
                            <Paper elevation={2} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderTop: '4px solid #22C55E' }}>
                                <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Sessions</Typography>
                                <Typography variant="h2" sx={{ fontWeight: 800, color: '#0F172A', mt: 1 }}>{metrics.activeSessions}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper elevation={2} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderTop: '4px solid #0F52BA' }}>
                                <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sessions</Typography>
                                <Typography variant="h2" sx={{ fontWeight: 800, color: '#0F172A', mt: 1 }}>{metrics.totalSessions}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper elevation={2} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderTop: '4px solid #F59E0B' }}>
                                <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Users</Typography>
                                <Typography variant="h2" sx={{ fontWeight: 800, color: '#0F172A', mt: 1 }}>{metrics.totalUsers}</Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 3 }}>Session Telemetry & Logs</Typography>
                    <TableContainer component={Paper} elevation={2} sx={{ backgroundColor: '#FFFFFF', borderRadius: 3, overflow: 'hidden' }}>
                        <Table>
                            <TableHead sx={{ backgroundColor: '#F1F5F9' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Meeting ID</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Start Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>End Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Chat Packets</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sessions.map((session) => (
                                    <TableRow key={session._id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: '#F8FAFC' } }}>
                                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F52BA' }}>#{session.meetingCode}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={session.status} 
                                                size="small"
                                                sx={{ 
                                                    fontWeight: 600, 
                                                    backgroundColor: session.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                                                    color: session.status === 'Active' ? '#166534' : '#475569'
                                                }} 
                                            />
                                        </TableCell>
                                        <TableCell>{new Date(session.startTime).toLocaleString()}</TableCell>
                                        <TableCell>{session.endTime ? new Date(session.endTime).toLocaleString() : '-'}</TableCell>
                                        <TableCell>{session.chatHistory ? session.chatHistory.length : 0} records</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Container>
            </Box>
        </ThemeProvider>
    );
}
