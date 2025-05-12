import { Request, Response } from 'express';
import { getSupabaseUserClientFromRequest } from '../utils/supabaseClient';

export const getTeamMembers = async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseUserClientFromRequest(req);
  const userId = (req as any).user.id;

  // Step 1: Get client_id of the logged in user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('clientid')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    res.status(403).json({ error: 'Unauthorized or missing user' });
    return;
  }

  // Step 2: Return all users (members) for this client
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, is_active, created_at')
    .eq('clientid', user.clientid);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json(data);
};

// 1. Invite a new team member (Admin only)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseUserClientFromRequest(req);
  const adminId = (req as any).user.id;

  const { email, name, role } = req.body;

  // Step 1: Get admin's client_id and role
  const { data: adminData, error: adminError } = await supabase
    .from('users')
    .select('clientid, role')
    .eq('id', adminId)
    .single();

  if (adminError || !adminData || adminData.role !== 'Admin') {
    res.status(403).json({ error: 'Only admins can invite members' });
    return;
  }

  // Step 2: Create new user record (user must verify their email separately)
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        clientid: adminData.clientid,
        email,
        name,
        role: role ?? 'Member',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
};

// 2. Update user role (Admin only)
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseUserClientFromRequest(req);
  const adminId = (req as any).user.id;
  const { userId, newRole } = req.body;

  // Validate input
  if (!['Admin', 'Member'].includes(newRole)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  // Check admin privileges
  const { data: adminData, error: adminError } = await supabase
    .from('users')
    .select('clientid, role')
    .eq('userId', adminId)
    .single();

  if (adminError || adminData?.role !== 'Admin') {
    res.status(403).json({ error: 'Only admins can update roles' });
    return;
  }

  // Update role for a user within same client
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('userId', userId)
    .eq('clientid', adminData.clientid);

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.status(200).json({ message: 'Role updated successfully' });
};


// 3. Deactivate user (Admin only)
export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseUserClientFromRequest(req);
  const adminId = (req as any).user.id;
  const { userId } = req.body;

  const { data: adminData, error: adminError } = await supabase
    .from('users')
    .select('clientid, role')
    .eq('id', adminId)
    .single();

  if (adminError || adminData?.role !== 'Admin') {
    res.status(403).json({ error: 'Only admins can deactivate users' });
    return;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('clientid', adminData.clientid);

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.status(200).json({ message: 'User deactivated successfully' });
};

export const updateUserRoleExplicit = async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseUserClientFromRequest(req);
  const requestingUserId = (req as any).user.id;

  const { userId, newRole } = req.body;

  if (!['Admin', 'Member'].includes(newRole)) {
    res.status(400).json({ error: 'Invalid role provided' });
    return;
  }

  // Check if requesting user is admin
  const { data: requester, error: requesterError } = await supabase
    .from('users')
    .select('clientid, role')
    .eq('id', requestingUserId)
    .single();

  if (requesterError || requester?.role !== 'Admin') {
    res.status(403).json({ error: 'Only admins can change roles' });
    return;
  }

  // Update role only within same client
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('clientid', requester.clientid);

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.status(200).json({ message: `User role updated to ${newRole}` });
};

