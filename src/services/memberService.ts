import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

const mockDB: any = {
  members: []
};

export const getMemberById = async (id: string) => {
  return mockDB.members.find((m: any) => m.id === id);
};

export const getMembersByGroupId = async (groupId: string) => {
  return mockDB.members.filter((m: any) => m.group_id === groupId);
};

export const inviteMember = async (groupId: string, data: any) => {
  const newUser = {
    id: crypto.randomUUID(),
    email: data.email,
    name: data.name,
    is_admin: data.is_admin || false,
    group_id: groupId,
    status: 'invited'
  };
  mockDB.members.push(newUser);
  return newUser;
};

export const updateMember = async (id: string, data: any, currentUser: any) => {
  const index = mockDB.members.findIndex((m: any) => m.id === id);
  if (index === -1) throw new Error('Not found');
  if (id !== currentUser.id && !currentUser.is_admin) throw new Error('Forbidden');
  mockDB.members[index] = { ...mockDB.members[index], ...data };
  return mockDB.members[index];
};

export const deleteMember = async (id: string, currentUser: any) => {
  if (!currentUser.is_admin) throw new Error('Forbidden');
  const index = mockDB.members.findIndex((m: any) => m.id === id);
  if (index !== -1) mockDB.members.splice(index, 1);
};

export const signup = async (data: any) => {
  let groupId = data.group_id ?? null;
  let newGroup = null;

  if (!groupId) {
    groupId = uuidv4();
    const groupData = {
      id: groupId,
      name: `${data.name}'s Group`,
      plan: 'Household',
      type: 'personal',
      status: 'active',
      created_at: new Date().toISOString()
    };

    const { error: groupError } = await supabase.from('groups').insert(groupData);
    if (groupError) throw groupError;
    newGroup = groupData;
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        role: 'admin',
        clientid: groupId
      }
    }
  });

  if (error || !authData.user) throw error;

  const memberRecord = {
    id: authData.user.id,
    email: data.email,
    group_id: groupId,
    is_admin: true,
    password_hash: bcrypt.hashSync(data.password, 10),
  };

  const { error: insertError } = await supabase
    .from('members')
    .insert(memberRecord);

  if (insertError) throw insertError;

  return {
    token: authData.session?.access_token,
    group: newGroup,
    user: {
      id: authData.user.id,
      email: authData.user.email,
      name: data.name,
      group_id: groupId,
      is_admin: true
    }
  };
};

export const login = async (data: any) => {
  const { data: response, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password
  });

  if (error || !response.session) throw new Error('Invalid credentials');
  return response.session.access_token;
};

export const logout = async (_token: string) => {
  return;
};
