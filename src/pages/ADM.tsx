import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import UserModal from '../components/UserModal';
import { UserPlusIcon, PencilSquareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Interfaces
interface UserTipo {
  id_user_tipo: number;
  tipo: string;
  created_at: string;
}

interface Empresa {
  id_empresa: number;
  nome: string;
  cnpj: string;
  created_at: string;
}

interface User {
  id_user: string;
  created_at: string;
  nome: string;
  id_empresa: number;
  id_user_tipo: number;
  id_bubble: string | null;
  email: string;
  user_tipo?: UserTipo;
  empresa?: Empresa;
}

const ADM: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserTipo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async (page: number) => {
    try {
      setLoading(true);
      const startRange = (page - 1) * itemsPerPage;
      const endRange = startRange + itemsPerPage - 1;

      // Primeiro, obter o total de registros para calcular a paginação
      let countQuery = supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Aplicar filtro na contagem se houver termo de busca
      if (searchTerm) {
        countQuery = countQuery.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // Consulta principal para buscar os usuários
      let dataQuery = supabase
        .from('users')
        .select(`
          *,
          user_tipo (
            id_user_tipo,
            tipo
          ),
          empresas (
            id_empresa,
            nome
          )
        `)
        .range(startRange, endRange)
        .order('created_at', { ascending: false });

      // Aplicar filtro na busca de dados se houver termo de busca
      if (searchTerm) {
        dataQuery = dataQuery.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await dataQuery;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
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
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id_user', userId);

      if (error) {
        console.error('Erro ao excluir usuário:', error);
        toast.error('Erro ao excluir usuário');
        return;
      }

      toast.success('Usuário excluído com sucesso!');
      fetchUsers(currentPage);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Administração</h1>
      </div>

      {/* Search and Add User */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex-1 w-full sm:max-w-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedUser(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <UserPlusIcon className="h-5 w-5" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                {users.map((user) => (
                  <tr key={user.id_user} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                            {user.nome?.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-800 dark:text-white">
                            {user.nome}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.user_tipo?.tipo === 'Administrador'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/30 dark:text-emerald-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-400'
                      }`}>
                        {user.user_tipo?.tipo || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {user.empresa?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id_user)}
                        className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, (users.length + ((currentPage - 1) * itemsPerPage)))} de {totalPages * itemsPerPage} resultados
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchUsers(currentPage);
        }}
      />
    </div>
  );
};

export { ADM };
