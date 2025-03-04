import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface User {
  id_user: string;
  nome: string;
  email: string;
  id_user_tipo: number;
  created_at: string;
  user_tipo: { id_user_tipo: number; tipo: string };
}

interface UserTipo {
  id_user_tipo: number;
  tipo: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTipos, setUserTipos] = useState<UserTipo[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    nome: '',
    email: '',
    senha: '',
    id_user_tipo: 1
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    // Carregar tipos de usuário
    const createDefaultUserTypes = async () => {
      try {
        console.log('Verificando se a tabela user_tipo existe...');
        
        // Verificar se a tabela user_tipo existe
        const { data: tableExists, error: tableError } = await supabase
          .from('user_tipo')
          .select('count(*)')
          .limit(1)
          .single();
          
        console.log('Resultado da verificação da tabela:', tableExists, tableError);
        
        // Se houver erro, a tabela pode não existir
        if (tableError) {
          console.log('Tabela user_tipo pode não existir, criando tipos padrão...');
          // Definir tipos padrão para o dropdown
          setUserTipos([
            { id_user_tipo: 1, tipo: 'Administrador' },
            { id_user_tipo: 2, tipo: 'Financeiro' },
            { id_user_tipo: 3, tipo: 'Técnico' },
            { id_user_tipo: 4, tipo: 'Atendimento' }
          ]);
          return;
        }
        
        // Se a tabela existe, buscar os tipos
        await fetchUserTipos();
      } catch (error) {
        console.error('Erro ao verificar tipos de usuário:', error);
        // Definir tipos padrão em caso de erro
        setUserTipos([
          { id_user_tipo: 1, tipo: 'Administrador' },
          { id_user_tipo: 2, tipo: 'Financeiro' },
          { id_user_tipo: 3, tipo: 'Técnico' },
          { id_user_tipo: 4, tipo: 'Atendimento' }
        ]);
      }
    };
    
    createDefaultUserTypes();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_tipo (id_user_tipo, tipo)
        `);

      if (error) throw error;

      console.log('Usuários carregados:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  const fetchUserTipos = async () => {
    try {
      console.log('Buscando tipos de usuário...');
      const { data, error } = await supabase
        .from('user_tipo')
        .select('*')
        .order('id_user_tipo');

      if (error) throw error;
      
      console.log('Tipos de usuário carregados:', data);
      setUserTipos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tipos de usuário:', error);
      toast.error('Erro ao carregar tipos de usuário');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleAddUser = () => {
    setIsCreateModalOpen(true);
  };

  const handleUserSuccess = () => {
    fetchUsers();
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: name === 'id_user_tipo' ? parseInt(value) : value
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Criando usuário com dados:', newUser);
      
      // 1. Criar usuário no Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.senha,
        options: {
          data: {
            nome: newUser.nome
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Falha ao criar usuário no Auth');
      }

      console.log('Usuário criado no Auth:', authData.user.id);

      // 2. Criar usuário na tabela users
      const userData = {
        id_user: authData.user.id,
        nome: newUser.nome,
        email: newUser.email,
        id_user_tipo: newUser.id_user_tipo
      };
      
      console.log('Inserindo dados na tabela users:', userData);
      
      const { error: userError } = await supabase
        .from('users')
        .insert(userData);

      if (userError) {
        console.error('Erro ao inserir na tabela users:', userError);
        // Se falhar ao inserir o id_user_tipo, tente inserir sem ele
        if (userError.message.includes('foreign key constraint')) {
          console.log('Tentando inserir sem id_user_tipo devido a restrição de chave estrangeira');
          const { error: retryError } = await supabase
            .from('users')
            .insert({
              id_user: authData.user.id,
              nome: newUser.nome,
              email: newUser.email
            });
            
          if (retryError) throw retryError;
        } else {
          throw userError;
        }
      }

      toast.success('Usuário criado com sucesso! Um email de confirmação foi enviado.');
      setIsCreateModalOpen(false);
      setNewUser({
        nome: '',
        email: '',
        senha: '',
        id_user_tipo: 1
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(`Erro ao criar usuário: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Usuários</h2>
        <button
          onClick={handleAddUser}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Adicionar Usuário
        </button>
      </div>

      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id_user}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.nome}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.user_tipo?.tipo || 'Não definido'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => handleEditUser(user)}
                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {}}
                  className="text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de criação de usuário */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-md transform overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Novo Usuário
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={newUser.nome}
                    onChange={handleInputChange}
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
                    name="email"
                    value={newUser.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha
                  </label>
                  <input
                    type="password"
                    id="senha"
                    name="senha"
                    value={newUser.senha}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    A senha deve ter pelo menos 6 caracteres
                  </p>
                </div>

                <div>
                  <label htmlFor="id_user_tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tipo de Usuário
                  </label>
                  <select
                    id="id_user_tipo"
                    name="id_user_tipo"
                    value={newUser.id_user_tipo}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                    required
                  >
                    {userTipos.length > 0 ? (
                      userTipos.map((tipo) => (
                        <option key={tipo.id_user_tipo} value={tipo.id_user_tipo}>
                          {tipo.tipo}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={1}>Administrador</option>
                        <option value={2}>Financeiro</option>
                        <option value={3}>Técnico</option>
                        <option value={4}>Atendimento</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
                  >
                    {isLoading ? 'Criando...' : 'Criar Usuário'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
