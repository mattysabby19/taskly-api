 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Authentication endpoints for testing
app.get('/api/auth/providers', (req, res) => {
  res.json({
    success: true,
    providers: [
      { name: 'email', display_name: 'Email', oauth_url: '/api/auth/oauth/email' },
      { name: 'google', display_name: 'Google', oauth_url: '/api/auth/oauth/google' },
      { name: 'github', display_name: 'GitHub', oauth_url: '/api/auth/oauth/github' },
      { name: 'facebook', display_name: 'Facebook', oauth_url: '/api/auth/oauth/facebook' },
      { name: 'apple', display_name: 'Apple', oauth_url: '/api/auth/oauth/apple' },
      { name: 'discord', display_name: 'Discord', oauth_url: '/api/auth/oauth/discord' }
    ]
  });
});

// Email signup (MOCK)
app.post('/api/auth/email/signup', (req, res) => {
  console.log('🎭 MOCK SIGNUP ENDPOINT HIT:', req.body);
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  console.log('🎭 MOCK SIGNUP RESPONDING WITH SUCCESS');
  res.status(201).json({
    success: true,
    message: 'User created successfully (MOCK)',
    user: { id: 'mock-user-id-' + Date.now(), email, name: name || 'Test User' },
    token: 'mock-jwt-token-signup-' + Date.now()
  });
});

// Email login  
app.post('/api/auth/email/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (email === 'test@example.com' && password === 'SecurePass123!') {
    res.json({
      success: true,
      message: 'Login successful',
      user: { id: 'test-user-id', email, name: 'Test User', provider: 'email' },
      token: 'mock-jwt-token-login'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// OAuth initiation
app.post('/api/auth/oauth/:provider', (req, res) => {
  const { provider } = req.params;
  const validProviders = ['google', 'github', 'facebook', 'apple', 'discord'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Unsupported provider' });
  }
  res.json({
    success: true,
    auth_url: `https://${provider}.com/oauth/authorize?client_id=test&redirect_uri=callback`,
    state: 'random-state-value'
  });
});

// OAuth callback
app.post('/api/auth/oauth/callback', (req, res) => {
  const { provider, code, state } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }
  const providerName = provider || 'google'; // Default to google if not specified
  res.json({
    success: true,
    message: 'OAuth callback successful',
    user: { id: 'oauth-user-id', email: `user@${providerName}.com`, name: 'OAuth User', provider: providerName },
    token: 'mock-jwt-token-oauth'
  });
});

// Get profile (protected route simulation)
app.get('/api/auth/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];
  if (token.startsWith('mock-jwt-token')) {
    res.json({
      success: true,
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'email',
        is_admin: false,
        group_id: 'test-group-id'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get linked providers
app.get('/api/auth/providers/linked', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  res.json({
    success: true,
    linked_providers: [
      { provider: 'email', provider_id: 'test@example.com', linked_at: new Date().toISOString() }
    ],
    primary_provider: 'email'
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Token verification
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];
  if (token.startsWith('mock-jwt-token')) {
    res.json({
      success: true,
      valid: true,
      user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User', provider: 'email' }
    });
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Load other routes after the test route works
// COMMENTED OUT: These routes import real Supabase auth middleware which conflicts with mock mode
// try {
//   const memberRoutes = require('./routes/memberRoutes').default;
//   const taskRoutes = require('./routes/taskRoutes').default;
//   
//   app.use('/api/members', memberRoutes);
//   app.use('/api/tasks', taskRoutes);
// } catch (error) {
//   console.error('Error loading routes:', error);
// }



app.get('/', (_req, res) => {
  res.send('EquiTaskly Api is running 🚀');
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Mobile app can connect to:`);
  console.log(`   - iOS Simulator: http://localhost:${PORT}`);
  console.log(`   - Android Emulator: http://10.0.2.2:${PORT}`);
});
