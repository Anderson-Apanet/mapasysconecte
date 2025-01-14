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
            <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow p-4 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Ações
                </h2>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-[#2E7D32] hover:bg-[#1B5E20] transition-colors duration-200"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Adicionar Cliente
                </button>
              </div>
            </div>

            {/* Card de Filtros */}
            <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow p-6 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Filtros
              </h2>
              {/* Área de Pesquisa */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, telefone ou CPF/CNPJ..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">Telefone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">CPF/CNPJ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2E7D32]"></div>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${cliente.status === 'Ativo' ? 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-[#1B5E20] dark:text-[#E8F5E9]' : 
                                cliente.status === 'Inativo' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                                {cliente.status || 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleViewCliente(cliente)}
                                className="text-[#2E7D32] hover:text-[#1B5E20] dark:text-[#E8F5E9] dark:hover:text-[#2E7D32] transition-colors duration-200"
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

                {/* Paginação */}
                <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md 
                        ${currentPage === 1 
                          ? 'text-gray-400 bg-gray-100' 
                          : 'text-white bg-[#2E7D32] hover:bg-[#1B5E20]'} 
                        transition-colors duration-200`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= totalPages}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md 
                        ${currentPage >= totalPages 
                          ? 'text-gray-400 bg-gray-100' 
                          : 'text-white bg-[#2E7D32] hover:bg-[#1B5E20]'} 
                        transition-colors duration-200`}
                    >
                      Próxima
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> até{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> de{' '}
                        <span className="font-medium">{totalCount}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium 
                            ${currentPage === 1 
                              ? 'text-gray-400 bg-gray-100 border-gray-300' 
                              : 'text-white bg-[#2E7D32] hover:bg-[#1B5E20] border-[#2E7D32]'} 
                            transition-colors duration-200`}
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={goToNextPage}
                          disabled={currentPage >= totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium 
                            ${currentPage >= totalPages 
                              ? 'text-gray-400 bg-gray-100 border-gray-300' 
                              : 'text-white bg-[#2E7D32] hover:bg-[#1B5E20] border-[#2E7D32]'} 
                            transition-colors duration-200`}
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal de Cliente */}
          <ClienteModal
            isOpen={isModalOpen}
            cliente={selectedCliente}
            onClose={handleCloseModal}
            onSave={handleSaveCliente}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Clientes;
