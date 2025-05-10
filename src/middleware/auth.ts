import { RequestHandler } from 'express';
import { supabase } from '../config/supabase';
import {createClient} from '@supabase/supabase-js';

export const getSupabaseForUser = (token: string) =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,  // use anon key, not service key
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

export const authenticate: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  (req as any).user = { id: data.user.id };
  next();
};
