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
import Grid from "@mui/material/Grid"; // v7 Grid (use `size` prop)
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import MicIcon from "@mui/icons-material/Mic";
import { Link as RouterLink, useNavigate } from "react-router-dom";

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  agreeToTerms: boolean;
}

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    agreeToTerms: false,
  });

  const handleInputChange = (field: keyof SignupFormData) => (
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
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.password.trim()) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      setSuccess('Account created successfully! Redirecting to login...');
      
      // Store user data and token from API response
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userId', data.user.id);
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 620,
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
          Create your account to access Porter Saathi
        </Typography>
      </Stack>

      {/* Pill Tabs */}
      <Box sx={{ bgcolor: "grey.100", borderRadius: 999, p: 0.5, mb: 3 }}>
        <Tabs
          value={1}
          variant="fullWidth"
          TabIndicatorProps={{ sx: { display: "none" } }}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": { minHeight: 40, borderRadius: 999, textTransform: "none", fontWeight: 600 },
            "& .Mui-selected": { bgcolor: "common.white", boxShadow: "inset 0 0 0 1px var(--mui-palette-divider)" },
          }}
        >
          <Tab label="Login" component={RouterLink} to="/login" />
          <Tab label="Sign Up" />
        </Tabs>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Form */}
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>First Name</Typography>
              <TextField 
                placeholder="First name" 
                fullWidth 
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                disabled={loading}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Last Name</Typography>
              <TextField 
                placeholder="Last name" 
                fullWidth 
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                disabled={loading}
              />
            </Box>
          </Grid>
        </Grid>

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
          <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Phone Number</Typography>
          <TextField
            placeholder="+91 XXXXX XXXXX"
            fullWidth
            value={formData.phone}
            onChange={handleInputChange('phone')}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIphoneOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Password</Typography>
          <TextField
            placeholder="Create a password"
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

        <FormControlLabel
          control={
            <Checkbox 
              size="small" 
              checked={formData.agreeToTerms}
              onChange={handleInputChange('agreeToTerms')}
              disabled={loading}
            />
          }
          label={
            <Typography variant="body2">
              I agree to the{" "}
              <Link component={RouterLink} to="/terms-of-service" underline="hover">Terms of Service</Link>{" "}
              and{" "}
              <Link component={RouterLink} to="/privacy-policy" underline="hover">Privacy Policy</Link>
            </Typography>
          }
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{ 
            borderRadius: 2, 
            py: 1.25, 
            "&:hover": { bgcolor: "grey.900" },
            position: 'relative'
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </Stack>

      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">OR SIGN UP WITH</Typography>
      </Divider>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<KeyOutlinedIcon />}
          disabled={loading}
          onClick={() => setError('OTP signup coming soon!')}
        >
          OTP
        </Button>
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<MicIcon />}
          disabled={loading}
          onClick={() => setError('Voice signup coming soon!')}
        >
          Voice
        </Button>
      </Stack>
    </Paper>
  );
}
