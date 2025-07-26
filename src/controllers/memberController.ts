import { Request, Response } from 'express';
import * as memberService from '../services/memberService';
import { validate } from '../validators/memberValidator';
import { groupGuard } from '../middleware/groupGuard';

export const getMe = async (req: Request, res: Response) => {
  try {
    const member = (req as any).user;
    const profile = await memberService.getMemberById(member.id);
    res.json(profile);
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

export const getGroupMembers = async (req: Request, res: Response) => {
  try {
    await groupGuard(req, res, () => {});
    const members = await memberService.getMembersByGroupId(req.params.groupId);
    res.json(members);
  } catch (error: any) {
    console.error('Get group members error:', error);
    res.status(500).json({ error: 'Failed to get group members' });
  }
};

export const inviteMember = async (req: Request, res: Response) => {
  try {
    await groupGuard(req, res, () => {});
    const data = validate('inviteMember', req.body);
    const result = await memberService.inviteMember(req.params.groupId, data);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Invite member error:', error);
    res.status(400).json({ error: error.message || 'Failed to invite member' });
  }
};

export const updateMember = async (req: Request, res: Response) => {
  try {
    const data = validate('updateMember', req.body);
    const currentUserId = (req as any).user.id;
    const updated = await memberService.updateMember(req.params.id, data, currentUserId);
    res.json(updated);
  } catch (error: any) {
    console.error('Update member error:', error);
    res.status(400).json({ error: error.message || 'Failed to update member' });
  }
};

export const removeMemberFromGroup = async (req: Request, res: Response) => {
  try {
    await groupGuard(req, res, () => {});
    const { id, groupId } = req.params;
    const currentUserId = (req as any).user.id;
    
    await memberService.removeMemberFromGroup(id, groupId, currentUserId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Remove member error:', error);
    res.status(400).json({ error: error.message || 'Failed to remove member' });
  }
};

// Get member by ID
export const getMemberById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const member = await memberService.getMemberById(id);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json(member);
  } catch (error: any) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Failed to retrieve member' });
  }
};

// Get group admins
export const getGroupAdmins = async (req: Request, res: Response) => {
  try {
    await groupGuard(req, res, () => {});
    const { groupId } = req.params;
    const members = await memberService.getMembersByGroupId(groupId);
    
    // Filter for admin roles
    const admins = members.filter((member: any) => 
      member.memberships.some((m: any) => 
        m.group_id === groupId && m.role.name === 'admin'
      )
    );
    
    res.json(admins);
  } catch (error: any) {
    console.error('Get group admins error:', error);
    res.status(500).json({ error: 'Failed to retrieve group admins' });
  }
};

// Update member role (admin only)
export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const { id, groupId } = req.params;
    const { role_name } = req.body;
    const currentUserId = (req as any).user.id;
    
    if (!role_name) {
      return res.status(400).json({ error: 'role_name is required' });
    }
    
    await memberService.updateMemberRole(id, groupId, role_name, currentUserId);
    res.json({ success: true, message: 'Member role updated successfully' });
  } catch (error: any) {
    console.error('Update member role error:', error);
    res.status(400).json({ error: error.message || 'Failed to update member role' });
  }
};

// Get member's group context
export const getMemberGroupContext = async (req: Request, res: Response) => {
  try {
    const memberId = (req as any).user.id;
    const { groupId } = req.query;
    
    const context = await memberService.getMemberGroupContext(memberId, groupId as string);
    res.json(context);
  } catch (error: any) {
    console.error('Get member group context error:', error);
    res.status(500).json({ error: 'Failed to get member group context' });
  }
};