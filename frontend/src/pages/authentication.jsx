import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { AuthContext } from '../contexts/AuthContext.jsx';
import Snackbar from '@mui/material/Snackbar';




// TODO remove, this demo shouldn't need to reset the theme.

const defaultTheme = createTheme();

export default function Authentication() {


  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState();
  const [message, setMessage] = React.useState();
  
  const [formState, setFormState] = React.useState(0);

  const [open, setOpen] = React.useState(false);

  const {handleRegister, handleLogin} = React.useContext(AuthContext);

  const handleAuth = async() => {
    try{
      if(formState === 0){
        let result = await handleLogin(username, password)  
        

      }
      if(formState === 1){
        let result = await handleRegister(name, username,password)
        console.log(result)
        setUsername("")
        setMessage(result)
        setOpen(true)
        setError("")
        setFormState(0)
        setPassword("")

      }
    }catch(err){
      let message = "An error occurred.";
      if (err.response && err.response.data && err.response.data.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    }
  }

  
  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        <CssBaseline />
        <Grid
          item
          xs={false}    // Hide on mobile (xs screens)
          sm={4}        // Show on small screens and up
          md={7}        // Take 7/12 columns on medium and up
          sx={{
            backgroundImage: `url(${process.env.PUBLIC_URL}/background.png)`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: (t) =>
              t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Grid 
          item 
          xs={12}       // Take full width on mobile
          sm={8}        // Take 8/12 columns on small screens and up
          md={5}        // Take 5/12 columns on medium and up
          component={Paper} 
          elevation={6} 
          square
          sx={{
            backgroundImage: { xs: 'url(/background.png)', sm: 'none' },
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <LockOutlinedIcon />
            </Avatar>


            <div>
              <Button variant={formState===0 ?"contained" : ""} onClick={() => {setFormState(0)}}>
                Log In
              </Button>
              <Button variant={formState===1 ?"contained" : ""} onClick={() => {setFormState(1)}}>
                Register
              </Button>
            </div>
            
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {formState === 1 && (
                <>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="fullname"
                    label="Full Name"
                    name="fullname"
                    value={name}
                    autoFocus
                    onChange={(e) => {
                      setName(e.target.value);
                    }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label="Username"
                    name="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                    }}
                  />
                </>
              )}

              {formState === 0 && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  value={username}
                  autoFocus
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                value={password}
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <p style ={{ color:"red" }}>{error}</p>

              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={handleAuth}
              >
                {formState === 0 ? 'Log In' : 'Register'}
              </Button>
            </Box>
            {/* Test Credentials Box */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                border: '2px dashed #1976d2',
                borderRadius: 2,
                backgroundColor: '#e3f2fd',
                color: '#0d47a1',
                width: '100%',
                maxWidth: 360,
                textAlign: 'center',
                boxShadow: 1,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Test Credentials
              </Typography>
              <Typography variant="body2">
                <strong>Username:</strong> test
              </Typography>
              <Typography variant="body2">
                <strong>Password:</strong> 123
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
                open = {open}
                autoHideDuration = {4000}
                message = {message}
      />

    </ThemeProvider>
  );
}