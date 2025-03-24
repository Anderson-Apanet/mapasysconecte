import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  UserGroupIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import EmpresaBackground from '../components/EmpresaBackground';
import { supabase } from '../utils/supabaseClient';
import { Cliente } from '../types/cliente';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { default as ClienteModal } from '../components/ClienteModal';
import { useDebounce } from '../hooks/useDebounce';

const Clientes: React.FC = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [contratoSearchTerm, setContratoSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const itemsPerPage = 5;

  // Usar o hook de debounce para os termos de busca
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedContratoSearchTerm = useDebounce(contratoSearchTerm, 500);

  // Função para buscar clientes com paginação e busca no servidor
  const fetchClientes = async (page: number, searchTerm: string = '', contratoSearchTerm: string = '') => {
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

      // Aplicar filtro de busca por contrato se houver termo de pesquisa para contrato
      if (contratoSearchTerm) {
        // Primeiro, buscar os IDs dos clientes que têm contratos correspondentes
        const { data: contratosData, error: contratosError } = await supabase
          .from('contratos')
          .select('id_cliente')
          .or(`pppoe.ilike.%${contratoSearchTerm}%,senha.ilike.%${contratoSearchTerm}%`);

        if (contratosError) {
          console.error('Erro ao buscar contratos:', contratosError);
          return;
        }

        if (contratosData && contratosData.length > 0) {
          // Extrair os IDs dos clientes dos contratos encontrados
          const clienteIds = contratosData.map(contrato => contrato.id_cliente);
          // Adicionar filtro para incluir apenas esses clientes
          query = query.in('id', clienteIds);
        } else {
          // Se não encontrar nenhum contrato, retornar lista vazia
          setClientes([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }

      const { count, error: countError } = await query;

      if (countError) {
        throw countError;
      }

      // Agora, vamos buscar os clientes para a página atual
      let clientesQuery = supabase
        .from('clientes')
        .select('*');

      // Adiciona filtros de busca se houver termo de pesquisa
      if (searchTerm) {
        clientesQuery = clientesQuery.or(`nome.ilike.%${searchTerm}%,fonewhats.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
      }

      // Aplicar filtro de busca por contrato se houver termo de pesquisa para contrato
      if (contratoSearchTerm) {
        // Reutilizar os IDs dos clientes encontrados anteriormente
        const { data: contratosData, error: contratosError } = await supabase
          .from('contratos')
          .select('id_cliente')
          .or(`pppoe.ilike.%${contratoSearchTerm}%,senha.ilike.%${contratoSearchTerm}%`);

        if (contratosError) {
          console.error('Erro ao buscar contratos:', contratosError);
          return;
        }

        if (contratosData && contratosData.length > 0) {
          // Extrair os IDs dos clientes dos contratos encontrados
          const clienteIds = contratosData.map(contrato => contrato.id_cliente);
          // Adicionar filtro para incluir apenas esses clientes
          clientesQuery = clientesQuery.in('id', clienteIds);
        }
      }

      // Adiciona paginação
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error } = await clientesQuery
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setClientes(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao buscar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes(currentPage);
  }, [currentPage]);

  // Efeito para buscar quando os termos de busca com debounce mudarem
  useEffect(() => {
    setCurrentPage(1);
    fetchClientes(1, debouncedSearchTerm, debouncedContratoSearchTerm);
  }, [debouncedSearchTerm, debouncedContratoSearchTerm]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setContratoSearchTerm('');
    setCurrentPage(1);
    fetchClientes(1, '', '');
  };

  const handleViewCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleViewClienteDetails = (cliente: Cliente) => {
    // Navegar para a página de detalhes do cliente
    navigate(`/clientes/${cliente.id}`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCliente(null);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <Layout>
      <EmpresaBackground>
        <div className="bg-white dark:bg-[#1E293B] rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#1976D2] dark:text-[#E1F5FE]">
              <UserGroupIcon className="h-8 w-8 inline-block mr-2" />
              Clientes
            </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#1976D2] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-md flex items-center transition-colors duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Novo Cliente
            </button>
          </div>

          {/* Filtros */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  Cliente (nome, telefone ou CPF/CNPJ)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="focus:ring-[#1976D2] focus:border-[#1976D2] block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md dark:bg-[#334155] dark:text-white dark:border-gray-600"
                    placeholder="Buscar por nome, telefone ou CPF/CNPJ"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <MagnifyingGlassIcon
                      className="h-5 w-5 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  Contrato (PPPoE ou senha)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={contratoSearchTerm}
                    onChange={(e) => setContratoSearchTerm(e.target.value)}
                    className="focus:ring-[#1976D2] focus:border-[#1976D2] block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md dark:bg-[#334155] dark:text-white dark:border-gray-600"
                    placeholder="Buscar por PPPoE ou senha do contrato"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <MagnifyingGlassIcon
                      className="h-5 w-5 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {(searchTerm || contratoSearchTerm) && (
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <div className="align-middle inline-block min-w-full">
                <div className="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">Telefone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">CPF/CNPJ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-100 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1976D2]"></div>
                            </div>
                          </td>
                        </tr>
                      ) : clientes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleViewCliente(cliente)}
                                className="text-[#1976D2] hover:text-[#0D47A1] dark:text-[#E1F5FE] dark:hover:text-[#1976D2] transition-colors duration-200 mr-2"
                                title="Editar cliente"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleViewClienteDetails(cliente)}
                                className="text-[#1976D2] hover:text-[#0D47A1] dark:text-[#E1F5FE] dark:hover:text-[#1976D2] transition-colors duration-200"
                                title="Detalhes do Cliente"
                              >
                                <InformationCircleIcon className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                <div className="bg-[#E1F5FE] dark:bg-[#0D47A1] px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md 
                        ${currentPage === 1 
                          ? 'text-gray-400 bg-gray-100' 
                          : 'text-white bg-[#1976D2] hover:bg-[#0D47A1]'} 
                        transition-colors duration-200`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md 
                        ${currentPage >= Math.ceil(totalCount / itemsPerPage) 
                          ? 'text-gray-400 bg-gray-100' 
                          : 'text-white bg-[#1976D2] hover:bg-[#0D47A1]'} 
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
                              : 'text-white bg-[#1976D2] hover:bg-[#0D47A1] border-[#1976D2]'} 
                            transition-colors duration-200`}
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={goToNextPage}
                          disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium 
                            ${currentPage >= Math.ceil(totalCount / itemsPerPage) 
                              ? 'text-gray-400 bg-gray-100 border-gray-300' 
                              : 'text-white bg-[#1976D2] hover:bg-[#0D47A1] border-[#1976D2]'} 
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
            onSave={() => {
              setIsModalOpen(false);
              fetchClientes(currentPage, searchTerm, contratoSearchTerm);
            }}
          />
        </div>
      </EmpresaBackground>
    </Layout>
  );
};

export default Clientes;
