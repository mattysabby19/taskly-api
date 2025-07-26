// Enhanced Auth Service Compatible with New Schema
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Supported authentication providers
export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  GITHUB = 'github',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  DISCORD = 'discord'
}

// Authentication data interfaces
export interface EmailAuthData {
  email: string;
  password: string;
  name?: string;
  marketing_consent?: boolean;
  analytics_consent?: boolean;
}

export interface AuthResult {
  token?: string;
  refresh_token?: string;
  user: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
    provider: AuthProvider;
    provider_id?: string;
    current_group_id?: string;
    is_admin: boolean;
    memberships?: any[];
    permissions?: string[];
  };
  group?: {
    id: string;
    name: string;
  };
  session?: any;
}

/**
 * Enhanced Authentication Service
 * Compatible with new group_memberships schema
 */
export class EnhancedAuthServiceCompatible {
  
  /**
   * Email/Password Authentication - Signup
   */
  async signupWithEmail(data: EmailAuthData): Promise<AuthResult> {
    try {
      console.log('🔐 Enhanced Auth: Starting signup process for', data.email);

      // Step 1: Create group first
      const groupId = uuidv4();
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          id: groupId,
          name: `${data.name || 'User'}'s Household`,
          plan: 'Household',
          type: 'personal',
          status: 'active'
        })
        .select()
        .single();

      if (groupError) {
        console.error('❌ Group creation failed:', groupError);
        throw new Error(`Failed to create group: ${groupError.message}`);
      }
      console.log('✅ Group created:', groupData.id);

      // Step 2: Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          name: data.name || 'New User',
          auth_provider: AuthProvider.EMAIL
        }
      });

      if (authError || !authData.user) {
        console.error('❌ Supabase auth user creation failed:', authError);
        // Cleanup group if auth failed
        await supabase.from('groups').delete().eq('id', groupId);
        throw new Error(`Authentication failed: ${authError?.message}`);
      }
      console.log('✅ Supabase auth user created:', authData.user.id);

      // Step 3: Create member record (without group_id or is_admin)
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({
          id: authData.user.id, // Use same ID as auth user
          email: data.email,
          name: data.name || 'New User',
          auth_provider: AuthProvider.EMAIL,
          password_hash: bcrypt.hashSync(data.password, 10),
          email_verified: true,
          marketing_consent: data.marketing_consent || false,
          analytics_consent: data.analytics_consent !== false, // Default true
          data_processing_consent: true,
          privacy_policy_accepted_at: new Date().toISOString(),
          privacy_policy_version: '1.0'
        })
        .select()
        .single();

      if (memberError) {
        console.error('❌ Member creation failed:', memberError);
        // Cleanup
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from('groups').delete().eq('id', groupId);
        throw new Error(`Member creation failed: ${memberError.message}`);
      }
      console.log('✅ Member record created:', memberData.id);

      // Step 4: Get admin role ID
      console.log('🔍 Looking for admin role...');
      const { data: adminRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'admin')
        .single();

      console.log('🔍 Admin role query result:', { adminRole, roleError });
      
      if (roleError || !adminRole) {
        console.error('❌ Admin role not found:', roleError);
        
        // Debug: Check what roles exist
        const { data: allRoles } = await supabase
          .from('roles')
          .select('id, name, display_name');
        console.log('🔍 All roles in database:', allRoles);
        
        throw new Error('Admin role not found in database');
      }

      // Step 5: Create group membership with admin role
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          member_id: authData.user.id,
          group_id: groupId,
          role_id: adminRole.id,
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (membershipError) {
        console.error('❌ Group membership creation failed:', membershipError);
        // Cleanup
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from('members').delete().eq('id', authData.user.id);
        await supabase.from('groups').delete().eq('id', groupId);
        throw new Error(`Group membership failed: ${membershipError.message}`);
      }
      console.log('✅ Group membership created:', membershipData.id);

      // Step 6: Sign in to get session token
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (signInError || !signInData.session) {
        console.error('❌ Sign in failed:', signInError);
        // Don't cleanup here as user is created, just return without token
      }

      console.log('✅ Enhanced signup completed successfully');

      return {
        token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: data.name || 'New User',
          provider: AuthProvider.EMAIL,
          current_group_id: groupId,
          is_admin: true, // They're admin of their own group
          memberships: [{
            group_id: groupId,
            role: 'admin',
            status: 'active'
          }]
        },
        group: {
          id: groupId,
          name: groupData.name
        }
      };

    } catch (error: any) {
      console.error('❌ Enhanced signup error:', error);
      throw error;
    }
  }

  /**
   * Email/Password Authentication - Login
   */
  async loginWithEmail(data: { email: string; password: string }): Promise<AuthResult> {
    try {
      console.log('🔐 Enhanced Auth: Starting login process for', data.email);

      // Step 1: Authenticate with Supabase Auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (signInError || !signInData.user || !signInData.session) {
        console.error('❌ Login failed:', signInError);
        throw new Error(`Authentication failed: ${signInError?.message}`);
      }

      // Step 2: Get member record
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', signInData.user.id)
        .single();

      if (memberError || !memberData) {
        console.error('❌ Member record not found:', memberError);
        throw new Error('Member record not found');
      }

      // Step 3: Get user's group memberships with roles
      const { data: memberships, error: membershipError } = await supabase
        .from('group_memberships')
        .select(`
          group_id,
          status,
          groups(id, name),
          roles(name, display_name)
        `)
        .eq('member_id', signInData.user.id)
        .eq('status', 'active');

      if (membershipError) {
        console.error('❌ Membership query failed:', membershipError);
        throw new Error('Failed to get user memberships');
      }

      // Step 4: Get user's permissions
      const { data: permissions, error: permissionError } = await supabase
        .from('group_memberships')
        .select(`
          role_permissions!inner(
            permissions!inner(name)
          )
        `)
        .eq('member_id', signInData.user.id)
        .eq('status', 'active');

      const userPermissions = permissions?.flatMap(gm => 
        gm.role_permissions.map(rp => rp.permissions.name)
      ) || [];

      // Use first active group as current group
      const currentGroup = memberships?.[0];
      const isAdmin = memberships?.some(m => m.roles.name === 'admin') || false;

      console.log('✅ Enhanced login completed successfully');

      return {
        token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: {
          id: signInData.user.id,
          email: signInData.user.email,
          name: memberData.name,
          avatar_url: memberData.avatar_url,
          provider: memberData.auth_provider as AuthProvider,
          current_group_id: currentGroup?.group_id,
          is_admin: isAdmin,
          memberships: memberships,
          permissions: userPermissions
        }
      };

    } catch (error: any) {
      console.error('❌ Enhanced login error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedAuthService = new EnhancedAuthServiceCompatible();