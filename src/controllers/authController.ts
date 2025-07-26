// src/controllers/authController.ts
import { Request, Response } from 'express';
import { authService, AuthProvider } from '../services/authService';
import { 
  emailSignupSchema, 
  emailLoginSchema, 
  oauthLoginSchema,
  linkProviderSchema
} from '../validators/authValidator';

/**
 * Email/Password Authentication Controllers
 */

// Email signup
export const signupWithEmail = async (req: Request, res: Response) => {
  try {
    const data = emailSignupSchema.parse(req.body);
    const result = await authService.signupWithEmail(data);
    
    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
      group: result.group
    });
  } catch (error: any) {
    console.error('Email signup error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to create account' 
    });
  }
};

// Email login
export const loginWithEmail = async (req: Request, res: Response) => {
  try {
    const data = emailLoginSchema.parse(req.body);
    const result = await authService.loginWithEmail(data);
    
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    console.error('Email login error:', error);
    res.status(401).json({ 
      error: error.message || 'Authentication failed' 
    });
  }
};

/**
 * OAuth Authentication Controllers
 */

// Initiate OAuth login
export const loginWithOAuth = async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const data = oauthLoginSchema.parse({ provider, ...req.body });
    
    if (!authService.isValidProvider(provider)) {
      return res.status(400).json({ error: 'Unsupported authentication provider' });
    }

    const result = await authService.loginWithOAuth(provider as AuthProvider, data);
    
    if (result.requires_redirect) {
      res.json({
        success: true,
        redirect_url: result.redirect_url,
        provider: provider
      });
    } else {
      res.json({
        success: true,
        token: result.token,
        user: result.user
      });
    }
  } catch (error: any) {
    console.error(`OAuth login error (${req.params.provider}):`, error);
    res.status(400).json({ 
      error: error.message || 'OAuth authentication failed' 
    });
  }
};

// Handle OAuth callback
export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { access_token, refresh_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    const result = await authService.handleOAuthCallback(access_token, refresh_token);
    
    res.json({
      success: true,
      token: result.token,
      user: result.user,
      group: result.group
    });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(400).json({ 
      error: error.message || 'OAuth callback failed' 
    });
  }
};

/**
 * User Profile and Account Management
 */

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const profile = await authService.getUserProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.json({
      success: true,
      user: profile
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve user profile' 
    });
  }
};

// Link additional provider to account
export const linkProvider = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { provider } = req.params;
    const data = linkProviderSchema.parse({ provider });
    
    if (!authService.isValidProvider(provider)) {
      return res.status(400).json({ error: 'Unsupported authentication provider' });
    }

    const result = await authService.linkProvider(userId, provider as AuthProvider);
    
    res.json({
      success: true,
      redirect_url: result.url,
      provider: provider,
      message: `Link ${provider} account by visiting the provided URL`
    });
  } catch (error: any) {
    console.error(`Link provider error (${req.params.provider}):`, error);
    res.status(400).json({ 
      error: error.message || 'Failed to link provider' 
    });
  }
};

// Unlink provider from account
export const unlinkProvider = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { provider } = req.params;
    
    if (!authService.isValidProvider(provider)) {
      return res.status(400).json({ error: 'Unsupported authentication provider' });
    }

    await authService.unlinkProvider(userId, provider as AuthProvider);
    
    res.json({
      success: true,
      message: `${provider} account unlinked successfully`
    });
  } catch (error: any) {
    console.error(`Unlink provider error (${req.params.provider}):`, error);
    res.status(400).json({ 
      error: error.message || 'Failed to unlink provider' 
    });
  }
};

/**
 * Authentication Status and Utilities
 */

// Logout (works for all providers)
export const logout = async (req: Request, res: Response) => {
  try {
    await authService.logout();
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed' 
    });
  }
};

// Get available authentication providers
export const getProviders = async (req: Request, res: Response) => {
  try {
    // Hardcode providers for now to test
    const providers = ['email', 'google', 'github', 'facebook', 'apple', 'discord'];
    
    res.json({
      success: true,
      providers: providers.map(provider => ({
        name: provider,
        display_name: provider.charAt(0).toUpperCase() + provider.slice(1),
        oauth_url: `/api/auth/oauth/${provider}`
      }))
    });
  } catch (error: any) {
    console.error('Get providers error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve providers' 
    });
  }
};

// Verify authentication token
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    res.json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        provider: user.auth_provider,
        group_id: user.group_id,
        is_admin: user.is_admin
      }
    });
  } catch (error: any) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Token verification failed' 
    });
  }
};

/**
 * Provider-specific information
 */

// Get user's linked providers
export const getLinkedProviders = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const supabaseUser = user.supabase_user;
    
    // Get identities from Supabase user
    const identities = supabaseUser.identities || [];
    const linkedProviders = identities.map((identity: any) => ({
      provider: identity.provider,
      provider_id: identity.id,
      created_at: identity.created_at,
      updated_at: identity.updated_at
    }));
    
    res.json({
      success: true,
      linked_providers: linkedProviders,
      primary_provider: user.auth_provider
    });
  } catch (error: any) {
    console.error('Get linked providers error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve linked providers' 
    });
  }
};