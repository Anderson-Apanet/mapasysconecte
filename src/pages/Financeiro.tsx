import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  NoSymbolIcon,
  LockClosedIcon,
  LockOpenIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TitulosContratosModal } from '../components/TitulosContratosModal';
import Layout from '../components/Layout';
import ListaCaixas from '../components/ListaCaixas';
import {
  CONTRACT_STATUS_OPTIONS,
  Cliente,
  Contrato,
  Titulo
} from '../types/financeiro';
import { Transition } from '@headlessui/react';

const Financeiro: React.FC = () => {
  // Estados para contratos e títulos
  const [contratos, setContratos] = useState<(Contrato & { cliente_nome?: string, cliente_idasaas?: string | null })[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [showTitulosModal, setShowTitulosModal] = useState(false);
  const [selectedPPPoE, setSelectedPPPoE] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Estados para controlar a visibilidade do histórico
  const [showHistorico, setShowHistorico] = useState(false);

  // Atualizar as opções de status do contrato
  const CONTRACT_STATUS_OPTIONS = [
    { value: 'Todos', label: 'Todos os Contratos' },
    { value: 'Ativo', label: 'Contratos Ativos' },
    { value: 'Agendado', label: 'Contratos Agendados' },
    { value: 'Bloqueado', label: 'Contratos Bloqueados' },
    { value: 'Liberado48', label: 'Contratos Liberados 48h' },
    { value: 'Cancelado', label: 'Contratos Cancelados' },
    { value: 'pendencia', label: 'Contratos com Pendência' },
    { value: 'atraso', label: 'Contratos em Atraso' },
    { value: 'atraso15', label: 'Contratos em Atraso > 15 dias' }
  ];

  // Função para carregar contratos com paginação e busca
  const fetchContratos = async (page: number, searchTerm: string = '', status: string = '') => {
    try {
      setLoading(true);
      
      // Primeiro, buscar o total de registros para paginação
      let countQuery = supabase
        .from('contratos')
        .select('*, clientes!inner(idasaas)', { count: 'exact', head: true });

      // Aplicar filtros na query de contagem
      if (searchTerm) {
        countQuery = countQuery.ilike('pppoe', `%${searchTerm}%`);
      }
      
      // Filtros especiais que requerem consultas adicionais
      if (status === 'atraso' || status === 'atraso15') {
        // Para estes filtros, precisamos primeiro buscar os IDs dos contratos com títulos em atraso
        const dataAtual = new Date().toISOString().split('T')[0];
        
        let titulosQuery = supabase
          .from('titulos')
          .select('id_contrato')
          .eq('pago', false)
          .lt('vencimento', dataAtual);
        
        // Para atraso15, adicionar filtro de 15 dias atrás
        if (status === 'atraso15') {
          const data15DiasAtras = new Date();
          data15DiasAtras.setDate(data15DiasAtras.getDate() - 15);
          const data15DiasAtrasStr = data15DiasAtras.toISOString().split('T')[0];
          titulosQuery = titulosQuery.lt('vencimento', data15DiasAtrasStr);
        }
        
        const { data: titulosAtrasados, error: titulosError } = await titulosQuery;
        
        if (titulosError) throw titulosError;
        
        if (titulosAtrasados && titulosAtrasados.length > 0) {
          // Extrair IDs únicos de contratos com títulos em atraso
          const idsContratosAtrasados = [...new Set(titulosAtrasados.map(t => t.id_contrato))];
          countQuery = countQuery
            .in('id', idsContratosAtrasados)
            .neq('status', 'Cancelado');
        } else {
          // Se não houver contratos em atraso, retornar lista vazia
          setTotalCount(0);
          setContratos([]);
          setLoading(false);
          return;
        }
      } else if (status === 'pendencia') {
        countQuery = countQuery.eq('pendencia', true);
      } else if (status && status !== 'Todos') {
        countQuery = countQuery.eq('status', status);
      } else if (status === 'Todos') {
        // Para "Todos", mostrar todos os contratos exceto os cancelados
        countQuery = countQuery.neq('status', 'Cancelado');
      }
      
      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      console.log('Total de registros encontrados:', count);
      setTotalCount(count || 0);

      // Agora, buscar os registros da página atual
      let dataQuery = supabase
        .from('contratos')
        .select('*, clientes!inner(id, nome, idasaas)')
        .order('created_at', { ascending: false });

      // Aplicar os mesmos filtros na query de dados
      if (searchTerm) {
        dataQuery = dataQuery.ilike('pppoe', `%${searchTerm}%`);
      }
      
      // Filtros especiais que requerem consultas adicionais
      if (status === 'atraso' || status === 'atraso15') {
        // Para estes filtros, precisamos primeiro buscar os IDs dos contratos com títulos em atraso
        const dataAtual = new Date().toISOString().split('T')[0];
        
        let titulosQuery = supabase
          .from('titulos')
          .select('id_contrato')
          .eq('pago', false)
          .lt('vencimento', dataAtual);
        
        // Para atraso15, adicionar filtro de 15 dias atrás
        if (status === 'atraso15') {
          const data15DiasAtras = new Date();
          data15DiasAtras.setDate(data15DiasAtras.getDate() - 15);
          const data15DiasAtrasStr = data15DiasAtras.toISOString().split('T')[0];
          titulosQuery = titulosQuery.lt('vencimento', data15DiasAtrasStr);
        }
        
        const { data: titulosAtrasados, error: titulosError } = await titulosQuery;
        
        if (titulosError) throw titulosError;
        
        if (titulosAtrasados && titulosAtrasados.length > 0) {
          // Extrair IDs únicos de contratos com títulos em atraso
          const idsContratosAtrasados = [...new Set(titulosAtrasados.map(t => t.id_contrato))];
          dataQuery = dataQuery
            .in('id', idsContratosAtrasados)
            .neq('status', 'Cancelado');
        } else {
          // Se não houver contratos em atraso, retornar lista vazia
          setContratos([]);
          setLoading(false);
          return;
        }
      } else if (status === 'pendencia') {
        dataQuery = dataQuery.eq('pendencia', true);
      } else if (status && status !== 'Todos') {
        dataQuery = dataQuery.eq('status', status);
      } else if (status === 'Todos') {
        // Para "Todos", mostrar todos os contratos exceto os cancelados
        dataQuery = dataQuery.neq('status', 'Cancelado');
      }

      // Adicionar paginação
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data: contratosData, error: contratosError } = await dataQuery
        .range(from, to);

      if (contratosError) throw contratosError;

      if (contratosData) {
        const contratosFormatados = contratosData.map(contrato => ({
          ...contrato,
          cliente_nome: contrato.clientes?.nome || 'Cliente não encontrado',
          cliente_idasaas: contrato.clientes?.idasaas
        }));

        setContratos(contratosFormatados);
      } else {
        setContratos([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar contratos:', error.message);
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  // Efeito para garantir que a busca inicial seja feita com o filtro "Ativo"
  useEffect(() => {
    // Iniciar com contratos ativos
    fetchContratos(1, '', 'Todos');
  }, []);

  // Efeito para carregar os contratos quando a página, termo de busca, status ou filtro Asaas mudar
  useEffect(() => {
    fetchContratos(currentPage, searchTerm, contractStatusFilter);
  }, [currentPage, searchTerm, contractStatusFilter]);

  // Handler para mudança no termo de busca
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Volta para a primeira página ao pesquisar
  };

  // Handler para mudança no filtro de status
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setContractStatusFilter(e.target.value);
    setCurrentPage(1); // Volta para a primeira página ao mudar o filtro
  };

  // Funções de navegação
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // Cálculo do total de páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Handler para abrir o modal de títulos
  const handleOpenTitulosModal = (contrato: any) => {
    console.log('Abrindo modal com contrato:', contrato);
    setSelectedContrato(contrato);
    setSelectedPPPoE(contrato.pppoe || '');
    setShowTitulosModal(true);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-8 w-8 text-white dark:text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent dark:from-yellow-300 dark:to-yellow-500">
                Financeiro
              </h1>
            </div>
            <p className="text-white dark:text-white">
              Gerenciamento financeiro
            </p>
          </div>

          <div className="space-y-6">
            {/* Card de Histórico de Caixas com Toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <div 
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setShowHistorico(!showHistorico)}
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  Histórico de Caixas
                  {showHistorico ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </h2>
              </div>
              
              <Transition
                show={showHistorico}
                enter="transition-all duration-300 ease-in-out"
                enterFrom="max-h-0 opacity-0"
                enterTo="max-h-[1000px] opacity-100"
                leave="transition-all duration-200 ease-in-out"
                leaveFrom="max-h-[1000px] opacity-100"
                leaveTo="max-h-0 opacity-0"
                className="overflow-hidden"
              >
                <div className="p-6 pt-0">
                  <ListaCaixas />
                </div>
              </Transition>
            </div>

            {/* Lista de Contratos com Filtros Integrados */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {/* Seção de Filtros */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Campo de Busca */}
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Buscar por PPPoE..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  {/* Filtro de Status */}
                  <div className="min-w-[200px]">
                    <select
                      value={contractStatusFilter}
                      onChange={(e) => {
                        setContractStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      {CONTRACT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contador de Resultados */}
                  <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {totalCount} resultados encontrados
                  </div>
                </div>
              </div>

              {/* Tabela de Contratos */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        PPPoE
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Asaas ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {contratos.map((contrato) => (
                      <tr key={contrato.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {contrato.pppoe}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {contrato.cliente_nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${contrato.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                            contrato.status === 'Bloqueado' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                            contrato.status === 'Agendado' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {contrato.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${contrato.cliente_idasaas ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                            'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                            {contrato.cliente_idasaas ? 'Integrado' : 'Não Integrado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleOpenTitulosModal(contrato)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            title="Ver Títulos"
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                          
                          {/* Botões de ação condicionais - Não mostrar quando o filtro estiver em "Todos" */}
                          {contractStatusFilter !== 'Todos' && (
                            <>
                              {/* Botão Bloquear Cliente - Mostrar apenas quando o filtro estiver em Ativos */}
                              {contractStatusFilter === 'Ativo' && (
                                <button
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Bloquear Cliente"
                                >
                                  <LockClosedIcon className="h-5 w-5" />
                                </button>
                              )}
                              
                              {/* Botão Cancelar Cliente - Mostrar quando o filtro estiver em Bloqueados ou Agendados */}
                              {(contractStatusFilter === 'Bloqueado' || contractStatusFilter === 'Agendado') && (
                                <button
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Cancelar Cliente"
                                >
                                  <NoSymbolIcon className="h-5 w-5" />
                                </button>
                              )}
                              
                              {/* Botão Liberar Cliente - Mostrar apenas quando o filtro estiver em Bloqueados */}
                              {contractStatusFilter === 'Bloqueado' && (
                                <button
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  title="Liberar Cliente"
                                >
                                  <LockOpenIcon className="h-5 w-5" />
                                </button>
                              )}
                              
                              {/* Botão Liberar Cliente 48 horas - Mostrar apenas quando o filtro estiver em Bloqueados */}
                              {contractStatusFilter === 'Bloqueado' && (
                                <button
                                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                  title="Liberar Cliente por 48 horas"
                                >
                                  <ClockIcon className="h-5 w-5" />
                                </button>
                              )}
                              
                              {/* Botão Ativar Cliente - Mostrar apenas quando o filtro estiver em Agendados */}
                              {contractStatusFilter === 'Agendado' && (
                                <button
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  title="Ativar Cliente"
                                >
                                  <CheckCircleIcon className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginação */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Página {currentPage} de {totalPages} ({totalCount} registros)
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal de Títulos */}
            {showTitulosModal && (
              <TitulosContratosModal
                isOpen={showTitulosModal}
                onClose={() => {
                  console.log('Fechando modal');
                  setShowTitulosModal(false);
                  setSelectedContrato(null);
                  setSelectedPPPoE('');
                }}
                pppoe={selectedPPPoE}
                contrato={selectedContrato}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Financeiro;
