// src/validators/authValidator.ts
import { z } from 'zod';
import { AuthProvider } from '../services/authService';

// Email authentication schemas
export const emailSignupSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters'),
  
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  
  group_id: z
    .string()
    .uuid('Invalid group ID')
    .optional()
});

export const emailLoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(1, 'Password is required')
});

// OAuth authentication schemas
export const oauthLoginSchema = z.object({
  provider: z
    .enum([
      AuthProvider.GOOGLE,
      AuthProvider.GITHUB,
      AuthProvider.FACEBOOK,
      AuthProvider.APPLE,
      AuthProvider.DISCORD
    ] as const, {
      errorMap: () => ({ message: 'Invalid authentication provider' })
    }),
  
  redirectTo: z
    .string()
    .url('Invalid redirect URL')
    .optional(),
  
  scopes: z
    .string()
    .optional()
});

// OAuth callback schema
export const oauthCallbackSchema = z.object({
  access_token: z
    .string()
    .min(1, 'Access token is required'),
  
  refresh_token: z
    .string()
    .optional(),
  
  provider: z
    .enum([
      AuthProvider.GOOGLE,
      AuthProvider.GITHUB,
      AuthProvider.FACEBOOK,
      AuthProvider.APPLE,
      AuthProvider.DISCORD
    ] as const)
    .optional()
});

// Provider management schemas
export const linkProviderSchema = z.object({
  provider: z
    .enum([
      AuthProvider.GOOGLE,
      AuthProvider.GITHUB,
      AuthProvider.FACEBOOK,
      AuthProvider.APPLE,
      AuthProvider.DISCORD
    ] as const, {
      errorMap: () => ({ message: 'Invalid authentication provider' })
    })
});

export const unlinkProviderSchema = z.object({
  provider: z
    .enum([
      AuthProvider.GOOGLE,
      AuthProvider.GITHUB,
      AuthProvider.FACEBOOK,
      AuthProvider.APPLE,
      AuthProvider.DISCORD
    ] as const, {
      errorMap: () => ({ message: 'Invalid authentication provider' })
    })
});

// Profile update schema
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  
  avatar_url: z
    .string()
    .url('Invalid avatar URL')
    .optional(),
  
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
    .optional()
});

// Password change schema (email auth only)
export const changePasswordSchema = z.object({
  current_password: z
    .string()
    .min(1, 'Current password is required'),
  
  new_password: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .max(128, 'New password must be less than 128 characters'),
  
  confirm_password: z
    .string()
    .min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

// Email verification and password reset schemas
export const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters'),
  
  confirm_password: z
    .string()
    .min(1, 'Password confirmation is required')
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, 'Verification token is required'),
  
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
});

// Export types
export type EmailSignupData = z.infer<typeof emailSignupSchema>;
export type EmailLoginData = z.infer<typeof emailLoginSchema>;
export type OAuthLoginData = z.infer<typeof oauthLoginSchema>;
export type OAuthCallbackData = z.infer<typeof oauthCallbackSchema>;
export type LinkProviderData = z.infer<typeof linkProviderSchema>;
export type UnlinkProviderData = z.infer<typeof unlinkProviderSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type RequestPasswordResetData = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailData = z.infer<typeof verifyEmailSchema>;

// Validation helper functions
export const validateEmailSignup = (data: unknown): EmailSignupData => {
  return emailSignupSchema.parse(data);
};

export const validateEmailLogin = (data: unknown): EmailLoginData => {
  return emailLoginSchema.parse(data);
};

export const validateOAuthLogin = (data: unknown): OAuthLoginData => {
  return oauthLoginSchema.parse(data);
};

export const validateOAuthCallback = (data: unknown): OAuthCallbackData => {
  return oauthCallbackSchema.parse(data);
};

export const validateLinkProvider = (data: unknown): LinkProviderData => {
  return linkProviderSchema.parse(data);
};

export const validateUnlinkProvider = (data: unknown): UnlinkProviderData => {
  return unlinkProviderSchema.parse(data);
};

export const validateUpdateProfile = (data: unknown): UpdateProfileData => {
  return updateProfileSchema.parse(data);
};

export const validateChangePassword = (data: unknown): ChangePasswordData => {
  return changePasswordSchema.parse(data);
};

export const validateRequestPasswordReset = (data: unknown): RequestPasswordResetData => {
  return requestPasswordResetSchema.parse(data);
};

export const validateResetPassword = (data: unknown): ResetPasswordData => {
  return resetPasswordSchema.parse(data);
};

export const validateVerifyEmail = (data: unknown): VerifyEmailData => {
  return verifyEmailSchema.parse(data);
};