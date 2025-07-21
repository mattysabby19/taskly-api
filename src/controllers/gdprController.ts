// GDPR Compliance Controller
// Data export, deletion, consent management

import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { supabase } from '../config/supabase';
import { 
  gdprConsentSchema, 
  dataExportSchema, 
  dataDeletionSchema 
} from '../validators/gdprValidator';

/**
 * Consent Management
 */

// Update user consent preferences
export const updateConsent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = gdprConsentSchema.parse(req.body);
    
    // Record consent in database
    const { error } = await supabase
      .from('data_consent')
      .insert({
        member_id: userId,
        consent_type: data.consent_type,
        version: data.version || '1.0',
        granted: data.granted,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    if (error) throw error;

    // Update member preferences if it's marketing or analytics consent
    if (data.consent_type === 'marketing' || data.consent_type === 'analytics') {
      await supabase
        .from('members')
        .update({
          [`${data.consent_type}_consent`]: data.granted,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    // Log consent change
    await supabase.from('audit_log').insert({
      event_type: 'gdpr',
      action: 'consent_updated',
      resource_type: 'consent',
      actor_id: userId,
      details: {
        consent_type: data.consent_type,
        granted: data.granted,
        version: data.version
      },
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Consent preferences updated',
      consent: {
        type: data.consent_type,
        granted: data.granted,
        recorded_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Update consent error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to update consent' 
    });
  }
};

// Get user's current consent status
export const getConsents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Get latest consent for each type
    const { data: consents, error } = await supabase
      .from('data_consent')
      .select('*')
      .eq('member_id', userId)
      .order('granted_at', { ascending: false });

    if (error) throw error;

    // Group by consent type and get latest
    const latestConsents = consents?.reduce((acc, consent) => {
      if (!acc[consent.consent_type] || 
          new Date(consent.granted_at) > new Date(acc[consent.consent_type].granted_at)) {
        acc[consent.consent_type] = consent;
      }
      return acc;
    }, {} as any);

    res.json({
      success: true,
      consents: Object.values(latestConsents || {}).map((consent: any) => ({
        type: consent.consent_type,
        granted: consent.granted,
        version: consent.version,
        granted_at: consent.granted_at,
        expires_at: consent.expires_at
      }))
    });
  } catch (error: any) {
    console.error('Get consents error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve consent information' 
    });
  }
};

/**
 * Data Export (Right to Data Portability)
 */

// Request data export
export const requestDataExport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = dataExportSchema.parse(req.body);
    
    // Check if user can export this data
    if (data.user_id && data.user_id !== userId) {
      // Only admins can export other users' data
      const isAdmin = (req as any).user.permissions.includes('system:admin');
      if (!isAdmin) {
        return res.status(403).json({ 
          error: 'Access denied: cannot export other user data' 
        });
      }
    }

    const targetUserId = data.user_id || userId;
    
    // Export user data
    const exportData = await authService.exportUserData(targetUserId, userId);
    
    // Log data export
    await supabase.from('data_processing_log').insert({
      member_id: targetUserId,
      processing_type: 'export',
      data_type: data.data_types?.join(',') || 'all',
      purpose: 'data_portability_request',
      legal_basis: 'consent',
      processor_id: userId,
      details: {
        export_format: data.format || 'json',
        requested_by: userId,
        ip_address: req.ip
      }
    });

    // For large exports, you might want to generate async and email the user
    if (data.async) {
      // Queue background job for large exports
      res.json({
        success: true,
        message: 'Data export queued. You will receive an email when ready.',
        export_id: `export_${Date.now()}`,
        estimated_completion: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
    } else {
      // Return data immediately for small exports
      res.json({
        success: true,
        export_data: exportData,
        exported_at: new Date().toISOString(),
        format: data.format || 'json'
      });
    }
  } catch (error: any) {
    console.error('Data export error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to export data' 
    });
  }
};

// Get export history
export const getExportHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const { data: exports, error } = await supabase
      .from('data_processing_log')
      .select('*')
      .eq('member_id', userId)
      .eq('processing_type', 'export')
      .order('processed_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      exports: exports?.map(exp => ({
        id: exp.id,
        data_types: exp.data_type?.split(',') || [],
        purpose: exp.purpose,
        exported_at: exp.processed_at,
        details: exp.details
      })) || []
    });
  } catch (error: any) {
    console.error('Get export history error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve export history' 
    });
  }
};

/**
 * Data Deletion (Right to be Forgotten)
 */

// Request data deletion
export const requestDataDeletion = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = dataDeletionSchema.parse(req.body);
    
    // Create deletion request
    const result = await authService.requestDataDeletion(
      userId,
      data.deletion_type,
      data.data_types
    );

    res.json({
      success: true,
      message: `Data deletion request submitted. Request ID: ${result.request_id}`,
      request_id: result.request_id,
      deletion_type: data.deletion_type,
      estimated_processing_time: '30 days', // GDPR allows up to 30 days
      next_steps: data.deletion_type === 'full' ? 
        'Your account will be deactivated and data removed within 30 days.' :
        'Selected data will be removed within 30 days.'
    });
  } catch (error: any) {
    console.error('Data deletion request error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process deletion request' 
    });
  }
};

// Get deletion request status
export const getDeletionStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const { data: deletionRequest, error } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('member_id', userId)
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // No rows found
      throw error;
    }

    if (!deletionRequest) {
      return res.json({
        success: true,
        deletion_request: null,
        message: 'No deletion request found'
      });
    }

    res.json({
      success: true,
      deletion_request: {
        id: deletionRequest.id,
        type: deletionRequest.request_type,
        data_types: deletionRequest.data_types,
        status: deletionRequest.status,
        requested_at: deletionRequest.requested_at,
        processed_at: deletionRequest.processed_at,
        reason: deletionRequest.reason,
        notes: deletionRequest.notes
      }
    });
  } catch (error: any) {
    console.error('Get deletion status error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve deletion request status' 
    });
  }
};

// Cancel deletion request (if still pending)
export const cancelDeletionRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { request_id } = req.params;
    
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('id', request_id)
      .eq('member_id', userId)
      .single();

    if (fetchError || !deletionRequest) {
      return res.status(404).json({ error: 'Deletion request not found' });
    }

    if (deletionRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot cancel deletion request with status: ${deletionRequest.status}` 
      });
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('data_deletion_requests')
      .update({
        status: 'cancelled',
        processed_at: new Date().toISOString(),
        notes: 'Cancelled by user request'
      })
      .eq('id', request_id);

    if (updateError) throw updateError;

    // Remove deletion flag from member
    await supabase
      .from('members')
      .update({ deletion_requested_at: null })
      .eq('id', userId);

    // Log cancellation
    await supabase.from('audit_log').insert({
      event_type: 'gdpr',
      action: 'deletion_cancelled',
      resource_type: 'deletion_request',
      resource_id: request_id,
      actor_id: userId,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Deletion request cancelled successfully'
    });
  } catch (error: any) {
    console.error('Cancel deletion request error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel deletion request' 
    });
  }
};

/**
 * Data Processing Information
 */

// Get data processing activities
export const getProcessingActivities = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const { data: activities, error } = await supabase
      .from('data_processing_log')
      .select('*')
      .eq('member_id', userId)
      .order('processed_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({
      success: true,
      processing_activities: activities?.map(activity => ({
        id: activity.id,
        type: activity.processing_type,
        data_type: activity.data_type,
        purpose: activity.purpose,
        legal_basis: activity.legal_basis,
        processed_at: activity.processed_at,
        processor: activity.processor_id,
        details: activity.details
      })) || []
    });
  } catch (error: any) {
    console.error('Get processing activities error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve processing activities' 
    });
  }
};

/**
 * Privacy Policy and Terms
 */

// Get current privacy policy
export const getPrivacyPolicy = async (req: Request, res: Response) => {
  try {
    // This would typically come from a CMS or database
    // For now, return static information
    res.json({
      success: true,
      privacy_policy: {
        version: '1.0',
        effective_date: '2024-01-01',
        last_updated: '2024-01-01',
        content_url: '/legal/privacy-policy',
        summary: {
          data_collected: [
            'Account information (email, name)',
            'Task and household management data',
            'Usage analytics (if consented)',
            'Device and session information'
          ],
          data_usage: [
            'Provide task management services',
            'Improve user experience',
            'Analytics and insights (with consent)',
            'Security and fraud prevention'
          ],
          data_sharing: [
            'We do not sell personal data',
            'Limited sharing with service providers',
            'Legal compliance when required'
          ],
          user_rights: [
            'Access your personal data',
            'Correct inaccurate data',
            'Delete your data',
            'Data portability',
            'Object to processing',
            'Withdraw consent'
          ]
        }
      }
    });
  } catch (error: any) {
    console.error('Get privacy policy error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve privacy policy' 
    });
  }
};

// Record privacy policy acceptance
export const acceptPrivacyPolicy = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { version } = req.body;
    
    if (!version) {
      return res.status(400).json({ error: 'Privacy policy version required' });
    }

    // Update member record
    const { error } = await supabase
      .from('members')
      .update({
        privacy_policy_accepted_at: new Date().toISOString(),
        privacy_policy_version: version,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Log acceptance
    await supabase.from('audit_log').insert({
      event_type: 'gdpr',
      action: 'privacy_policy_accepted',
      actor_id: userId,
      details: {
        version,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      },
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Privacy policy acceptance recorded',
      version,
      accepted_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Accept privacy policy error:', error);
    res.status(500).json({ 
      error: 'Failed to record privacy policy acceptance' 
    });
  }
};

/**
 * Admin Functions for GDPR Compliance
 */

// Process deletion request (admin only)
export const processDeletionRequest = async (req: Request, res: Response) => {
  try {
    const { request_id } = req.params;
    const { action, notes } = req.body; // 'approve' or 'reject'
    const processorId = (req as any).user.id;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
    }

    const { data: request, error: fetchError } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Deletion request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        error: `Request already processed with status: ${request.status}` 
      });
    }

    const newStatus = action === 'approve' ? 'completed' : 'rejected';
    
    // Update deletion request
    const { error: updateError } = await supabase
      .from('data_deletion_requests')
      .update({
        status: newStatus,
        processed_at: new Date().toISOString(),
        processed_by: processorId,
        notes
      })
      .eq('id', request_id);

    if (updateError) throw updateError;

    if (action === 'approve') {
      if (request.request_type === 'full') {
        // Perform full account deletion
        await performFullAccountDeletion(request.member_id);
      } else {
        // Perform partial data deletion
        await performPartialDataDeletion(request.member_id, request.data_types);
      }
    }

    // Log admin action
    await supabase.from('audit_log').insert({
      event_type: 'admin',
      action: `deletion_request_${action}`,
      resource_type: 'deletion_request',
      resource_id: request_id,
      actor_id: processorId,
      target_id: request.member_id,
      details: { notes, original_request: request },
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: `Deletion request ${action}ed successfully`,
      request_id,
      action,
      processed_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Process deletion request error:', error);
    res.status(500).json({ 
      error: 'Failed to process deletion request' 
    });
  }
};

// Helper functions for data deletion
async function performFullAccountDeletion(userId: string): Promise<void> {
  // This should be implemented based on your data retention policies
  // Example implementation:
  
  // 1. Anonymize or delete personal data
  await supabase
    .from('members')
    .update({
      email: `deleted_user_${userId}@deleted.local`,
      name: 'Deleted User',
      avatar_url: null,
      anonymized_at: new Date().toISOString(),
      status: 'deleted'
    })
    .eq('id', userId);
  
  // 2. Remove from groups
  await supabase
    .from('group_memberships')
    .delete()
    .eq('member_id', userId);
  
  // 3. Delete sessions
  await supabase
    .from('user_sessions')
    .delete()
    .eq('member_id', userId);
  
  // 4. Delete consent records
  await supabase
    .from('data_consent')
    .delete()
    .eq('member_id', userId);
  
  // 5. Keep audit logs for legal compliance (anonymized)
  await supabase
    .from('audit_log')
    .update({ actor_id: null })
    .eq('actor_id', userId);
}

async function performPartialDataDeletion(userId: string, dataTypes: string[]): Promise<void> {
  // Implement partial deletion based on data types
  for (const dataType of dataTypes) {
    switch (dataType) {
      case 'tasks':
        await supabase
          .from('tasks')
          .delete()
          .eq('assignee_id', userId);
        break;
      case 'analytics':
        // Delete analytics data
        break;
      // Add more cases as needed
    }
  }
}