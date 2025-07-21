// Enhanced Authentication & Authorization Middleware
// Single session, RBAC, rate limiting, security monitoring

import { RequestHandler } from 'express';
import { supabase } from '../config/supabase';
import { enhancedAuthService } from '../services/enhancedAuthService';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createHash } from 'crypto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    name?: string;
    current_group_id?: string;
    permissions: string[];
    session_id: string;
    is_admin: boolean;
    memberships: any[];
  };
}

/**
 * Rate Limiting Middleware
 */
export const createRateLimit = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  max: number = 100, // requests per window
  message: string = 'Too many requests from this IP'
) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res) => {
      // Log rate limit violation
      await logSecurityEvent('rate_limit_exceeded', {
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });
      
      res.status(429).json({ error: message });
    }
  });
};

/**
 * Slow Down Middleware (progressive delay)
 */
export const createSlowDown = (
  windowMs: number = 15 * 60 * 1000,
  delayAfter: number = 5,
  delayMs: number = 500
) => {
  return slowDown({
    windowMs,
    delayAfter,
    delayMs: () => delayMs, // Fix for express-slow-down v2
    maxDelayMs: 10000, // Maximum 10 second delay
    validate: { delayMs: false } // Disable warning
  });
};

/**
 * Enhanced Authentication Middleware
 * Validates JWT token, checks session status, and handles auto-logout
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Validate token with Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authData?.user) {
      await logSecurityEvent('invalid_token', {
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        token_prefix: token.substring(0, 10) + '...'
      });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = authData.user;

    // Check session status and single session policy
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('member_id', user.id)
      .eq('session_token', token)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      await logSecurityEvent('invalid_session', {
        ip: req.ip,
        user_id: user.id,
        reason: 'Session not found or inactive'
      });
      return res.status(401).json({ error: 'Session invalid or expired' });
    }

    // Check if session has expired
    if (new Date(session.expires_at) <= new Date()) {
      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_reason: 'expired'
        })
        .eq('id', session.id);

      return res.status(401).json({ error: 'Session expired' });
    }

    // Check auto-logout (inactivity)
    if (new Date(session.auto_logout_at) <= new Date()) {
      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_reason: 'auto_logout'
        })
        .eq('id', session.id);

      await logSecurityEvent('auto_logout', {
        user_id: user.id,
        session_id: session.id
      });

      return res.status(401).json({ error: 'Session timed out due to inactivity' });
    }

    // Security checks
    await performSecurityChecks(user.id, session, req);

    // Update session activity
    await supabase
      .from('user_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
        auto_logout_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
        ip_address: req.ip
      })
      .eq('id', session.id);

    // Get user profile with memberships and permissions
    const userProfile = await enhancedAuthService.getUserProfile(user.id);
    
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get current group memberships and permissions
    const memberships = await enhancedAuthService.getUserMemberships(user.id);
    
    // Determine current group (from header or most recent)
    const requestedGroupId = req.headers['x-group-id'] as string;
    const currentMembership = requestedGroupId ? 
      memberships.find(m => m.group_id === requestedGroupId && m.status === 'active') :
      memberships.find(m => m.status === 'active'); // Default to first active

    if (requestedGroupId && !currentMembership) {
      return res.status(403).json({ error: 'Access denied: not a member of requested group' });
    }

    // Set enhanced user object
    (req as any).user = {
      id: user.id,
      email: user.email,
      name: userProfile.name,
      current_group_id: currentMembership?.group_id,
      permissions: currentMembership?.permissions || [],
      session_id: session.id,
      is_admin: currentMembership?.role === 'admin',
      memberships,
      // Additional context
      auth_provider: userProfile.provider,
      device_info: {
        device_id: session.device_id,
        device_type: session.device_type,
        platform: session.platform
      }
    };

    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    await logSecurityEvent('auth_error', {
      ip: req.ip,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    
    res.status(500).json({ error: 'Authentication service error' });
  }
};

/**
 * Permission-based Authorization Middleware
 */
export const requirePermission = (permission: string): RequestHandler => {
  return (req, res, next) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!user.permissions.includes(permission)) {
      logSecurityEvent('permission_denied', {
        user_id: user.id,
        group_id: user.current_group_id,
        required_permission: permission,
        user_permissions: user.permissions,
        ip: req.ip,
        endpoint: req.path
      });
      
      return res.status(403).json({ 
        error: `Access denied: requires permission '${permission}'`
      });
    }
    
    next();
  };
};

/**
 * Role-based Authorization Middleware
 */
export const requireRole = (roles: string | string[]): RequestHandler => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return async (req, res, next) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = user.memberships.find(
      (m: any) => m.group_id === user.current_group_id
    )?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      await logSecurityEvent('role_denied', {
        user_id: user.id,
        group_id: user.current_group_id,
        required_roles: allowedRoles,
        user_role: userRole,
        ip: req.ip,
        endpoint: req.path
      });
      
      return res.status(403).json({ 
        error: `Access denied: requires role ${allowedRoles.join(' or ')}`
      });
    }
    
    next();
  };
};

/**
 * Group Membership Middleware
 */
export const requireGroupMembership: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;
  const groupId = req.params.groupId || req.body.groupId || req.query.groupId;

  if (!groupId) {
    return res.status(400).json({ error: 'Group ID required' });
  }

  if (!user.current_group_id || user.current_group_id !== groupId) {
    const isMember = user.memberships.some(
      (m: any) => m.group_id === groupId && m.status === 'active'
    );

    if (!isMember) {
      await logSecurityEvent('group_access_denied', {
        user_id: user.id,
        requested_group_id: groupId,
        user_groups: user.memberships.map((m: any) => m.group_id),
        ip: req.ip
      });
      
      return res.status(403).json({ error: 'Access denied: not a member of this group' });
    }
  }

  next();
};

/**
 * Admin-only Middleware
 */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!user.is_admin) {
    await logSecurityEvent('admin_access_denied', {
      user_id: user.id,
      group_id: user.current_group_id,
      ip: req.ip,
      endpoint: req.path
    });
    
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

/**
 * Analytics Viewer Middleware
 */
export const requireAnalyticsAccess: RequestHandler = (req, res, next) => {
  return requirePermission('analytics:view')(req, res, next);
};

/**
 * Optional Authentication (doesn't fail if no token)
 */
export const optionalAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    (req as any).user = null;
    return next();
  }

  try {
    // Use the same logic as requireAuth but don't fail
    await requireAuth(req, res, next);
  } catch (error) {
    // If auth fails, continue without user
    (req as any).user = null;
    next();
  }
};

/**
 * Offline Token Validation Middleware
 */
export const validateOfflineToken: RequestHandler = async (req, res, next) => {
  const offlineToken = req.headers['x-offline-token'] as string;

  if (!offlineToken) {
    return res.status(401).json({ error: 'Offline token required' });
  }

  try {
    const validation = await enhancedAuthService.validateOfflineToken(offlineToken);
    
    if (!validation.valid) {
      return res.status(401).json({ error: 'Invalid or expired offline token' });
    }

    // Set minimal user context for offline operations
    (req as any).user = {
      id: validation.user_id,
      offline: true,
      device_info: validation.device_info
    };

    next();
  } catch (error) {
    console.error('[AUTH] Offline token validation error:', error);
    res.status(500).json({ error: 'Offline authentication failed' });
  }
};

/**
 * Device Registration Middleware
 */
export const requireRegisteredDevice: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;
  const deviceId = req.headers['x-device-id'] as string;

  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID required' });
  }

  if (!user?.device_info?.device_id || user.device_info.device_id !== deviceId) {
    await logSecurityEvent('unregistered_device', {
      user_id: user?.id,
      provided_device_id: deviceId,
      registered_device_id: user?.device_info?.device_id,
      ip: req.ip
    });
    
    return res.status(403).json({ error: 'Device not registered' });
  }

  next();
};

/**
 * GDPR Compliance Middleware
 */
export const requireDataProcessingConsent: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user has given data processing consent
  const { data: consent } = await supabase
    .from('data_consent')
    .select('granted')
    .eq('member_id', user.id)
    .eq('consent_type', 'functional')
    .order('granted_at', { ascending: false })
    .limit(1)
    .single();

  if (!consent?.granted) {
    return res.status(451).json({ 
      error: 'Data processing consent required',
      code: 'CONSENT_REQUIRED'
    });
  }

  next();
};

// Helper Functions

async function performSecurityChecks(
  userId: string, 
  session: any, 
  req: any
): Promise<void> {
  // Check for suspicious activity
  const currentIp = req.ip;
  const sessionIp = session.ip_address;

  // IP address change detection
  if (sessionIp && sessionIp !== currentIp) {
    await logSecurityEvent('ip_address_change', {
      user_id: userId,
      session_id: session.id,
      old_ip: sessionIp,
      new_ip: currentIp,
      severity: 'medium'
    });
  }

  // Check for concurrent sessions (should not happen with single session policy)
  const { data: activeSessions } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('member_id', userId)
    .eq('is_active', true);

  if (activeSessions && activeSessions.length > 1) {
    await logSecurityEvent('multiple_active_sessions', {
      user_id: userId,
      session_count: activeSessions.length,
      severity: 'high'
    });

    // Revoke all but current session
    await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: 'multiple_sessions_detected'
      })
      .eq('member_id', userId)
      .eq('is_active', true)
      .neq('id', session.id);
  }

  // Check for unusual user agent changes
  const currentUserAgent = req.get('User-Agent');
  if (session.user_agent && session.user_agent !== currentUserAgent) {
    const similarity = calculateUserAgentSimilarity(session.user_agent, currentUserAgent);
    
    if (similarity < 0.8) { // Less than 80% similar
      await logSecurityEvent('user_agent_change', {
        user_id: userId,
        session_id: session.id,
        old_user_agent: session.user_agent,
        new_user_agent: currentUserAgent,
        similarity,
        severity: 'low'
      });
    }
  }
}

async function logSecurityEvent(
  eventType: string, 
  details: any
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      event_type: 'security',
      action: eventType,
      details,
      risk_score: calculateRiskScore(eventType, details),
      created_at: new Date().toISOString()
    });

    // Create security incident for high-risk events
    if (details.severity === 'high' || details.severity === 'critical') {
      await supabase.from('security_incidents').insert({
        incident_type: eventType,
        severity: details.severity || 'medium',
        member_id: details.user_id,
        ip_address: details.ip,
        details,
        automated_response: getAutomatedResponse(eventType)
      });
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

function calculateRiskScore(eventType: string, details: any): number {
  const riskScores: { [key: string]: number } = {
    'rate_limit_exceeded': 30,
    'invalid_token': 40,
    'invalid_session': 50,
    'permission_denied': 20,
    'role_denied': 25,
    'group_access_denied': 35,
    'admin_access_denied': 60,
    'unregistered_device': 70,
    'ip_address_change': 40,
    'multiple_active_sessions': 80,
    'user_agent_change': 20,
    'auto_logout': 10
  };

  let baseScore = riskScores[eventType] || 30;

  // Adjust based on severity
  if (details.severity === 'critical') baseScore += 30;
  else if (details.severity === 'high') baseScore += 20;
  else if (details.severity === 'medium') baseScore += 10;

  return Math.min(baseScore, 100);
}

function getAutomatedResponse(eventType: string): string {
  const responses: { [key: string]: string } = {
    'multiple_active_sessions': 'Revoked all other active sessions',
    'unregistered_device': 'Blocked access from unregistered device',
    'rate_limit_exceeded': 'Applied rate limiting',
    'invalid_token': 'Rejected request with invalid token'
  };

  return responses[eventType] || 'Logged security event';
}

function calculateUserAgentSimilarity(ua1: string, ua2: string): number {
  // Simple similarity calculation
  const words1 = ua1.toLowerCase().split(/\W+/);
  const words2 = ua2.toLowerCase().split(/\W+/);
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  return intersection.length / union.length;
}

// Rate limiting configurations for different endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts'
);

export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'API rate limit exceeded'
);

export const sensitiveRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 attempts
  'Too many sensitive operations'
);

export const authSlowDown = createSlowDown(
  15 * 60 * 1000, // 15 minutes
  2, // Start slowing down after 2 requests
  500 // 500ms delay
);