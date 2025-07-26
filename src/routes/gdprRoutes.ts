// GDPR Routes
import express from 'express';
import {
  updateConsent,
  getConsents,
  requestDataExport,
  getExportHistory,
  requestDataDeletion,
  getDeletionStatus,
  cancelDeletionRequest,
  getProcessingActivities,
  getPrivacyPolicy,
  acceptPrivacyPolicy,
  processDeletionRequest
} from '../controllers/gdprController';
import { requireAdmin, sensitiveRateLimit } from '../middleware/enhancedAuth';

const router = express.Router();

// Consent Management
router.post('/consent', updateConsent);
router.get('/consent', getConsents);

// Data Export (Right to Data Portability)
router.post('/export', sensitiveRateLimit, requestDataExport);
router.get('/export/history', getExportHistory);

// Data Deletion (Right to be Forgotten)
router.post('/delete', sensitiveRateLimit, requestDataDeletion);
router.get('/deletion/status', getDeletionStatus);
router.delete('/deletion/:request_id', cancelDeletionRequest);

// Data Processing Information
router.get('/processing', getProcessingActivities);

// Privacy Policy
router.get('/privacy-policy', getPrivacyPolicy);
router.post('/privacy-policy/accept', acceptPrivacyPolicy);

// Admin Routes
router.post('/admin/deletion/:request_id/process', requireAdmin, processDeletionRequest);

export default router;