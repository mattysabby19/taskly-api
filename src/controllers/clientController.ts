import { Request, Response } from 'express';
import { getSupabaseUserClientFromRequest } from '../utils/supabaseClient';

export const getClientProfile = async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseUserClientFromRequest(req);
  const userId = (req as any).user.id;

  // Step 1: Find user's client ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('clientid')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    res.status(403).json({ error: 'User not found' });
    return;
  }

  // Step 2: Get client profile
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', user.clientid)
    .single();

  if (clientError) {
    res.status(500).json({ error: clientError.message });
    return;
  }

  res.status(200).json(client);
};

export const createClientWithAdmin = async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseUserClientFromRequest(req);

  const { name, email, phone, address, password, adminName } = req.body;

  // 1. Insert Client
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .insert([{ name, email, phone, address }])
    .select('*')
    .single();
    console.log('Insert response:', { clientData, clientError });


  if (clientError || !clientData?.clientid) {
  console.error('Client creation failed:', clientError, clientData); // Log both
  res.status(500).json({ error: clientError?.message || 'Failed to create client' });
  return;
}
  const clientId = clientData.clientid;
  console.log('Created client ID:', clientId);

  // 2. Insert Admin User (with client_id)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert([
      {
         clientid: clientId, 
        email,
        name: adminName ?? 'Admin',
        role: 'Admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select('*')
    .single();

  if (userError) {
    res.status(500).json({ error: userError.message });
    return;
  }

  res.status(201).json({ client: clientData, admin: userData });
};
