import { useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Link,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import MicIcon from "@mui/icons-material/Mic";
import { Link as RouterLink, useNavigate } from "react-router-dom";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const handleInputChange = (field: keyof LoginFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password.trim()) {
      setError('Password is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the real API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // Store user data and token from API response
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userId', data.user.id);
      
      // Navigate to assistant page after successful login
      navigate('/assistant');

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 560,
        mx: "auto",
        my: { xs: 2, md: 4 },
        p: { xs: 3, md: 4 },
        borderRadius: 4,
        border: 1,
        borderColor: "divider",
      }}
    >
      {/* Welcome */}
      <Stack spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={900}>Welcome</Typography>
        <Typography color="text.secondary" align="center">
          Sign in to access your voice-first logistics partner
        </Typography>
      </Stack>

      {/* Pill Tabs */}
      <Box sx={{ bgcolor: "grey.100", borderRadius: 999, p: 0.5, mb: 3 }}>
        <Tabs
          value={0}
          variant="fullWidth"
          TabIndicatorProps={{ sx: { display: "none" } }}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": { minHeight: 40, borderRadius: 999, textTransform: "none", fontWeight: 600 },
            "& .Mui-selected": { bgcolor: "common.white", boxShadow: "inset 0 0 0 1px var(--mui-palette-divider)" },
          }}
        >
          <Tab label="Login" />
          <Tab label="Sign Up" component={RouterLink} to="/signup" disableRipple />
        </Tabs>
      </Box>      {/* Error Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Email</Typography>
          <TextField
            placeholder="Enter your email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={handleInputChange('email')}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutlineOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Password</Typography>
          <TextField
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            fullWidth
            value={formData.password}
            onChange={handleInputChange('password')}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(s => !s)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <FormControlLabel 
            control={
              <Checkbox 
                size="small" 
                checked={formData.rememberMe}
                onChange={handleInputChange('rememberMe')}
                disabled={loading}
              />
            } 
            label="Remember me" 
          />
          <Link component={RouterLink} to="/forgot-password" underline="hover">Forgot password?</Link>
        </Stack>

        <Button 
          type="submit" 
          variant="contained" 
          size="large" 
          fullWidth 
          disabled={loading}
          sx={{ 
            borderRadius: 2, 
            py: 1.25,
            "&:hover": { bgcolor: "grey.900" },
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </Stack>

      {/* Divider */}
      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">OR CONTINUE WITH</Typography>
      </Divider>      {/* Alt sign-in */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<KeyOutlinedIcon />}
          disabled={loading}
          onClick={() => setError('OTP login coming soon!')}
        >
          OTP
        </Button>
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<MicIcon />}
          disabled={loading}
          onClick={() => setError('Voice login coming soon!')}
        >
          Voice
        </Button>
      </Stack>
    </Paper>
  );
}
