import { supabase } from '../../utils/supabaseClient';
import { Bairro } from '../../types/adm';

export async function fetchBairros(page: number, searchTerm: string = '') {
  const from = (page - 1) * 10;
  const to = from + 9;

  // Get total count
  const { count: totalCount } = await supabase
    .from('bairros')
    .select('*', { count: 'exact', head: true })
    .ilike('nome', `%${searchTerm}%`);

  if (totalCount === null) throw new Error('Erro ao contar bairros');

  // Get bairros
  const { data: bairros, error } = await supabase
    .from('bairros')
    .select('*')
    .ilike('nome', `%${searchTerm}%`)
    .range(from, to)
    .order('nome');

  if (error) throw error;

  return {
    bairros: bairros || [],
    totalPages: Math.ceil(totalCount / 10)
  };
}

export async function addBairro(bairro: Omit<Bairro, 'id' | 'created_at'>): Promise<Bairro> {
  const { data, error } = await supabase
    .from('bairros')
    .insert([bairro])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBairro(id: number, bairro: Partial<Bairro>) {
  const { error } = await supabase
    .from('bairros')
    .update(bairro)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteBairro(id: number) {
  const { error } = await supabase
    .from('bairros')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
