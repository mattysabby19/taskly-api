// src/utils/supabaseClient.ts
import { Request } from 'express';
import { createClient } from '@supabase/supabase-js';

export const getSupabaseForUser = (token: string) =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

export const getSupabaseUserClientFromRequest = (req: Request) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('Missing bearer token');
  return getSupabaseForUser(token);
};
