import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  group_id: z.string().uuid().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  is_admin: z.boolean().optional()
});

const updateMemberSchema = z.object({
  name: z.string().optional(),
  is_admin: z.boolean().optional()
});

export const validate = (schema: 'signup' | 'login' | 'inviteMember' | 'updateMember', data: any) => {
  switch (schema) {
    case 'signup':
      return signupSchema.parse(data);
    case 'login':
      return loginSchema.parse(data);
    case 'inviteMember':
      return inviteMemberSchema.parse(data);
    case 'updateMember':
      return updateMemberSchema.parse(data);
    default:
      throw new Error('Unknown schema');
  }
};