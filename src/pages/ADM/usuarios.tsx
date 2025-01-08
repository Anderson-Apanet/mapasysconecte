import React, { useState, useEffect } from 'react';
import { UserGroupIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/Layout';
import AdminMenu from '../../components/adm/AdminMenu';
import UserModal from '../../components/UserModal';
import { supabase } from '../../utils/supabaseClient';
import toast from 'react-hot-toast';

interface User {
  id_user: string;
  nome: string;
  email: string;
  id_user_tipo: number;
  created_at: string;
  auth_user?: {
    email: string;
    phone: string;
  };
  user_tipo?: {
    tipo: string;
  };
}

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async (page: number) => {
    try {
      setIsLoading(true);
      const from = (page - 1) * 10;
      const to = from + 9;

      // Primeiro, obter o total de registros para calcular a paginação
      const { count: totalCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .ilike('nome', `%${searchTerm}%`);

      if (totalCount === null) throw new Error('Erro ao contar usuários');

      setTotalPages(Math.ceil(totalCount / 10));

      // Buscar usuários com join na tabela user_tipo
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          *,
          user_tipo (tipo)
        `)
        .ilike('nome', `%${searchTerm}%`)
        .range(from, to)
        .order('nome');

      if (error) throw error;

      setUsers(usersData || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, searchTerm]);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id_user', userId);

      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      fetchUsers(currentPage);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <UserGroupIcon className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-2" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
              Administração
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie usuários, permissões e configurações do sistema
          </p>
        </div>

        {/* Menu */}
        <div className="p-4 sm:p-6">
          <AdminMenu />

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Usuários</h2>
              <div className="w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Carregando...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id_user} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {user.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {user.user_tipo?.tipo || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                console.log('Clicou para editar usuário:', user);
                                setSelectedUser(user);
                                setIsModalOpen(true);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id_user)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {users.length > 0 && (
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> até{' '}
                  <span className="font-medium">{Math.min(currentPage * 10, users.length)}</span> de{' '}
                  <span className="font-medium">{totalPages * 10}</span> resultados
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Edição */}
        {isModalOpen && (
          <UserModal
            isOpen={isModalOpen}
            onClose={() => {
              console.log('Fechando modal');
              setIsModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onSuccess={() => {
              console.log('Usuário atualizado com sucesso');
              fetchUsers(currentPage);
              setIsModalOpen(false);
              setSelectedUser(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
