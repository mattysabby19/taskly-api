// GDPR Validation Schemas
import { z } from 'zod';

// Consent management schemas
export const gdprConsentSchema = z.object({
  consent_type: z.enum(['analytics', 'marketing', 'functional']),
  granted: z.boolean(),
  version: z.string().optional().default('1.0')
});

// Data export schemas
export const dataExportSchema = z.object({
  user_id: z.string().uuid().optional(), // For admin exports
  data_types: z.array(z.enum(['profile', 'tasks', 'analytics', 'sessions', 'audit'])).optional(),
  format: z.enum(['json', 'csv', 'xml']).optional().default('json'),
  async: z.boolean().optional().default(false)
});

// Data deletion schemas
export const dataDeletionSchema = z.object({
  deletion_type: z.enum(['full', 'partial']),
  data_types: z.array(z.string()).optional(),
  reason: z.string().optional()
});

export type GDPRConsentData = z.infer<typeof gdprConsentSchema>;
export type DataExportData = z.infer<typeof dataExportSchema>;
export type DataDeletionData = z.infer<typeof dataDeletionSchema>;