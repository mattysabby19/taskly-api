import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { getSupabaseUserClientFromRequest, getSupabaseForUser } from '../utils/supabaseClient';

export const getTasks = async (req: Request, res: Response): Promise<void> => {  
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = getSupabaseUserClientFromRequest(req);

const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .order('due_date', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json(data);
};

export const addTask = async (req: Request, res: Response): Promise<void> => {
  const { title, category, frequency, assignee, due_date } = req.body;
  const userId = (req as any).user.id; // Assuming user ID is stored in req.user
  const token = req.headers.authorization?.split(' ')[1];
  const supabaseUserClient = getSupabaseForUser(token!);

  const { data, error } = await supabaseUserClient
    .from('tasks')
    .insert([
      {
        user_id: userId,
        title,
        category,
        frequency,
        assignee,
        due_date,
        completed: false,
      }
    ])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
};
