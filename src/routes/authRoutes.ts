// src/routes/authRoutes.ts
import { Router } from 'express';
import {
  signupWithEmail,
  loginWithEmail,
  loginWithOAuth,
  handleOAuthCallback,
  getProfile,
  linkProvider,
  unlinkProvider,
  logout,
  getProviders,
  verifyToken,
  getLinkedProviders
} from '../controllers/authController';
import { 
  requireAuth, 
  requireAdmin, 
  requireProvider, 
  optionalAuth 
} from '../middleware/auth';
import { AuthProvider } from '../services/authService';

const router = Router();

/**
 * Public Authentication Routes
 */

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!' });
});

// Get available authentication providers
router.get('/providers', getProviders);

// Email authentication
router.post('/email/signup', signupWithEmail);
router.post('/email/login', loginWithEmail);

// OAuth authentication initiation
router.post('/oauth/:provider', loginWithOAuth);

// OAuth callback handler
router.post('/oauth/callback', handleOAuthCallback);

// Legacy routes for backward compatibility
router.post('/signup', signupWithEmail); // Falls back to email signup
router.post('/login', loginWithEmail);   // Falls back to email login

/**
 * Protected Authentication Routes (require authentication)
 */

// User profile and account management
router.get('/profile', requireAuth, getProfile);
router.get('/me', requireAuth, getProfile); // Alias for profile
router.post('/logout', requireAuth, logout);

// Token verification
router.get('/verify', requireAuth, verifyToken);

// Provider management
router.get('/providers/linked', requireAuth, getLinkedProviders);
router.post('/providers/:provider/link', requireAuth, linkProvider);
router.delete('/providers/:provider/unlink', requireAuth, unlinkProvider);

/**
 * Provider-specific Routes
 */

// Google-specific routes
router.get('/google/profile', requireAuth, requireProvider(AuthProvider.GOOGLE), getProfile);

// GitHub-specific routes  
router.get('/github/profile', requireAuth, requireProvider(AuthProvider.GITHUB), getProfile);

// Facebook-specific routes
router.get('/facebook/profile', requireAuth, requireProvider(AuthProvider.FACEBOOK), getProfile);

// Apple-specific routes
router.get('/apple/profile', requireAuth, requireProvider(AuthProvider.APPLE), getProfile);

// Discord-specific routes
router.get('/discord/profile', requireAuth, requireProvider(AuthProvider.DISCORD), getProfile);

/**
 * Admin-only Routes
 */

// Admin routes for user management
router.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
  // TODO: Implement admin user list
  res.json({ 
    success: true, 
    message: 'Admin user management not yet implemented' 
  });
});

/**
 * Development/Testing Routes (only in development)
 */
if (process.env.NODE_ENV === 'development') {
  // Test route to check authentication without requiring specific provider
  router.get('/test/any-provider', requireAuth, (req, res) => {
    const user = (req as any).user;
    res.json({
      success: true,
      message: 'Authentication successful',
      provider: user.auth_provider,
      user_id: user.id
    });
  });

  // Test route with optional authentication
  router.get('/test/optional-auth', optionalAuth, (req, res) => {
    const user = (req as any).user;
    res.json({
      success: true,
      authenticated: !!user,
      user_id: user?.id || null,
      provider: user?.auth_provider || null
    });
  });
}

export default router;