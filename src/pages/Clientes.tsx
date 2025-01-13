import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import { Cliente } from '../types/financeiro';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { default as ClienteModal } from '../components/ClienteModal';

const Clientes: React.FC = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 5;

  // Função para buscar clientes com paginação e busca no servidor
  const fetchClientes = async (page: number, searchTerm: string = '') => {
    try {
      setLoading(true);
      
      // Primeiro, vamos buscar o total de registros para a paginação
      let query = supabase
        .from('clientes')
        .select('count', { count: 'exact' });

      // Adiciona filtros de busca se houver termo de pesquisa
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,fonewhats.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
      }

      const { count, error: countError } = await query;

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Agora, busca os registros da página atual
      let dataQuery = supabase
        .from('clientes')
        .select('*')
        .order('data_cad_cliente', { ascending: false });

      // Adiciona os mesmos filtros de busca
      if (searchTerm) {
        dataQuery = dataQuery.or(`nome.ilike.%${searchTerm}%,fonewhats.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
      }

      // Adiciona paginação
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error } = await dataQuery
        .range(from, to);

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar os clientes quando a página ou termo de busca mudar
  useEffect(() => {
    fetchClientes(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  // Funções de navegação
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // Cálculo do total de páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Handler para mudança no termo de busca com debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Volta para a primeira página ao pesquisar
  };

  // Handler para abrir o modal com os detalhes do cliente
  const handleViewCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  // Handler para fechar o modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCliente(undefined);
  };

  // Handler para salvar alterações do cliente
  const handleSaveCliente = () => {
    fetchClientes(currentPage, searchTerm);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6 text-white">Gerenciamento de Clientes</h1>
          
          <div className="flex flex-col space-y-4 p-4">
            {/* Card de Ações */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Ações
                </h2>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Adicionar Cliente
                </button>
              </div>
            </div>

            {/* Card de Filtros */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              {/* Área de Pesquisa */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, telefone ou CPF/CNPJ..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Lista de Clientes */}
              <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-white uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-white uppercase tracking-wider">Telefone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-white uppercase tracking-wider">CPF/CNPJ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-white uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-white uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                            </div>
                          </td>
                        </tr>
                      ) : clientes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                            Nenhum cliente encontrado
                          </td>
                        </tr>
                      ) : (
                        clientes.map((cliente) => (
                          <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {cliente.nome}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {cliente.fonewhats || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {cliente.cpf_cnpj || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${cliente.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                                cliente.status === 'Inativo' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                                {cliente.status || 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              <button
                                onClick={() => handleViewCliente(cliente)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-150"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginação */}
              {!loading && totalCount > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} registros
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-md ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-md ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal de Cliente */}
          <ClienteModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            cliente={selectedCliente}
            onSave={handleSaveCliente}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Clientes;
