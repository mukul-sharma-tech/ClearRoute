import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';



// TODO remove, this demo shouldn't need to reset the theme.

const defaultTheme = createTheme({
  palette: {
    primary: {
      main: '#0F52BA', // Sapphire Blue
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
      color: '#0F172A'
    }
  },
  shape: {
    borderRadius: 12,
  }
});

export default function Authentication() {

    

    const [username, setUsername] = React.useState();
    const [password, setPassword] = React.useState();
    const [name, setName] = React.useState();
    const [error, setError] = React.useState();
    const [message, setMessage] = React.useState();


    const [role, setRole] = React.useState('Customer');

    const [formState, setFormState] = React.useState(0);

    const [open, setOpen] = React.useState(false)


    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    let handleAuth = async () => {
        try {
            if (formState === 0) {
                await handleLogin(username, password)
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password, role);
                console.log(result);
                setUsername("");
                setMessage(result);
                setOpen(true);
                setError("")
                setFormState(0)
                setPassword("")
            }
        } catch (err) {

            console.log(err);
            let message = (err.response.data.message);
            setError(message);
        }
    }


    return (
        <ThemeProvider theme={defaultTheme}>
            <Box
                sx={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                }}
            >
                {/* Dark overlay for better contrast */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)' }} />

                <Box
                    sx={{
                        perspective: '1000px',
                        width: '100%',
                        maxWidth: '450px',
                        zIndex: 1
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            position: 'relative',
                            transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                            transformStyle: 'preserve-3d',
                            transform: formState === 1 ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            display: 'grid',
                        }}
                    >
                        {/* FRONT FACE: SIGN IN */}
                        <Paper
                            elevation={10}
                            sx={{
                                gridArea: '1 / 1 / 2 / 2',
                                backfaceVisibility: 'hidden',
                                p: 4,
                                borderRadius: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: '#0F52BA', mb: 1 }}>
                                ClearRoute
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Enterprise Support Portal
                            </Typography>
                            
                            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
                                <LockOutlinedIcon />
                            </Avatar>
                            <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                                Sign in
                            </Typography>

                            <Box component="form" noValidate sx={{ width: '100%' }}>
                                <TextField margin="normal" required fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                                <TextField margin="normal" required fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                
                                <p style={{ color: "red", textAlign: 'center', margin: '10px 0' }}>{error}</p>

                                <Button fullWidth variant="contained" sx={{ mt: 2, mb: 2, py: 1.5, borderRadius: 2 }} onClick={handleAuth}>
                                    Login
                                </Button>
                                <Button fullWidth variant="text" onClick={() => { setFormState(1); setError(""); }} sx={{ textTransform: 'none' }}>
                                    Don't have an account? Sign Up
                                </Button>
                            </Box>
                        </Paper>

                        {/* BACK FACE: SIGN UP */}
                        <Paper
                            elevation={10}
                            sx={{
                                gridArea: '1 / 1 / 2 / 2',
                                backfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                                p: 4,
                                borderRadius: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: '#0F52BA', mb: 1 }}>
                                ClearRoute
                            </Typography>
                            
                            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                                <LockOutlinedIcon />
                            </Avatar>
                            <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                                Register
                            </Typography>

                            <Box component="form" noValidate sx={{ width: '100%' }}>
                                <TextField margin="normal" required fullWidth label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                                <TextField margin="normal" required fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                                <TextField margin="normal" required fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                
                                <Box sx={{ mt: 1, mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Register As:</Typography>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <FormControlLabel control={<Checkbox checked={role === 'Customer'} onChange={() => setRole('Customer')} />} label="Customer" />
                                        <FormControlLabel control={<Checkbox checked={role === 'Agent'} onChange={() => setRole('Agent')} />} label="Agent" />
                                    </Box>
                                </Box>

                                <p style={{ color: "red", textAlign: 'center', margin: '5px 0' }}>{error}</p>

                                <Button fullWidth variant="contained" sx={{ mt: 2, mb: 2, py: 1.5, borderRadius: 2 }} onClick={handleAuth}>
                                    Sign Up
                                </Button>
                                <Button fullWidth variant="text" onClick={() => { setFormState(0); setError(""); }} sx={{ textTransform: 'none' }}>
                                    Already have an account? Sign In
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                </Box>
            </Box>

            <Snackbar

                open={open}
                autoHideDuration={4000}
                message={message}
            />

        </ThemeProvider>
    );
}