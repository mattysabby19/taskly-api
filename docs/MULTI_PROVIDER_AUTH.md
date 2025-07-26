# Multi-Provider Authentication System

The EquiTaskly-Api now supports multiple authentication providers including email/password, Google, GitHub, Facebook, Apple, and Discord. This document provides a comprehensive guide on how to use and integrate with the authentication system.

## Table of Contents

- [Overview](#overview)
- [Supported Providers](#supported-providers)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Migration Guide](#migration-guide)

## Overview

The multi-provider authentication system is built on top of Supabase Auth and provides:

- **Unified Authentication**: Single API interface for all providers
- **Account Linking**: Users can link multiple providers to one account
- **Provider Management**: Add/remove authentication methods
- **Backward Compatibility**: Existing email/password users continue to work
- **Enhanced Security**: Provider-specific access controls

## Supported Providers

| Provider | Type | Status | Features |
|----------|------|--------|----------|
| Email/Password | Traditional | ✅ Active | Password reset, email verification |
| Google | OAuth 2.0 | ✅ Active | Profile, avatar, email |
| GitHub | OAuth 2.0 | ✅ Active | Profile, avatar, public repositories |
| Facebook | OAuth 2.0 | ✅ Active | Profile, avatar, email |
| Apple | OAuth 2.0 | ✅ Active | Sign in with Apple, privacy focused |
| Discord | OAuth 2.0 | ✅ Active | Profile, avatar, guilds |

## API Endpoints

### Authentication Routes (`/api/auth`)

#### Provider Discovery
```http
GET /api/auth/providers
```
Returns list of available authentication providers.

#### Email Authentication
```http
POST /api/auth/email/signup
POST /api/auth/email/login
```

#### OAuth Authentication
```http
POST /api/auth/oauth/{provider}
POST /api/auth/oauth/callback
```

#### User Management
```http
GET /api/auth/profile
GET /api/auth/me
POST /api/auth/logout
GET /api/auth/verify
```

#### Provider Management
```http
GET /api/auth/providers/linked
POST /api/auth/providers/{provider}/link
DELETE /api/auth/providers/{provider}/unlink
```

### Legacy Routes (`/api/members/auth`)

For backward compatibility, the following routes are still available:
```http
POST /api/members/auth/signup
POST /api/members/auth/login
POST /api/members/auth/logout
```

## Authentication Flow

### Email/Password Flow

1. **Signup**
   ```http
   POST /api/auth/email/signup
   Content-Type: application/json
   
   {
     "email": "user@example.com",
     "password": "securePassword123",
     "name": "John Doe"
   }
   ```

2. **Login**
   ```http
   POST /api/auth/email/login
   Content-Type: application/json
   
   {
     "email": "user@example.com",
     "password": "securePassword123"
   }
   ```

3. **Response**
   ```json
   {
     "success": true,
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "uuid",
       "email": "user@example.com",
       "name": "John Doe",
       "provider": "email",
       "group_id": "group-uuid",
       "is_admin": true
     }
   }
   ```

### OAuth Flow

1. **Initiate OAuth**
   ```http
   POST /api/auth/oauth/google
   Content-Type: application/json
   
   {
     "redirectTo": "http://localhost:3000/auth/callback"
   }
   ```

2. **Response with Redirect URL**
   ```json
   {
     "success": true,
     "redirect_url": "https://accounts.google.com/oauth/authorize?...",
     "provider": "google"
   }
   ```

3. **Handle Callback**
   After user authorizes, handle the callback:
   ```http
   POST /api/auth/oauth/callback
   Content-Type: application/json
   
   {
     "access_token": "provider_access_token",
     "refresh_token": "provider_refresh_token"
   }
   ```

4. **Final Response**
   ```json
   {
     "success": true,
     "token": "jwt_token",
     "user": {
       "id": "uuid",
       "email": "user@gmail.com",
       "name": "John Doe",
       "avatar_url": "https://avatar.url",
       "provider": "google",
       "group_id": "group-uuid",
       "is_admin": true
     }
   }
   ```

## Database Schema

### Enhanced Members Table
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY,
  email VARCHAR(255),                    -- Nullable for OAuth users
  name VARCHAR(255),
  avatar_url TEXT,
  group_id UUID NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  auth_provider VARCHAR(20) DEFAULT 'email',
  provider_id VARCHAR(255),             -- Provider-specific user ID
  password_hash VARCHAR(255),           -- Only for email auth
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_provider_id UNIQUE (auth_provider, provider_id)
);
```

### Provider Accounts Table
```sql
CREATE TABLE provider_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id),
  provider VARCHAR(20) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  provider_name VARCHAR(255),
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_provider_account UNIQUE (provider, provider_id)
);
```

### User Sessions Table
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id),
  provider VARCHAR(20) NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP DEFAULT NOW()
);
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:8081

# Base URL for OAuth callbacks
BASE_URL=http://localhost:4000
```

### Supabase Provider Configuration

Configure OAuth providers in your Supabase dashboard:

1. **Google OAuth**
   - Enable Google provider
   - Set authorized domains
   - Configure OAuth consent screen

2. **GitHub OAuth**
   - Register OAuth app in GitHub
   - Set callback URL: `{BASE_URL}/auth/callback`

3. **Facebook Login**
   - Create Facebook app
   - Configure Facebook Login product

4. **Apple Sign In**
   - Configure Apple Developer account
   - Set up Sign in with Apple

5. **Discord OAuth**
   - Create Discord application
   - Set redirect URI

## Usage Examples

### Frontend Integration

#### React/TypeScript Example

```typescript
import { useState } from 'react';

interface AuthService {
  signupWithEmail(email: string, password: string, name: string): Promise<AuthResult>;
  loginWithEmail(email: string, password: string): Promise<AuthResult>;
  loginWithOAuth(provider: string): Promise<AuthResult>;
  getProfile(): Promise<UserProfile>;
  logout(): Promise<void>;
}

class ApiAuthService implements AuthService {
  private baseURL = 'http://localhost:4000/api/auth';

  async signupWithEmail(email: string, password: string, name: string) {
    const response = await fetch(`${this.baseURL}/email/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    return response.json();
  }

  async loginWithEmail(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/email/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  async loginWithOAuth(provider: string) {
    const response = await fetch(`${this.baseURL}/oauth/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        redirectTo: `${window.location.origin}/auth/callback` 
      })
    });
    return response.json();
  }

  async getProfile() {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${this.baseURL}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async logout() {
    const token = localStorage.getItem('auth_token');
    await fetch(`${this.baseURL}/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    localStorage.removeItem('auth_token');
  }
}

// Usage in component
const LoginForm = () => {
  const [authService] = useState(new ApiAuthService());

  const handleGoogleLogin = async () => {
    const result = await authService.loginWithOAuth('google');
    if (result.redirect_url) {
      window.location.href = result.redirect_url;
    }
  };

  const handleEmailLogin = async (email: string, password: string) => {
    const result = await authService.loginWithEmail(email, password);
    if (result.success) {
      localStorage.setItem('auth_token', result.token);
      // Redirect to app
    }
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>
        Sign in with Google
      </button>
      {/* Email form */}
    </div>
  );
};
```

#### React Native Example

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

class MobileAuthService {
  private baseURL = 'http://10.0.2.2:4000/api/auth'; // Android emulator

  async loginWithOAuth(provider: string) {
    const response = await fetch(`${this.baseURL}/oauth/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        redirectTo: 'equitaskly://auth/callback' 
      })
    });
    
    const result = await response.json();
    if (result.redirect_url) {
      await Linking.openURL(result.redirect_url);
    }
    return result;
  }

  async handleDeepLink(url: string) {
    // Parse OAuth callback from deep link
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const accessToken = urlParams.get('access_token');
    
    if (accessToken) {
      const response = await fetch(`${this.baseURL}/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken })
      });
      
      const result = await response.json();
      if (result.success) {
        await AsyncStorage.setItem('auth_token', result.token);
      }
      return result;
    }
  }
}
```

### Provider-Specific Features

#### Access Control by Provider

```typescript
// Require specific authentication provider
app.get('/api/admin/google-users', 
  requireAuth, 
  requireProvider(AuthProvider.GOOGLE),
  (req, res) => {
    // Only Google-authenticated users can access
    res.json({ message: 'Google users only' });
  }
);

// Allow multiple providers
app.get('/api/oauth-users',
  requireAuth,
  requireProvider([AuthProvider.GOOGLE, AuthProvider.GITHUB]),
  (req, res) => {
    // Google or GitHub users only
    res.json({ message: 'OAuth users only' });
  }
);
```

#### Account Linking

```typescript
// Link additional provider
const linkGitHub = async () => {
  const response = await fetch('/api/auth/providers/github/link', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const result = await response.json();
  if (result.redirect_url) {
    window.location.href = result.redirect_url;
  }
};

// Get linked providers
const getLinkedProviders = async () => {
  const response = await fetch('/api/auth/providers/linked', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const result = await response.json();
  console.log('Linked providers:', result.linked_providers);
};
```

## Testing

### Unit Tests

Run the authentication tests:

```bash
npm test -- auth.test.ts
```

### Integration Testing

Test OAuth flows in development:

```bash
# Start the server
npm run dev

# Test email authentication
curl -X POST http://localhost:4000/api/auth/email/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test OAuth initiation
curl -X POST http://localhost:4000/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"redirectTo":"http://localhost:3000/callback"}'

# Test provider list
curl http://localhost:4000/api/auth/providers
```

### Test with Different Providers

Use the development test routes:

```bash
# Test any provider authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/auth/test/any-provider

# Test optional authentication
curl http://localhost:4000/api/auth/test/optional-auth
```

## Migration Guide

### From Single Provider to Multi-Provider

1. **Database Migration**
   ```bash
   # Run the migration script
   psql -d your_database -f database/migrations/001_add_multi_provider_auth.sql
   ```

2. **Update Client Code**
   - Replace direct Supabase calls with API calls
   - Update authentication state management
   - Add provider selection UI

3. **Configuration**
   - Set up OAuth providers in Supabase
   - Update environment variables
   - Configure callback URLs

### Backward Compatibility

Existing users with email/password authentication will continue to work without changes. The system automatically:

- Sets `auth_provider = 'email'` for existing users
- Maintains existing password hashes
- Preserves all existing functionality

### Breaking Changes

⚠️ **Important**: The following changes may require client updates:

1. **User Object Structure**: Additional fields added to user profile
2. **Authentication Headers**: Enhanced token validation
3. **Error Responses**: More detailed error information

## Troubleshooting

### Common Issues

1. **OAuth Redirect Issues**
   ```
   Error: Invalid redirect URI
   Solution: Ensure redirect URI is registered with OAuth provider
   ```

2. **Token Validation Failures**
   ```
   Error: Unauthorized
   Solution: Check token format and expiration
   ```

3. **Provider Not Available**
   ```
   Error: Unsupported authentication provider
   Solution: Verify provider is enabled in Supabase dashboard
   ```

### Debug Mode

Enable debug logging:

```env
DEBUG=auth:*
NODE_ENV=development
```

### Support

For issues and questions:
- Check the [API documentation](./API.md)
- Review [test examples](../src/tests/auth.test.ts)
- Enable debug logging for detailed error information