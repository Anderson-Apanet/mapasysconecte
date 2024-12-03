import { useState, useEffect } from 'react';
import { User, UserTipo } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  onSuccess: () => void;
}

export default function UserModal({ isOpen, onClose, user, onSuccess }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [resetingPassword, setResetingPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userTipoId, setUserTipoId] = useState<number>(1);
  const [userTipos, setUserTipos] = useState<UserTipo[]>([]);

  useEffect(() => {
    if (user) {
      setNome(user.nome || '');
      setEmail(user.auth_user?.email || '');
      setPhone(user.auth_user?.phone || '');
      setUserTipoId(user.id_user_tipo || 1);
    } else {
      setNome('');
      setEmail('');
      setPhone('');
      setUserTipoId(1);
    }
  }, [user]);

  useEffect(() => {
    fetchUserTipos();
  }, []);

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

  const generateRandomPassword = () => {
    const length = 12;
    const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    const numberChars = "0123456789";
    const specialChars = "!@#$%^&*";
    
    // Garantir pelo menos um de cada tipo
    let password = 
      uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)] +
      lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)] +
      numberChars[Math.floor(Math.random() * numberChars.length)] +
      specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // Completar o resto da senha
    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Embaralhar a senha
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Se for um novo usuário
      if (!user) {
        // Verificar se o email já existe
        const { data: existingUsers, error: searchError } = await supabase
          .from('users')
          .select('email')
          .eq('email', email)
          .limit(1);

        if (searchError) {
          throw searchError;
        }

        if (existingUsers && existingUsers.length > 0) {
          toast.error('Este email já está cadastrado no sistema.');
          setLoading(false);
          return;
        }

        const password = generateRandomPassword();
        
        // 1. Criar usuário no auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome,
              phone
            },
            emailRedirectTo: `${window.location.origin}/login`
          }
        });

        if (authError) {
          if (authError.message === 'User already registered') {
            toast.error('Este email já está registrado no sistema.');
            setLoading(false);
            return;
          }
          throw authError;
        }

        if (!authData.user) {
          throw new Error('Erro ao criar usuário no auth');
        }

        // 2. Criar usuário na tabela public.users
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            id_user: authData.user.id,
            nome,
            email,
            id_user_tipo: userTipoId
          }]);

        if (userError) {
          console.error('Erro ao criar usuário na tabela users:', userError);
          toast.error('Erro ao criar usuário. Por favor, tente novamente.');
          return;
        }

        // 3. Mostrar senha temporária e instruções
        toast.success(
          'Usuário criado com sucesso!\n\n' +
          'Senha temporária: ' + password + '\n\n' +
          'Por favor, anote esta senha e forneça ao usuário de forma segura. ' +
          'Um email de confirmação será enviado para o usuário.',
          { duration: 10000 } // Mostrar por 10 segundos
        );

        onSuccess();
        onClose();
      } else {
        // Atualizar usuário existente
        const updates = {
          nome,
          id_user_tipo: userTipoId
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
            nome
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

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast.error('Erro ao salvar usuário: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.auth_user?.email) return;
    
    try {
      setResetingPassword(true);
      const { error } = await supabase.auth.resetPasswordForEmail(
        user.auth_user.email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      
      if (error) throw error;
      
      toast.success('Email de redefinição de senha enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      toast.error('Erro ao enviar email de redefinição: ' + error.message);
    } finally {
      setResetingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-2xl transform overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all">
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

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
              {user && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetingPassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 rounded-lg transition-colors duration-200"
                >
                  {resetingPassword ? 'Enviando...' : 'Resetar Senha'}
                </button>
              )}
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
