// Enhanced Member Service - Updated to use group_memberships schema
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

// Member interfaces matching new schema
export interface Member {
  id: string;
  email: string;
  name: string;
  auth_provider?: string;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login?: string;
  email_verified?: boolean;
  marketing_consent?: boolean;
  analytics_consent?: boolean;
  privacy_policy_accepted_at?: string;
  deletion_requested_at?: string;
}

export interface MemberWithMemberships extends Member {
  memberships: {
    group_id: string;
    role_id: string;
    status: string;
    joined_at: string;
    group: {
      id: string;
      name: string;
      plan: string;
      type: string;
    };
    role: {
      name: string;
      display_name: string;
      permissions: string[];
    };
  }[];
}

export interface InviteMemberData {
  email: string;
  name: string;
  role_name: string;
  message?: string;
}

export interface UpdateMemberData {
  name?: string;
  avatar_url?: string;
  marketing_consent?: boolean;
  analytics_consent?: boolean;
}

/**
 * Get member by ID with all memberships and roles
 */
export const getMemberById = async (id: string): Promise<MemberWithMemberships | null> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        group_memberships (
          group_id,
          role_id,
          status,
          joined_at,
          groups (
            id,
            name,
            plan,
            type
          ),
          roles (
            name,
            display_name,
            permissions
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get member: ${error.message}`);
    }

    return {
      ...data,
      memberships: data.group_memberships || []
    };
  } catch (error: any) {
    console.error('Get member by ID error:', error);
    throw error;
  }
};

/**
 * Get all members in a group with their roles
 */
export const getMembersByGroupId = async (groupId: string): Promise<MemberWithMemberships[]> => {
  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(`
        *,
        members (
          id,
          email,
          name,
          auth_provider,
          avatar_url,
          status,
          created_at,
          updated_at,
          last_login,
          email_verified
        ),
        roles (
          name,
          display_name,
          permissions
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to get group members: ${error.message}`);
    }

    // Transform the data to match our interface
    return data?.map(membership => ({
      ...membership.members,
      memberships: [{
        group_id: membership.group_id,
        role_id: membership.role_id,
        status: membership.status,
        joined_at: membership.joined_at,
        group: {
          id: groupId,
          name: '', // Would need to join groups table
          plan: '',
          type: ''
        },
        role: {
          name: membership.roles.name,
          display_name: membership.roles.display_name,
          permissions: membership.roles.permissions
        }
      }]
    })) || [];
  } catch (error: any) {
    console.error('Get members by group ID error:', error);
    throw error;
  }
};

/**
 * Invite a new member to a group
 */
export const inviteMember = async (groupId: string, data: InviteMemberData): Promise<{ member: Member; invitation_id: string }> => {
  try {
    // Check if member already exists
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('email', data.email)
      .single();

    let memberId = existingMember?.id;

    // Create member if doesn't exist
    if (!memberId) {
      memberId = uuidv4();
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          id: memberId,
          email: data.email,
          name: data.name,
          status: 'active'
        });

      if (memberError) {
        throw new Error(`Failed to create member: ${memberError.message}`);
      }
    }

    // Get role ID
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', data.role_name)
      .single();

    if (roleError || !role) {
      throw new Error(`Role '${data.role_name}' not found`);
    }

    // Check if membership already exists
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('member_id', memberId)
      .eq('group_id', groupId)
      .single();

    if (existingMembership) {
      throw new Error('Member is already part of this group');
    }

    // Create group membership
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        member_id: memberId,
        group_id: groupId,
        role_id: role.id,
        status: 'invited',
        joined_at: new Date().toISOString()
      });

    if (membershipError) {
      throw new Error(`Failed to create membership: ${membershipError.message}`);
    }

    // Create invitation record
    const invitationId = uuidv4();
    const { error: inviteError } = await supabase
      .from('invitations')
      .insert({
        id: invitationId,
        group_id: groupId,
        email: data.email,
        role_name: data.role_name,
        message: data.message,
        status: 'pending'
      });

    if (inviteError) {
      console.error('Failed to create invitation record:', inviteError);
      // Don't throw here, membership was created successfully
    }

    // Get the created member
    const member = await getMemberById(memberId);
    if (!member) {
      throw new Error('Failed to retrieve created member');
    }

    return {
      member,
      invitation_id: invitationId
    };
  } catch (error: any) {
    console.error('Invite member error:', error);
    throw error;
  }
};

/**
 * Update member information
 */
export const updateMember = async (id: string, data: UpdateMemberData, currentUserId: string): Promise<Member> => {
  try {
    // Check permissions - user can update themselves, or admin can update others
    if (id !== currentUserId) {
      const currentUser = await getMemberById(currentUserId);
      const hasAdminRole = currentUser?.memberships.some(m => 
        m.role.permissions.includes('members:write')
      );
      
      if (!hasAdminRole) {
        throw new Error('Forbidden: Cannot update other members');
      }
    }

    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { data: updatedMember, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update member: ${error.message}`);
    }

    return updatedMember;
  } catch (error: any) {
    console.error('Update member error:', error);
    throw error;
  }
};

/**
 * Remove member from group (soft delete membership)
 */
export const removeMemberFromGroup = async (memberId: string, groupId: string, currentUserId: string): Promise<void> => {
  try {
    // Check admin permissions
    const currentUser = await getMemberById(currentUserId);
    const hasAdminRole = currentUser?.memberships.some(m => 
      m.group_id === groupId && m.role.permissions.includes('members:delete')
    );
    
    if (!hasAdminRole) {
      throw new Error('Forbidden: Only group admins can remove members');
    }

    // Update membership status instead of deleting (for audit trail)
    const { error } = await supabase
      .from('group_memberships')
      .update({
        status: 'removed',
        left_at: new Date().toISOString()
      })
      .eq('member_id', memberId)
      .eq('group_id', groupId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Remove member error:', error);
    throw error;
  }
};

/**
 * Update member role in a group
 */
export const updateMemberRole = async (memberId: string, groupId: string, newRoleName: string, currentUserId: string): Promise<void> => {
  try {
    // Check admin permissions
    const currentUser = await getMemberById(currentUserId);
    const hasAdminRole = currentUser?.memberships.some(m => 
      m.group_id === groupId && m.role.permissions.includes('members:write')
    );
    
    if (!hasAdminRole) {
      throw new Error('Forbidden: Only group admins can update member roles');
    }

    // Get new role ID
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', newRoleName)
      .single();

    if (roleError || !role) {
      throw new Error(`Role '${newRoleName}' not found`);
    }

    // Update membership role
    const { error } = await supabase
      .from('group_memberships')
      .update({ role_id: role.id })
      .eq('member_id', memberId)
      .eq('group_id', groupId);

    if (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Update member role error:', error);
    throw error;
  }
};

/**
 * Get member's current group context
 */
export const getMemberGroupContext = async (memberId: string, groupId?: string): Promise<{
  current_group: {
    id: string;
    name: string;
    role: string;
    permissions: string[];
  };
  all_groups: {
    id: string;
    name: string;
    role: string;
  }[];
}> => {
  try {
    const member = await getMemberById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    const activeMemberships = member.memberships.filter(m => m.status === 'active');
    
    // If no groupId specified, use the first active membership
    const currentGroupId = groupId || activeMemberships[0]?.group_id;
    const currentMembership = activeMemberships.find(m => m.group_id === currentGroupId);
    
    if (!currentMembership) {
      throw new Error('Member has no active group memberships');
    }

    return {
      current_group: {
        id: currentMembership.group_id,
        name: currentMembership.group.name,
        role: currentMembership.role.name,
        permissions: currentMembership.role.permissions
      },
      all_groups: activeMemberships.map(m => ({
        id: m.group_id,
        name: m.group.name,
        role: m.role.name
      }))
    };
  } catch (error: any) {
    console.error('Get member group context error:', error);
    throw error;
  }
};
