// Security Monitoring and Incident Management Service
import { supabase } from '../config/supabase';
import { monitoringConfig } from '../config/security';

export interface SecurityIncident {
  id: string;
  incident_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  member_id?: string;
  session_id?: string;
  ip_address?: string;
  details: any;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  detected_at: Date;
  resolved_at?: Date;
}

export interface SecurityAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
}

export interface ThreatIntelligence {
  ip: string;
  risk_score: number;
  threat_type: string[];
  last_seen: Date;
  source: string;
}

export class SecurityMonitoringService {
  
  /**
   * Real-time Security Event Processing
   */
  async processSecurityEvent(
    eventType: string,
    details: any,
    context: {
      user_id?: string;
      session_id?: string;
      ip_address?: string;
      user_agent?: string;
    }
  ): Promise<void> {
    try {
      // Calculate risk score
      const riskScore = this.calculateEventRiskScore(eventType, details, context);
      
      // Log the event
      await this.logSecurityEvent(eventType, details, context, riskScore);
      
      // Check if incident creation is needed
      if (riskScore >= monitoringConfig.riskThresholds.high) {
        await this.createSecurityIncident(eventType, details, context, riskScore);
      }
      
      // Automated response if critical
      if (riskScore >= monitoringConfig.autoBlock.highRiskThreshold) {
        await this.executeAutomatedResponse(eventType, details, context);
      }
      
      // Check for patterns and correlations
      await this.analyzeSecurityPatterns(eventType, context);
      
      // Generate alerts if thresholds exceeded
      await this.checkAlertThresholds(eventType, context);
      
    } catch (error) {
      console.error('Security event processing failed:', error);
    }
  }
  
  /**
   * Threat Detection and Analysis
   */
  async detectThreats(timeWindow: number = 3600000): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);
    
    try {
      // Detect brute force attacks
      const bruteForceThreats = await this.detectBruteForceAttacks(windowStart);
      alerts.push(...bruteForceThreats);
      
      // Detect suspicious IP activity
      const suspiciousIPs = await this.detectSuspiciousIPs(windowStart);
      alerts.push(...suspiciousIPs);
      
      // Detect unusual access patterns
      const accessAnomalies = await this.detectAccessAnomalies(windowStart);
      alerts.push(...accessAnomalies);
      
      // Detect potential account takeovers
      const takeovers = await this.detectAccountTakeovers(windowStart);
      alerts.push(...takeovers);
      
      // Detect data exfiltration attempts
      const exfiltration = await this.detectDataExfiltration(windowStart);
      alerts.push(...exfiltration);
      
    } catch (error) {
      console.error('Threat detection failed:', error);
    }
    
    return alerts;
  }
  
  /**
   * User Behavior Analytics
   */
  async analyzeUserBehavior(userId: string, timeWindow: number = 86400000): Promise<{
    risk_score: number;
    anomalies: string[];
    baseline: any;
  }> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - timeWindow);
      
      // Get user's historical behavior
      const baseline = await this.getUserBehaviorBaseline(userId);
      
      // Get recent activity
      const recentActivity = await this.getRecentUserActivity(userId, windowStart);
      
      // Analyze deviations from baseline
      const anomalies = this.detectBehaviorAnomalies(baseline, recentActivity);
      
      // Calculate risk score based on anomalies
      const riskScore = this.calculateBehaviorRiskScore(anomalies, recentActivity);
      
      return {
        risk_score: riskScore,
        anomalies,
        baseline
      };
      
    } catch (error) {
      console.error('User behavior analysis failed:', error);
      return { risk_score: 0, anomalies: [], baseline: null };
    }
  }
  
  /**
   * Incident Management
   */
  async createSecurityIncident(
    incidentType: string,
    details: any,
    context: any,
    riskScore: number
  ): Promise<string> {
    try {
      const severity = this.calculateSeverity(riskScore);
      
      const { data, error } = await supabase
        .from('security_incidents')
        .insert({
          incident_type: incidentType,
          severity,
          member_id: context.user_id,
          session_id: context.session_id,
          ip_address: context.ip_address,
          details: {
            ...details,
            risk_score: riskScore,
            user_agent: context.user_agent,
            detected_at: new Date().toISOString()
          },
          automated_response: this.getAutomatedResponseAction(incidentType, severity)
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Notify security team for high/critical incidents
      if (severity === 'high' || severity === 'critical') {
        await this.notifySecurityTeam(data.id, incidentType, severity, details);
      }
      
      return data.id;
      
    } catch (error) {
      console.error('Failed to create security incident:', error);
      throw error;
    }
  }
  
  /**
   * Automated Response System
   */
  async executeAutomatedResponse(
    eventType: string,
    details: any,
    context: any
  ): Promise<void> {
    try {
      switch (eventType) {
        case 'brute_force_detected':
          await this.blockIP(context.ip_address, 'brute_force', 3600000); // 1 hour
          break;
          
        case 'suspicious_location':
          await this.requireAdditionalVerification(context.user_id);
          break;
          
        case 'multiple_failed_logins':
          await this.temporaryAccountLock(context.user_id, 900000); // 15 minutes
          break;
          
        case 'data_exfiltration_detected':
          await this.emergencySessionRevocation(context.user_id);
          break;
          
        case 'malicious_payload_detected':
          await this.blockIP(context.ip_address, 'malicious_payload', 86400000); // 24 hours
          break;
          
        default:
          console.log(`No automated response defined for event: ${eventType}`);
      }
      
    } catch (error) {
      console.error('Automated response execution failed:', error);
    }
  }
  
  /**
   * Security Metrics and Reporting
   */
  async generateSecurityReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: any;
    incidents: SecurityIncident[];
    trends: any;
    recommendations: string[];
  }> {
    try {
      // Get security incidents in date range
      const { data: incidents } = await supabase
        .from('security_incidents')
        .select('*')
        .gte('detected_at', startDate.toISOString())
        .lte('detected_at', endDate.toISOString())
        .order('detected_at', { ascending: false });
      
      // Get audit log summary
      const { data: auditSummary } = await supabase
        .from('audit_log')
        .select('event_type, action, risk_score')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('event_type', 'security');
      
      // Calculate summary metrics
      const summary = {
        total_incidents: incidents?.length || 0,
        critical_incidents: incidents?.filter(i => i.severity === 'critical').length || 0,
        high_incidents: incidents?.filter(i => i.severity === 'high').length || 0,
        resolved_incidents: incidents?.filter(i => i.status === 'resolved').length || 0,
        average_resolution_time: this.calculateAverageResolutionTime(incidents || []),
        top_threats: this.getTopThreats(incidents || []),
        affected_users: new Set(incidents?.map(i => i.member_id).filter(Boolean)).size
      };
      
      // Analyze trends
      const trends = this.analyzeSecurityTrends(incidents || [], auditSummary || []);
      
      // Generate recommendations
      const recommendations = this.generateSecurityRecommendations(summary, trends);
      
      return {
        summary,
        incidents: incidents || [],
        trends,
        recommendations
      };
      
    } catch (error) {
      console.error('Security report generation failed:', error);
      throw error;
    }
  }
  
  // Private methods
  
  private calculateEventRiskScore(
    eventType: string,
    details: any,
    context: any
  ): number {
    const baseScores: { [key: string]: number } = {
      'login_failure': 20,
      'brute_force_detected': 80,
      'suspicious_location': 60,
      'multiple_failed_logins': 70,
      'data_exfiltration_detected': 95,
      'malicious_payload_detected': 90,
      'privilege_escalation': 85,
      'unusual_data_access': 50,
      'session_hijacking': 90,
      'account_enumeration': 40
    };
    
    let score = baseScores[eventType] || 30;
    
    // Adjust based on context
    if (details.repeated_attempts > 5) score += 20;
    if (details.new_device) score += 15;
    if (details.new_location) score += 15;
    if (details.off_hours) score += 10;
    
    return Math.min(score, 100);
  }
  
  private async logSecurityEvent(
    eventType: string,
    details: any,
    context: any,
    riskScore: number
  ): Promise<void> {
    await supabase.from('audit_log').insert({
      event_type: 'security',
      action: eventType,
      actor_id: context.user_id,
      details,
      ip_address: context.ip_address,
      session_id: context.session_id,
      risk_score: riskScore
    });
  }
  
  private async detectBruteForceAttacks(windowStart: Date): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Check for IP-based brute force
    const { data: ipAttempts } = await supabase
      .from('audit_log')
      .select('ip_address, count(*)')
      .eq('event_type', 'auth')
      .eq('action', 'login_failure')
      .gte('created_at', windowStart.toISOString())
      .group('ip_address')
      .having('count(*) > 10');
    
    for (const attempt of ipAttempts || []) {
      alerts.push({
        type: 'brute_force_ip',
        severity: 'high',
        message: `Brute force attack detected from IP: ${attempt.ip_address}`,
        details: { ip: attempt.ip_address, attempts: attempt.count },
        timestamp: new Date()
      });
    }
    
    return alerts;
  }
  
  private async detectSuspiciousIPs(windowStart: Date): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Check for IPs accessing multiple accounts
    const { data: multiAccountIPs } = await supabase
      .from('audit_log')
      .select('ip_address, actor_id')
      .gte('created_at', windowStart.toISOString())
      .neq('actor_id', null);
    
    const ipToUsers = new Map<string, Set<string>>();
    
    for (const log of multiAccountIPs || []) {
      if (!ipToUsers.has(log.ip_address)) {
        ipToUsers.set(log.ip_address, new Set());
      }
      ipToUsers.get(log.ip_address)!.add(log.actor_id);
    }
    
    for (const [ip, users] of ipToUsers) {
      if (users.size > 5) { // Same IP accessing more than 5 accounts
        alerts.push({
          type: 'suspicious_ip_multi_account',
          severity: 'medium',
          message: `IP ${ip} accessed ${users.size} different accounts`,
          details: { ip, account_count: users.size },
          timestamp: new Date()
        });
      }
    }
    
    return alerts;
  }
  
  private async detectAccessAnomalies(windowStart: Date): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Detect unusual access times
    const currentHour = new Date().getHours();
    
    if (currentHour < 6 || currentHour > 22) {
      const { data: offHoursAccess } = await supabase
        .from('audit_log')
        .select('actor_id, count(*)')
        .eq('event_type', 'auth')
        .eq('action', 'login')
        .gte('created_at', windowStart.toISOString())
        .group('actor_id')
        .having('count(*) > 3');
      
      for (const access of offHoursAccess || []) {
        alerts.push({
          type: 'unusual_access_time',
          severity: 'low',
          message: `User ${access.actor_id} accessed system ${access.count} times during off-hours`,
          details: { user_id: access.actor_id, access_count: access.count },
          timestamp: new Date()
        });
      }
    }
    
    return alerts;
  }
  
  private async detectAccountTakeovers(windowStart: Date): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Look for rapid changes in user behavior
    const { data: behaviorChanges } = await supabase
      .from('user_sessions')
      .select('member_id, ip_address, device_fingerprint, created_at')
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: true });
    
    const userSessions = new Map<string, any[]>();
    
    for (const session of behaviorChanges || []) {
      if (!userSessions.has(session.member_id)) {
        userSessions.set(session.member_id, []);
      }
      userSessions.get(session.member_id)!.push(session);
    }
    
    for (const [userId, sessions] of userSessions) {
      if (sessions.length > 1) {
        const uniqueIPs = new Set(sessions.map(s => s.ip_address));
        const uniqueDevices = new Set(sessions.map(s => s.device_fingerprint));
        
        if (uniqueIPs.size > 2 || uniqueDevices.size > 2) {
          alerts.push({
            type: 'potential_account_takeover',
            severity: 'high',
            message: `User ${userId} accessed from ${uniqueIPs.size} IPs and ${uniqueDevices.size} devices`,
            details: { user_id: userId, ip_count: uniqueIPs.size, device_count: uniqueDevices.size },
            timestamp: new Date()
          });
        }
      }
    }
    
    return alerts;
  }
  
  private async detectDataExfiltration(windowStart: Date): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Check for unusual data export activity
    const { data: exports } = await supabase
      .from('data_processing_log')
      .select('processor_id, count(*)')
      .eq('processing_type', 'export')
      .gte('processed_at', windowStart.toISOString())
      .group('processor_id')
      .having('count(*) > 5');
    
    for (const exportActivity of exports || []) {
      alerts.push({
        type: 'unusual_data_export',
        severity: 'medium',
        message: `User ${exportActivity.processor_id} performed ${exportActivity.count} data exports`,
        details: { user_id: exportActivity.processor_id, export_count: exportActivity.count },
        timestamp: new Date()
      });
    }
    
    return alerts;
  }
  
  private async analyzeSecurityPatterns(eventType: string, context: any): Promise<void> {
    // Look for patterns in recent events
    const recentEvents = await supabase
      .from('audit_log')
      .select('*')
      .eq('event_type', 'security')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false });
    
    // Pattern detection logic here
    // Could implement machine learning models for advanced pattern recognition
  }
  
  private async checkAlertThresholds(eventType: string, context: any): Promise<void> {
    const thresholds = monitoringConfig.alertThresholds;
    const hourAgo = new Date(Date.now() - 3600000);
    
    // Check failed login threshold
    if (eventType === 'login_failure') {
      const { count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .eq('action', 'login_failure')
        .gte('created_at', hourAgo.toISOString());
      
      if (count && count > thresholds.failedLogins) {
        await this.createAlert('failed_login_threshold_exceeded', {
          threshold: thresholds.failedLogins,
          actual: count
        });
      }
    }
  }
  
  private async createAlert(type: string, details: any): Promise<void> {
    // Implementation for creating and dispatching alerts
    console.log(`Security Alert: ${type}`, details);
    // Could integrate with external alerting systems (email, Slack, PagerDuty, etc.)
  }
  
  private calculateSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 90) return 'critical';
    if (riskScore >= 70) return 'high';
    if (riskScore >= 50) return 'medium';
    return 'low';
  }
  
  private getAutomatedResponseAction(incidentType: string, severity: string): string {
    const responses: { [key: string]: string } = {
      'brute_force_detected': 'IP blocked for 1 hour',
      'suspicious_location': 'Additional verification required',
      'multiple_failed_logins': 'Account temporarily locked',
      'data_exfiltration_detected': 'All sessions revoked',
      'malicious_payload_detected': 'IP blocked for 24 hours'
    };
    
    return responses[incidentType] || 'Security event logged';
  }
  
  private async blockIP(ipAddress: string, reason: string, duration: number): Promise<void> {
    // Implementation for IP blocking
    console.log(`Blocking IP ${ipAddress} for ${reason}, duration: ${duration}ms`);
  }
  
  private async requireAdditionalVerification(userId: string): Promise<void> {
    // Implementation for requiring additional verification
    console.log(`Requiring additional verification for user ${userId}`);
  }
  
  private async temporaryAccountLock(userId: string, duration: number): Promise<void> {
    await supabase
      .from('members')
      .update({
        locked_until: new Date(Date.now() + duration).toISOString()
      })
      .eq('id', userId);
  }
  
  private async emergencySessionRevocation(userId: string): Promise<void> {
    await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: 'security_incident'
      })
      .eq('member_id', userId);
  }
  
  private async notifySecurityTeam(
    incidentId: string,
    incidentType: string,
    severity: string,
    details: any
  ): Promise<void> {
    // Implementation for notifying security team
    console.log(`Security Team Notification: ${incidentType} (${severity}) - Incident ID: ${incidentId}`);
  }
  
  private async getUserBehaviorBaseline(userId: string): Promise<any> {
    // Get user's typical behavior patterns
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .eq('actor_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .limit(1000);
    
    // Calculate baseline metrics
    return this.calculateBehaviorBaseline(data || []);
  }
  
  private async getRecentUserActivity(userId: string, since: Date): Promise<any[]> {
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .eq('actor_id', userId)
      .gte('created_at', since.toISOString());
    
    return data || [];
  }
  
  private calculateBehaviorBaseline(activities: any[]): any {
    // Analyze historical activities to establish baseline
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Array(7).fill(0);
    const ipAddresses = new Set();
    
    for (const activity of activities) {
      const date = new Date(activity.created_at);
      hourlyActivity[date.getHours()]++;
      dailyActivity[date.getDay()]++;
      if (activity.ip_address) ipAddresses.add(activity.ip_address);
    }
    
    return {
      typical_hours: hourlyActivity.map((count, hour) => ({ hour, count }))
        .filter(h => h.count > 0)
        .map(h => h.hour),
      typical_days: dailyActivity.map((count, day) => ({ day, count }))
        .filter(d => d.count > 0)
        .map(d => d.day),
      typical_ips: Array.from(ipAddresses),
      average_daily_activity: activities.length / 30
    };
  }
  
  private detectBehaviorAnomalies(baseline: any, recentActivity: any[]): string[] {
    const anomalies: string[] = [];
    
    // Check for unusual time patterns
    const recentHours = recentActivity.map(a => new Date(a.created_at).getHours());
    const unusualHours = recentHours.filter(h => !baseline.typical_hours.includes(h));
    
    if (unusualHours.length > 0) {
      anomalies.push(`Unusual access hours: ${unusualHours.join(', ')}`);
    }
    
    // Check for new IP addresses
    const recentIPs = new Set(recentActivity.map(a => a.ip_address).filter(Boolean));
    const newIPs = Array.from(recentIPs).filter(ip => !baseline.typical_ips.includes(ip));
    
    if (newIPs.length > 0) {
      anomalies.push(`New IP addresses: ${newIPs.length}`);
    }
    
    // Check activity volume
    if (recentActivity.length > baseline.average_daily_activity * 3) {
      anomalies.push('Unusually high activity volume');
    }
    
    return anomalies;
  }
  
  private calculateBehaviorRiskScore(anomalies: string[], recentActivity: any[]): number {
    let score = 0;
    
    score += anomalies.length * 10;
    
    if (recentActivity.length > 50) score += 20; // High activity
    
    return Math.min(score, 100);
  }
  
  private calculateAverageResolutionTime(incidents: SecurityIncident[]): number {
    const resolved = incidents.filter(i => i.resolved_at && i.status === 'resolved');
    
    if (resolved.length === 0) return 0;
    
    const totalTime = resolved.reduce((sum, incident) => {
      const detectedAt = new Date(incident.detected_at).getTime();
      const resolvedAt = new Date(incident.resolved_at!).getTime();
      return sum + (resolvedAt - detectedAt);
    }, 0);
    
    return totalTime / resolved.length / (1000 * 60 * 60); // Convert to hours
  }
  
  private getTopThreats(incidents: SecurityIncident[]): Array<{ type: string; count: number }> {
    const threatCounts = new Map<string, number>();
    
    for (const incident of incidents) {
      const count = threatCounts.get(incident.incident_type) || 0;
      threatCounts.set(incident.incident_type, count + 1);
    }
    
    return Array.from(threatCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  private analyzeSecurityTrends(incidents: SecurityIncident[], auditLogs: any[]): any {
    // Analyze trends in security incidents and audit logs
    return {
      incident_trend: 'increasing', // Would calculate actual trend
      risk_score_trend: 'stable',
      top_attack_vectors: ['brute_force', 'credential_stuffing'],
      peak_activity_hours: [14, 15, 16] // 2-4 PM
    };
  }
  
  private generateSecurityRecommendations(summary: any, trends: any): string[] {
    const recommendations: string[] = [];
    
    if (summary.critical_incidents > 0) {
      recommendations.push('Review and strengthen incident response procedures');
    }
    
    if (summary.average_resolution_time > 24) {
      recommendations.push('Improve incident response time - target under 24 hours');
    }
    
    if (trends.incident_trend === 'increasing') {
      recommendations.push('Consider additional security controls and monitoring');
    }
    
    recommendations.push('Regular security awareness training for users');
    recommendations.push('Implement multi-factor authentication for all accounts');
    recommendations.push('Regular security audits and penetration testing');
    
    return recommendations;
  }
}

export const securityMonitoringService = new SecurityMonitoringService();