// src/middleware/groupGuard.ts
import { Request, Response, NextFunction } from 'express';

export const groupGuard = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const groupId = req.params.groupId || req.body.groupId;

  if (!groupId || user.group_id !== groupId) {
    return res.status(403).json({ error: 'Access denied: not part of group' });
  }

  next();
};
