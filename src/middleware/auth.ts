import { RequestHandler } from 'express';
import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
import { AuthProvider, authService } from '../services/authService';

export const getSupabaseForUser = (token: string) =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,  // use anon key, not service key
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

/**
 * Enhanced authentication middleware supporting multiple providers
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Get user from Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = data.user;
    
    // Get enhanced user profile with provider information
    const userProfile = await authService.getUserProfile(user.id);
    
    if (!userProfile) {
      // Fallback to basic user info if profile not found
      console.warn(`User profile not found for user ${user.id}, using basic auth data`);
    }

    // Enhanced user object with provider information
    (req as any).user = {
      id: user.id,
      email: user.email || userProfile?.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name || userProfile?.name,
      avatar_url: user.user_metadata?.avatar_url || userProfile?.avatar_url,
      role: user.user_metadata?.role || (userProfile?.is_admin ? 'admin' : 'member'),
      clientid: user.user_metadata?.clientid || userProfile?.group_id,
      group_id: user.user_metadata?.clientid || userProfile?.group_id,
      is_admin: userProfile?.is_admin ?? (user.user_metadata?.role === 'admin'),
      auth_provider: userProfile?.provider || user.app_metadata?.provider || AuthProvider.EMAIL,
      provider_id: userProfile?.provider_id || user.user_metadata?.provider_id,
      // Supabase user data for advanced operations
      supabase_user: user
    };

    console.log(`[AUTH] User authenticated: ${user.id} via ${(req as any).user.auth_provider}`);
    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;
  
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (!user.is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
};

/**
 * Middleware to validate specific auth provider
 */
export const requireProvider = (providers: AuthProvider | AuthProvider[]) => {
  const allowedProviders = Array.isArray(providers) ? providers : [providers];
  
  return ((req, res, next) => {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!allowedProviders.includes(user.auth_provider)) {
      res.status(403).json({ 
        error: `Access restricted to ${allowedProviders.join(', ')} authentication only` 
      });
      return;
    }
    
    next();
  }) as RequestHandler;
};

/**
 * Optional auth middleware - doesn't fail if no token provided
 */
export const optionalAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    (req as any).user = null;
    next();
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      (req as any).user = null;
    } else {
      const user = data.user;
      const userProfile = await authService.getUserProfile(user.id);
      
      (req as any).user = {
        id: user.id,
        email: user.email || userProfile?.email,
        name: user.user_metadata?.name || userProfile?.name,
        avatar_url: user.user_metadata?.avatar_url || userProfile?.avatar_url,
        role: user.user_metadata?.role || (userProfile?.is_admin ? 'admin' : 'member'),
        clientid: user.user_metadata?.clientid || userProfile?.group_id,
        group_id: user.user_metadata?.clientid || userProfile?.group_id,
        is_admin: userProfile?.is_admin ?? (user.user_metadata?.role === 'admin'),
        auth_provider: userProfile?.provider || user.app_metadata?.provider || AuthProvider.EMAIL,
        provider_id: userProfile?.provider_id || user.user_metadata?.provider_id,
        supabase_user: user
      };
    }
  } catch (error) {
    console.warn('[AUTH] Optional auth failed:', error);
    (req as any).user = null;
  }
  
  next();
};
