import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { getSupabaseUserClientFromRequest, getSupabaseForUser } from '../utils/supabaseClient';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseUserClientFromRequest(req);
  const userId = (req as any).user.id;
 console.log('User ID:', userId);
  // Step 1: Fetch the user's client_id
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('clientid')
    .eq('userid', userId)
    .single();

  if (userError || !userData) {
    res.status(403).json({ error: 'Unable to fetch client ID for user' });
    return;
  }

  // Step 2: Fetch tasks for that client
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('clientid', userData.clientid)
    .order('duedate', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json(data);
};


export const addTask = async (req: Request, res: Response): Promise<void> => {
  const {
    title,
    description,
    duedate,
    priority,
    status,
    assignedtouserid,
    isrecurring,
    recurrencerule,
    parenttaskid
  } = req.body;

  const userId = (req as any).user.id;
  console.log('User ID:', userId);
  const token = req.headers.authorization?.split(' ')[1];
  const supabaseUserClient = getSupabaseForUser(token!);

  // Step 1: Get user's client ID
  const { data: userData, error: userError } = await supabaseUserClient
    .from('users')
    .select('clientid')
    .eq('userid', userId)
    .single();

  if (userError || !userData) {
    res.status(403).json({ error: 'User not found or no client associated' });
    return;
  }

  // Step 2: Insert new task
  const { data, error } = await supabaseUserClient
    .from('tasks')
    .insert([
      {
        clientid: userData.clientid,
        createdbyuserid: userId,
        assignedtouserid,
        title,
        description,
        duedate,
        priority,
        status,
        isrecurring,
        recurrencerule,
        parenttaskid,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
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
