import { useState, useEffect } from 'react';
import { User, Empresa, UserTipo } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  onSave: () => void;
}

export default function UserModal({ isOpen, onClose, user, onSave }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [empresaId, setEmpresaId] = useState<number>(0);
  const [userTipoId, setUserTipoId] = useState<number>(1);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [userTipos, setUserTipos] = useState<UserTipo[]>([]);

  useEffect(() => {
    if (user) {
      setNome(user.nome || '');
      setEmail(user.auth_user?.email || '');
      setPhone(user.auth_user?.phone || '');
      setEmpresaId(user.id_empresa || 0);
      setUserTipoId(user.id_user_tipo || 1);
      setIsSuperAdmin(user.auth_user?.is_super_admin || false);
    } else {
      setNome('');
      setEmail('');
      setPhone('');
      setEmpresaId(0);
      setUserTipoId(1);
      setIsSuperAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEmpresas();
    fetchUserTipos();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id_empresa, nome, cnpj')
        .order('nome');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar empresas: ' + error.message);
    }
  };

  const fetchUserTipos = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tipo')
        .select('id_user_tipo, tipo')
        .order('id_user_tipo');

      if (error) throw error;
      setUserTipos(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar tipos de usuário: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Se for um novo usuário
      if (!user) {
        // 1. Criar usuário no auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: generateRandomPassword(),
          options: {
            data: {
              nome,
              is_super_admin: isSuperAdmin
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Erro ao criar usuário no auth');

        // 2. Criar usuário na tabela public.users
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            id_user: authData.user.id,
            nome,
            email,
            id_empresa: empresaId,
            id_user_tipo: userTipoId
          }]);

        if (userError) {
          // Se falhar ao criar na tabela public.users, tentar deletar o usuário do auth
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw userError;
        }

        // 3. Atualizar o telefone se fornecido
        if (phone) {
          const { error: phoneError } = await supabase.auth.updateUser({
            phone
          });

          if (phoneError) {
            console.warn('Erro ao atualizar telefone:', phoneError);
          }
        }

        toast.success('Usuário criado com sucesso! Um email de confirmação foi enviado.');
      } else {
        // Atualizar usuário existente
        const updates = {
          nome,
          id_empresa: empresaId,
          id_user_tipo: userTipoId,
          updated_at: new Date().toISOString()
        };

        // 1. Atualizar na tabela public.users
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id_user', user.id_user);

        if (updateError) throw updateError;

        // 2. Atualizar dados do auth user
        const authUpdates: any = {
          data: {
            nome,
            is_super_admin: isSuperAdmin
          }
        };

        if (phone !== user.auth_user?.phone) {
          authUpdates.phone = phone;
        }

        const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);

        if (authUpdateError) {
          console.warn('Erro ao atualizar dados do auth:', authUpdateError);
        }

        toast.success('Usuário atualizado com sucesso!');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast.error('Erro ao salvar usuário: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-2xl transform overflow-hidden backdrop-blur-md bg-white/80 dark:bg-gray-800/80 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {user ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome
              </label>
              <input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
                disabled={!!user}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefone
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            <div>
              <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Empresa
              </label>
              <select
                id="empresa"
                value={empresaId}
                onChange={(e) => setEmpresaId(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              >
                <option value={0}>Selecione uma empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id_empresa} value={empresa.id_empresa}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="userTipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de Usuário
              </label>
              <select
                id="userTipo"
                value={userTipoId}
                onChange={(e) => setUserTipoId(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              >
                {userTipos.map((tipo) => (
                  <option key={tipo.id_user_tipo} value={tipo.id_user_tipo}>
                    {tipo.tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="superadmin"
                checked={isSuperAdmin}
                onChange={(e) => setIsSuperAdmin(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
              />
              <label htmlFor="superadmin" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Super Administrador
              </label>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                {loading ? 'Salvando...' : user ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
