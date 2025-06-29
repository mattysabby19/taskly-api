import { Request, Response } from 'express';
import * as memberService from '../services/memberService';
import { validate }  from '../validators/memberValidator';
import { groupGuard } from '../middleware/groupGuard';

export const getMe = async (req: Request, res: Response) => {
  const member = (req as any).user;
  const profile = await memberService.getMemberById(member.id);
  res.json(profile);
};

export const getGroupMembers = async (req: Request, res: Response) => {
  await groupGuard(req, res, () => {});
  const members = await memberService.getMembersByGroupId(req.params.groupId);
  res.json(members);
};

export const inviteMember = async (req: Request, res: Response) => {
  await groupGuard(req, res, () => {});
  const data = validate('inviteMember', req.body);
  const newMember = await memberService.inviteMember(req.params.groupId, data);
  res.status(201).json(newMember);
};

export const updateMember = async (req: Request, res: Response) => {
  const data = validate('updateMember', req.body);
  const updated = await memberService.updateMember(req.params.id, data, (req as any).user);
  res.json(updated);
};

export const deleteMember = async (req: Request, res: Response) => {
  await groupGuard(req, res, () => {});
  await memberService.deleteMember(req.params.id, (req as any).user);
  res.status(204).send();
};

export const signup = async (req: Request, res: Response) => {
  try {
    const data = validate('signup', req.body);
    const token = await memberService.signup(data);
    res.status(201).json({ token });
  } catch (error: any) {
    console.error('Signup error:', error); // ✅ log for debugging
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const data = validate('login', req.body);
  const token = await memberService.login(data);
  res.json({ token });
};

export const logout = async (req: Request, res: Response) => {
  const token = (req as any).user.token;
  await memberService.logout(token);
  res.status(204).send();
};