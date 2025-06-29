import { SupabaseClient } from '@supabase/supabase-js';

export const fetchCurrentUserProfile = async (supabaseClient: SupabaseClient, userId: string) => {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('userid', userId)
    .single();

  if (error || !data) {
    throw new Error('User not found');
  }

  return data;
};

export const fetchUsersForClient = async (supabaseClient: SupabaseClient, userId: string) => {
  const { data: userData, error: userError } = await supabaseClient
    .from('users')
    .select('clientid')
    .eq('userid', userId)
    .single();

  if (userError || !userData) {
    throw new Error('User client mapping not found');
  }

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('clientid', userData.clientid);

  if (error) throw new Error(error.message);
  return data;
};