// Security Configuration
// CORS, validation, encryption, security headers

import cors from 'cors';
import helmet from 'helmet';
import { Request } from 'express';
import crypto from 'crypto';

// CORS Configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:19006', // Expo dev server
      'https://localhost:3000',
      process.env.FRONTEND_URL,
      process.env.MOBILE_APP_URL,
      // Add your production domains
      'https://yourdomain.com',
      'https://app.yourdomain.com'
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log unauthorized origin attempts
    console.warn(`CORS: Unauthorized origin attempt: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Group-ID',
    'X-Device-ID',
    'X-Offline-Token',
    'X-App-Version',
    'X-Platform'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  maxAge: 86400 // 24 hours
};

// Helmet Configuration for Security Headers
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL].filter(Boolean),
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
};

// Input Validation Configuration
export const validationConfig = {
  // Maximum request body size
  maxBodySize: '10mb',
  
  // Field length limits
  maxStringLength: 10000,
  maxArrayLength: 1000,
  
  // Password requirements
  passwordRequirements: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    disallowCommon: true
  },
  
  // Email validation
  emailRegex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // File upload restrictions
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  
  // SQL injection patterns to detect
  sqlInjectionPatterns: [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i
  ],
  
  // XSS patterns to detect
  xssPatterns: [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src[^>]*>/gi
  ]
};

// Encryption Configuration
export const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  
  // Generate encryption key from environment variable
  getEncryptionKey: (): Buffer => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    return crypto.scryptSync(key, 'salt', 32);
  }
};

// Session Configuration
export const sessionConfig = {
  defaultDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
  refreshThreshold: 24 * 60 * 60 * 1000, // 24 hours
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  
  // Single session policy
  enforceSingleSession: true,
  
  // Offline token settings
  offlineTokenDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableOfflineTokens: true
};

// Rate Limiting Configuration
export const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests
    skipSuccessfulRequests: false
  },
  
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts
    skipSuccessfulRequests: true
  },
  
  export: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 exports per hour
    skipSuccessfulRequests: true
  }
};

// Security Monitoring Configuration
export const monitoringConfig = {
  // Risk score thresholds
  riskThresholds: {
    low: 30,
    medium: 50,
    high: 70,
    critical: 90
  },
  
  // Automated responses
  autoBlock: {
    enabled: true,
    highRiskThreshold: 80,
    blockDuration: 60 * 60 * 1000 // 1 hour
  },
  
  // Alert thresholds
  alertThresholds: {
    failedLogins: 10, // per hour
    suspiciousIPs: 5, // per hour
    rateLimitViolations: 50, // per hour
    permissionDenials: 20 // per hour
  },
  
  // Geolocation monitoring
  geolocation: {
    enabled: true,
    alertOnNewCountry: true,
    alertOnDistanceThreshold: 1000 // kilometers
  }
};

// GDPR Configuration
export const gdprConfig = {
  dataRetention: {
    auditLogs: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    sessions: 90 * 24 * 60 * 60 * 1000, // 90 days
    deletedUsers: 30 * 24 * 60 * 60 * 1000, // 30 days
    consents: 3 * 365 * 24 * 60 * 60 * 1000 // 3 years
  },
  
  processingTimeframes: {
    dataExport: 30 * 24 * 60 * 60 * 1000, // 30 days
    dataDeletion: 30 * 24 * 60 * 60 * 1000, // 30 days
    accessRequest: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  
  consentVersion: '1.0',
  privacyPolicyVersion: '1.0'
};

// Security Utilities
export class SecurityUtils {
  
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 12);
  }
  
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }
  
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }
  
  static encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const key = encryptionConfig.getEncryptionKey();
    const iv = crypto.randomBytes(encryptionConfig.ivLength);
    const cipher = crypto.createCipher(encryptionConfig.algorithm, key);
    cipher.setIV(iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }
  
  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const key = encryptionConfig.getEncryptionKey();
    const decipher = crypto.createDecipher(encryptionConfig.algorithm, key);
    
    decipher.setIV(Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  static validateInput(input: string, type: 'email' | 'password' | 'general'): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (type === 'email') {
      if (!validationConfig.emailRegex.test(input)) {
        errors.push('Invalid email format');
      }
    }
    
    if (type === 'password') {
      const reqs = validationConfig.passwordRequirements;
      
      if (input.length < reqs.minLength) {
        errors.push(`Password must be at least ${reqs.minLength} characters`);
      }
      
      if (input.length > reqs.maxLength) {
        errors.push(`Password must be no more than ${reqs.maxLength} characters`);
      }
      
      if (reqs.requireUppercase && !/[A-Z]/.test(input)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      if (reqs.requireLowercase && !/[a-z]/.test(input)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      if (reqs.requireNumbers && !/\d/.test(input)) {
        errors.push('Password must contain at least one number');
      }
      
      if (reqs.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(input)) {
        errors.push('Password must contain at least one special character');
      }
    }
    
    // Check for SQL injection
    for (const pattern of validationConfig.sqlInjectionPatterns) {
      if (pattern.test(input)) {
        errors.push('Input contains potentially dangerous characters');
        break;
      }
    }
    
    // Check for XSS
    for (const pattern of validationConfig.xssPatterns) {
      if (pattern.test(input)) {
        errors.push('Input contains potentially dangerous scripts');
        break;
      }
    }
    
    if (input.length > validationConfig.maxStringLength) {
      errors.push(`Input too long (max ${validationConfig.maxStringLength} characters)`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .substring(0, validationConfig.maxStringLength);
  }
  
  static getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }
  
  static calculateRiskScore(factors: {
    failedAttempts?: number;
    newLocation?: boolean;
    newDevice?: boolean;
    timeOfDay?: number; // 0-23
    dayOfWeek?: number; // 0-6
  }): number {
    let score = 0;
    
    // Failed attempts
    if (factors.failedAttempts) {
      score += Math.min(factors.failedAttempts * 10, 50);
    }
    
    // New location
    if (factors.newLocation) {
      score += 20;
    }
    
    // New device
    if (factors.newDevice) {
      score += 15;
    }
    
    // Unusual time (late night/early morning)
    if (factors.timeOfDay !== undefined) {
      if (factors.timeOfDay < 6 || factors.timeOfDay > 22) {
        score += 10;
      }
    }
    
    return Math.min(score, 100);
  }
}

export default {
  cors: corsOptions,
  helmet: helmetOptions,
  validation: validationConfig,
  encryption: encryptionConfig,
  session: sessionConfig,
  rateLimit: rateLimitConfig,
  monitoring: monitoringConfig,
  gdpr: gdprConfig,
  utils: SecurityUtils
};