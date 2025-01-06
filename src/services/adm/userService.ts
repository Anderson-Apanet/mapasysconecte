import { supabase } from '../../utils/supabaseClient';
import { User, UserTipo } from '../../types/adm';

export async function fetchUsers(page: number, searchTerm: string = '') {
  const from = (page - 1) * 10;
  const to = from + 9;

  // Get total count
  const { count: totalCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .ilike('nome', `%${searchTerm}%`);

  if (totalCount === null) throw new Error('Erro ao contar usuários');

  // Get users with join
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      *,
      user_tipo (tipo)
    `)
    .ilike('nome', `%${searchTerm}%`)
    .range(from, to)
    .order('nome');

  if (error) throw error;

  return {
    users: users || [],
    totalPages: Math.ceil(totalCount / 10)
  };
}

export async function deleteUser(userId: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id_user', userId);

  if (error) throw error;
}

export async function fetchUserTypes() {
  const { data, error } = await supabase
    .from('user_tipo')
    .select('*')
    .order('tipo');

  if (error) throw error;
  return data || [];
}

export async function addUserType(tipo: string): Promise<UserTipo> {
  const { data, error } = await supabase
    .from('user_tipo')
    .insert([{ tipo }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function editUserType(id: number, tipo: string) {
  const { error } = await supabase
    .from('user_tipo')
    .update({ tipo })
    .eq('id_user_tipo', id);

  if (error) throw error;
}

export async function deleteUserType(id: number) {
  // First delete permissions
  const { error: permissionsError } = await supabase
    .from('user_tipo_permissoes')
    .delete()
    .eq('id_user_tipo', id);

  if (permissionsError) throw permissionsError;

  // Then delete the user type
  const { error } = await supabase
    .from('user_tipo')
    .delete()
    .eq('id_user_tipo', id);

  if (error) throw error;
}

export async function fetchUserTypePermissions(userTypeId: number) {
  const { data, error } = await supabase
    .from('user_tipo_permissoes')
    .select('*')
    .eq('id_user_tipo', userTypeId);

  if (error) throw error;
  return data || [];
}
