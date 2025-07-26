// src/tests/auth.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { authService, AuthProvider } from '../services/authService';
import {
  emailSignupSchema,
  emailLoginSchema,
  oauthLoginSchema,
  validateEmailSignup,
  validateEmailLogin,
  validateOAuthLogin
} from '../validators/authValidator';

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
      linkIdentity: jest.fn(),
      unlinkIdentity: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Authentication', () => {
    describe('signupWithEmail', () => {
      it('should create a new user with email and password', async () => {
        const mockAuthData = {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' }
        };

        const { supabase } = require('../config/supabase');
        supabase.auth.signUp.mockResolvedValue({ data: mockAuthData, error: null });
        supabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        });

        const userData = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        };

        const result = await authService.signupWithEmail(userData);

        expect(result.user.email).toBe('test@example.com');
        expect(result.user.provider).toBe(AuthProvider.EMAIL);
        expect(result.token).toBe('token-123');
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              name: userData.name,
              role: 'admin',
              clientid: expect.any(String),
              auth_provider: AuthProvider.EMAIL
            }
          }
        });
      });

      it('should handle signup errors', async () => {
        const { supabase } = require('../config/supabase');
        supabase.auth.signUp.mockResolvedValue({ 
          data: null, 
          error: new Error('Email already exists') 
        });

        const userData = {
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User'
        };

        await expect(authService.signupWithEmail(userData)).rejects.toThrow('Email already exists');
      });
    });

    describe('loginWithEmail', () => {
      it('should authenticate user with email and password', async () => {
        const mockResponse = {
          user: { 
            id: 'user-123', 
            email: 'test@example.com',
            user_metadata: { name: 'Test User', clientid: 'group-123', role: 'admin' }
          },
          session: { access_token: 'token-123' }
        };

        const { supabase } = require('../config/supabase');
        supabase.auth.signInWithPassword.mockResolvedValue({ data: mockResponse, error: null });

        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };

        const result = await authService.loginWithEmail(loginData);

        expect(result.user.email).toBe('test@example.com');
        expect(result.user.provider).toBe(AuthProvider.EMAIL);
        expect(result.token).toBe('token-123');
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: loginData.email,
          password: loginData.password
        });
      });

      it('should handle login errors', async () => {
        const { supabase } = require('../config/supabase');
        supabase.auth.signInWithPassword.mockResolvedValue({ 
          data: null, 
          error: new Error('Invalid credentials') 
        });

        const loginData = {
          email: 'wrong@example.com',
          password: 'wrongpassword'
        };

        await expect(authService.loginWithEmail(loginData)).rejects.toThrow('Invalid credentials');
      });
    });
  });

  describe('OAuth Authentication', () => {
    describe('loginWithOAuth', () => {
      it('should initiate OAuth flow for Google', async () => {
        const mockOAuthData = {
          url: 'https://accounts.google.com/oauth/authorize?...'
        };

        const { supabase } = require('../config/supabase');
        supabase.auth.signInWithOAuth.mockResolvedValue({ data: mockOAuthData, error: null });

        const result = await authService.loginWithOAuth(AuthProvider.GOOGLE, {
          provider: AuthProvider.GOOGLE,
          redirectTo: 'http://localhost:3000/auth/callback'
        });

        expect(result.requires_redirect).toBe(true);
        expect(result.redirect_url).toBe(mockOAuthData.url);
        expect(result.user.provider).toBe(AuthProvider.GOOGLE);
        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/auth/callback',
            scopes: undefined
          }
        });
      });

      it('should handle OAuth initiation errors', async () => {
        const { supabase } = require('../config/supabase');
        supabase.auth.signInWithOAuth.mockResolvedValue({ 
          data: null, 
          error: new Error('OAuth provider not configured') 
        });

        await expect(authService.loginWithOAuth(AuthProvider.GITHUB))
          .rejects.toThrow('OAuth provider not configured');
      });
    });

    describe('handleOAuthCallback', () => {
      it('should handle OAuth callback for new user', async () => {
        const mockUser = {
          id: 'oauth-user-123',
          email: 'user@gmail.com',
          user_metadata: { 
            name: 'Google User',
            avatar_url: 'https://avatar.url',
            provider_id: 'google-123'
          },
          app_metadata: { provider: 'google' }
        };

        const { supabase } = require('../config/supabase');
        supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          insert: jest.fn().mockResolvedValue({ error: null })
        });

        const result = await authService.handleOAuthCallback('access-token', 'refresh-token');

        expect(result.user.email).toBe('user@gmail.com');
        expect(result.user.provider).toBe(AuthProvider.GOOGLE);
        expect(result.user.name).toBe('Google User');
        expect(result.token).toBe('access-token');
      });

      it('should handle OAuth callback for existing user', async () => {
        const mockUser = {
          id: 'existing-user-123',
          email: 'existing@gmail.com',
          user_metadata: { name: 'Existing User' },
          app_metadata: { provider: 'google' }
        };

        const mockExistingMember = {
          id: 'existing-user-123',
          email: 'existing@gmail.com',
          group_id: 'existing-group-123',
          is_admin: true,
          auth_provider: 'google'
        };

        const { supabase } = require('../config/supabase');
        supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockExistingMember, error: null })
        });

        const result = await authService.handleOAuthCallback('access-token');

        expect(result.user.email).toBe('existing@gmail.com');
        expect(result.user.group_id).toBe('existing-group-123');
        expect(result.user.is_admin).toBe(true);
      });
    });
  });

  describe('Provider Management', () => {
    describe('linkProvider', () => {
      it('should link additional provider to account', async () => {
        const mockLinkData = {
          url: 'https://github.com/login/oauth/authorize?...'
        };

        const { supabase } = require('../config/supabase');
        supabase.auth.linkIdentity.mockResolvedValue({ data: mockLinkData, error: null });

        const result = await authService.linkProvider('user-123', AuthProvider.GITHUB);

        expect(result.url).toBe(mockLinkData.url);
        expect(supabase.auth.linkIdentity).toHaveBeenCalledWith({
          provider: 'github'
        });
      });
    });

    describe('unlinkProvider', () => {
      it('should unlink provider from account', async () => {
        const { supabase } = require('../config/supabase');
        supabase.auth.unlinkIdentity.mockResolvedValue({ error: null });

        await expect(authService.unlinkProvider('user-123', AuthProvider.FACEBOOK))
          .resolves.not.toThrow();

        expect(supabase.auth.unlinkIdentity).toHaveBeenCalledWith({
          provider: 'facebook'
        });
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getAvailableProviders', () => {
      it('should return list of available providers', () => {
        const providers = authService.getAvailableProviders();
        
        expect(providers).toContain(AuthProvider.GOOGLE);
        expect(providers).toContain(AuthProvider.GITHUB);
        expect(providers).toContain(AuthProvider.FACEBOOK);
        expect(providers).toContain(AuthProvider.APPLE);
        expect(providers).toContain(AuthProvider.DISCORD);
        expect(providers).not.toContain(AuthProvider.EMAIL);
      });
    });

    describe('isValidProvider', () => {
      it('should validate provider strings', () => {
        expect(authService.isValidProvider('google')).toBe(true);
        expect(authService.isValidProvider('github')).toBe(true);
        expect(authService.isValidProvider('email')).toBe(true);
        expect(authService.isValidProvider('invalid')).toBe(false);
        expect(authService.isValidProvider('')).toBe(false);
      });
    });
  });
});

describe('Authentication Validators', () => {
  describe('emailSignupSchema', () => {
    it('should validate correct email signup data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const result = validateEmailSignup(validData);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('password123');
      expect(result.name).toBe('Test User');
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      };

      expect(() => validateEmailSignup(invalidData)).toThrow('Invalid email address');
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      };

      expect(() => validateEmailSignup(invalidData)).toThrow('Password must be at least 6 characters');
    });

    it('should reject empty name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: ''
      };

      expect(() => validateEmailSignup(invalidData)).toThrow('Name is required');
    });
  });

  describe('emailLoginSchema', () => {
    it('should validate correct email login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = validateEmailLogin(validData);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('password123');
    });
  });

  describe('oauthLoginSchema', () => {
    it('should validate OAuth login data', () => {
      const validData = {
        provider: AuthProvider.GOOGLE,
        redirectTo: 'http://localhost:3000/callback',
        scopes: 'email profile'
      };

      const result = validateOAuthLogin(validData);
      expect(result.provider).toBe(AuthProvider.GOOGLE);
      expect(result.redirectTo).toBe('http://localhost:3000/callback');
      expect(result.scopes).toBe('email profile');
    });

    it('should reject invalid provider', () => {
      const invalidData = {
        provider: 'invalid-provider'
      };

      expect(() => validateOAuthLogin(invalidData)).toThrow('Invalid authentication provider');
    });

    it('should reject invalid redirect URL', () => {
      const invalidData = {
        provider: AuthProvider.GOOGLE,
        redirectTo: 'not-a-url'
      };

      expect(() => validateOAuthLogin(invalidData)).toThrow('Invalid redirect URL');
    });
  });
});