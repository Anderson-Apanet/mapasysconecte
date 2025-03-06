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
  CheckCircleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TitulosContratosModal } from '../components/TitulosContratosModal';
import Layout from '../components/Layout';
import ListaCaixas from '../components/ListaCaixas';
import ConfirmacaoModal from '../components/ConfirmacaoModal';
import { updateUserGroupName } from '../services/mysqlService';
import {
  CONTRACT_STATUS_OPTIONS,
  Cliente,
  Contrato,
  Titulo
} from '../types/financeiro';
import { Transition } from '@headlessui/react';

const Financeiro: React.FC = () => {
  // Estados para contratos e títulos
  const [contratos, setContratos] = useState<(Contrato & { cliente_nome?: string, cliente_idasaas?: string | null, plano?: { id: number, nome: string, radius: string } })[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [showTitulosModal, setShowTitulosModal] = useState(false);
  const [selectedPPPoE, setSelectedPPPoE] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState('Ativo');
  const [showAsaasOnly, setShowAsaasOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  const [blockLoading, setBlockLoading] = useState(false);
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [showLiberarModal, setShowLiberarModal] = useState(false);
  const [liberarLoading, setLiberarLoading] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [cancelarLoading, setCancelarLoading] = useState(false);
  const [showLiberar48hModal, setShowLiberar48hModal] = useState(false);
  const [liberar48hLoading, setLiberar48hLoading] = useState(false);

  // Estados para controlar a visibilidade do histórico
  const [showHistorico, setShowHistorico] = useState(false);

  // Atualizar as opções de status do contrato
  const CONTRACT_STATUS_OPTIONS = [
    { value: 'Ativo', label: 'Contratos Ativos' },
    { value: 'Agendado', label: 'Contratos Agendados' },
    { value: 'Bloqueado', label: 'Contratos Bloqueados' },
    { value: 'Liberado48', label: 'Contratos Liberados 48h' },
    { value: 'Cancelado', label: 'Contratos Cancelados' },
    { value: 'pendencia', label: 'Contratos com Pendência' },
    { value: 'atraso', label: 'Contratos com Atraso' },
    { value: 'atraso15dias', label: 'Contratos com Atraso > 15 dias' }
  ];

  // Função para carregar contratos com paginação e busca
  const fetchContratos = async (page: number, searchTerm: string = '', status: string = '') => {
    try {
      setLoading(true);
      
      // Para filtros de atraso, usamos uma abordagem diferente
      if (status === 'atraso' || status === 'atraso15dias') {
        await fetchContratosComAtraso(page, searchTerm, status);
        return;
      }
      
      // Primeiro, buscar o total de registros para paginação
      let countQuery = supabase
        .from('contratos')
        .select('*, clientes!inner(idasaas)', { count: 'exact', head: true });

      // Aplicar filtros na query de contagem
      if (searchTerm) {
        countQuery = countQuery.ilike('pppoe', `%${searchTerm}%`);
      }
      
      // Filtros de status
      if (status === 'pendencia') {
        countQuery = countQuery.eq('pendencia', true);
      } else if (status) {
        countQuery = countQuery.eq('status', status);
      }
      
      if (showAsaasOnly) {
        countQuery = countQuery.not('clientes.idasaas', 'is', null);
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      console.log('Total de registros encontrados:', count);
      setTotalCount(count || 0);

      // Agora, buscar os registros da página atual
      let dataQuery = supabase
        .from('contratos')
        .select('*, clientes!inner(id, nome, idasaas), planos(id, nome, radius)')
        .order('created_at', { ascending: false });

      // Aplicar os mesmos filtros na query de dados
      if (searchTerm) {
        dataQuery = dataQuery.ilike('pppoe', `%${searchTerm}%`);
      }
      
      // Filtros de status
      if (status === 'pendencia') {
        dataQuery = dataQuery.eq('pendencia', true);
      } else if (status) {
        dataQuery = dataQuery.eq('status', status);
      }
      
      if (showAsaasOnly) {
        dataQuery = dataQuery.not('clientes.idasaas', 'is', null);
      }

      // Adicionar paginação
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data: contratosData, error: contratosError } = await dataQuery
        .range(from, to);

      if (contratosError) throw contratosError;

      if (contratosData && contratosData.length > 0) {
        const contratosFormatados = contratosData.map(contrato => ({
          ...contrato,
          cliente_nome: contrato.clientes?.nome || 'Cliente não encontrado',
          cliente_idasaas: contrato.clientes?.idasaas,
          plano: contrato.planos
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

  // Função específica para buscar contratos com atraso
  const fetchContratosComAtraso = async (page: number, searchTerm: string = '', status: string = '') => {
    try {
      // Calcular a data de filtro
      const hoje = new Date();
      const dataAtual = hoje.toISOString().split('T')[0];
      
      let dataFiltro = dataAtual;
      if (status === 'atraso15dias') {
        const quinzeDiasAtras = new Date();
        quinzeDiasAtras.setDate(hoje.getDate() - 15);
        dataFiltro = quinzeDiasAtras.toISOString().split('T')[0];
      }

      // Primeiro, buscar todos os IDs de contratos com títulos vencidos
      // Usando a mesma lógica da consulta SQL: t.pago <> true AND t.vencimento < CURRENT_DATE
      const { data: contratosComAtraso, error: titulosError } = await supabase
        .from('titulos')
        .select('id_contrato')
        .not('pago', 'eq', true)
        .lt('vencimento', dataFiltro);

      if (titulosError) throw titulosError;

      if (!contratosComAtraso || contratosComAtraso.length === 0) {
        setContratos([]);
        setTotalCount(0);
        return;
      }

      // Obter IDs únicos de contratos com atraso
      const idsContratosComAtraso = [...new Set(contratosComAtraso.map(t => t.id_contrato))];
      console.log(`Encontrados ${idsContratosComAtraso.length} contratos com títulos em atraso`);

      // Buscar detalhes dos contratos com atraso
      let query = supabase
        .from('contratos')
        .select('*, clientes!inner(id, nome, idasaas), planos(id, nome, radius)')
        .in('id', idsContratosComAtraso)
        .order('created_at', { ascending: false });

      // Aplicar filtro de busca se necessário
      if (searchTerm) {
        query = query.ilike('pppoe', `%${searchTerm}%`);
      }

      // Aplicar filtro de ASAAS se necessário
      if (showAsaasOnly) {
        query = query.not('clientes.idasaas', 'is', null);
      }

      // Primeiro contar o total para paginação
      const { data: todosContratos, error: countError } = await query;
      
      if (countError) throw countError;
      
      const totalFiltrado = todosContratos ? todosContratos.length : 0;
      setTotalCount(totalFiltrado);
      console.log(`Total de contratos com atraso após filtros: ${totalFiltrado}`);

      // Aplicar paginação manualmente
      const from = (page - 1) * itemsPerPage;
      const to = Math.min(from + itemsPerPage, totalFiltrado);
      
      const contratosFormatados = todosContratos
        ? todosContratos
            .slice(from, to)
            .map(contrato => ({
              ...contrato,
              cliente_nome: contrato.clientes?.nome || 'Cliente não encontrado',
              cliente_idasaas: contrato.clientes?.idasaas,
              plano: contrato.planos
            }))
        : [];

      setContratos(contratosFormatados);
    } catch (error: any) {
      console.error('Erro ao carregar contratos com atraso:', error.message);
      toast.error('Erro ao carregar contratos com atraso');
      setContratos([]);
      setTotalCount(0);
    }
  };

  // Efeito para carregar os contratos quando a página, termo de busca, status ou filtro Asaas mudar
  useEffect(() => {
    fetchContratos(currentPage, searchTerm, contractStatusFilter);
  }, [currentPage, searchTerm, contractStatusFilter, showAsaasOnly]);

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

  // Handler para bloquear cliente
  const handleBloquearCliente = (contrato: any) => {
    setSelectedContrato(contrato);
    setShowConfirmacaoModal(true);
  };

  // Handler para confirmar bloqueio de cliente
  const handleConfirmarBloqueio = async () => {
    try {
      if (!selectedContrato) return;
      
      setBlockLoading(true);
      console.log(`Iniciando processo de bloqueio para cliente: ${selectedContrato.cliente_nome} (PPPoE: ${selectedContrato.pppoe})`);

      // 1. Atualizar o status do contrato no Supabase
      console.log('Atualizando status do contrato no Supabase...');
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ status: 'Bloqueado' })
        .eq('id', selectedContrato.id);

      if (updateError) throw updateError;

      // 2. Enviar o PPPoE para o N8N para atualização no MySQL
      console.log('Enviando solicitação para o N8N...');
      await updateUserGroupName(selectedContrato.pppoe, 'bloquear', '');

      console.log('Processo de bloqueio concluído com sucesso!');
      toast.success('Cliente bloqueado com sucesso!');
      setShowConfirmacaoModal(false);
      setSelectedContrato(null);
      fetchContratos(currentPage, searchTerm, contractStatusFilter);
    } catch (error: any) {
      console.error('Erro ao bloquear cliente:', error.message);
      toast.error(`Erro ao bloquear cliente: ${error.message}`);
    } finally {
      setBlockLoading(false);
    }
  };

  // Handler para abrir o modal de confirmação
  const handleOpenConfirmacaoModal = (contrato: any) => {
    setSelectedContrato(contrato);
    setShowConfirmacaoModal(true);
  };

  // Handler para fechar o modal de confirmação
  const handleCloseConfirmacaoModal = () => {
    setShowConfirmacaoModal(false);
    setSelectedContrato(null);
  };

  // Handler para liberar cliente
  const handleLiberarCliente = (contrato: any) => {
    setSelectedContrato(contrato);
    setShowLiberarModal(true);
  };

  // Handler para confirmar liberação de cliente
  const handleConfirmarLiberacao = async () => {
    try {
      if (!selectedContrato) return;
      
      setLiberarLoading(true);
      console.log(`Iniciando processo de liberação para cliente: ${selectedContrato.cliente_nome} (PPPoE: ${selectedContrato.pppoe})`);

      // 1. Atualizar o status do contrato no Supabase
      console.log('Atualizando status do contrato no Supabase...');
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ status: 'Ativo' })
        .eq('id', selectedContrato.id);

      if (updateError) throw updateError;

      // 2. Enviar o PPPoE e o radius para o N8N para atualização no MySQL
      console.log('Enviando solicitação para o N8N...');
      
      // Buscar o contrato atualizado com os dados do plano
      const { data: contratoAtualizado, error: contratoError } = await supabase
        .from('contratos')
        .select('*, planos(id, nome, radius)')
        .eq('id', selectedContrato.id)
        .single();
      
      if (contratoError) throw contratoError;
      
      const radiusGroup = contratoAtualizado.planos?.radius || '';
      
      await updateUserGroupName(selectedContrato.pppoe, 'liberar', radiusGroup);

      console.log('Processo de liberação concluído com sucesso!');
      toast.success('Cliente liberado com sucesso!');
      setShowLiberarModal(false);
      setSelectedContrato(null);
      fetchContratos(currentPage, searchTerm, contractStatusFilter);
    } catch (error: any) {
      console.error('Erro ao liberar cliente:', error.message);
      toast.error(`Erro ao liberar cliente: ${error.message}`);
    } finally {
      setLiberarLoading(false);
    }
  };

  // Handler para fechar o modal de liberação
  const handleCloseLiberarModal = () => {
    setShowLiberarModal(false);
    setSelectedContrato(null);
  };

  // Handler para liberar 48h cliente
  const handleLiberar48hCliente = (contrato: any) => {
    setSelectedContrato(contrato);
    setShowLiberar48hModal(true);
  };

  // Handler para confirmar liberação 48h de cliente
  const handleConfirmarLiberacao48h = async () => {
    try {
      if (!selectedContrato) return;
      
      setLiberar48hLoading(true);
      console.log(`Iniciando processo de liberação 48h para cliente: ${selectedContrato.cliente_nome} (PPPoE: ${selectedContrato.pppoe})`);

      // 1. Atualizar o status do contrato no Supabase
      console.log('Atualizando status do contrato no Supabase...');
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ status: 'Liberado48' })
        .eq('id', selectedContrato.id);

      if (updateError) throw updateError;

      // 2. Enviar o PPPoE e o radius para o N8N para atualização no MySQL
      console.log('Enviando solicitação para o N8N...');
      await updateUserGroupName(selectedContrato.pppoe, 'liberar48h', selectedContrato.planos.radius);

      console.log('Processo de liberação 48h concluído com sucesso!');
      toast.success('Cliente liberado 48h com sucesso!');
      setShowLiberar48hModal(false);
      setSelectedContrato(null);
      fetchContratos(currentPage, searchTerm, contractStatusFilter);
    } catch (error: any) {
      console.error('Erro ao liberar 48h cliente:', error.message);
      toast.error(`Erro ao liberar 48h cliente: ${error.message}`);
    } finally {
      setLiberar48hLoading(false);
    }
  };

  // Handler para fechar o modal de liberação 48h
  const handleCloseLiberar48hModal = () => {
    setShowLiberar48hModal(false);
    setSelectedContrato(null);
  };

  // Handler para cancelar cliente
  const handleCancelarCliente = (contrato: any) => {
    setSelectedContrato(contrato);
    setShowCancelarModal(true);
  };

  // Handler para confirmar cancelamento de cliente
  const handleConfirmarCancelamento = async () => {
    try {
      if (!selectedContrato) return;
      
      setCancelarLoading(true);
      console.log(`Iniciando processo de cancelamento para cliente: ${selectedContrato.cliente_nome} (PPPoE: ${selectedContrato.pppoe})`);

      // 1. Atualizar o status do contrato no Supabase
      console.log('Atualizando status do contrato no Supabase...');
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ status: 'Cancelado' })
        .eq('id', selectedContrato.id);

      if (updateError) throw updateError;

      // 2. Enviar o PPPoE para o N8N para atualização no MySQL
      console.log('Enviando solicitação para o N8N...');
      await updateUserGroupName(selectedContrato.pppoe, 'cancelar');

      console.log('Processo de cancelamento concluído com sucesso!');
      toast.success('Cliente cancelado com sucesso!');
      setShowCancelarModal(false);
      setSelectedContrato(null);
      fetchContratos(currentPage, searchTerm, contractStatusFilter);
    } catch (error: any) {
      console.error('Erro ao cancelar cliente:', error.message);
      toast.error(`Erro ao cancelar cliente: ${error.message}`);
    } finally {
      setCancelarLoading(false);
    }
  };

  // Handler para fechar o modal de cancelamento
  const handleCloseCancelarModal = () => {
    setShowCancelarModal(false);
    setSelectedContrato(null);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="flex items-center mb-2">
                <BanknotesIcon className="h-8 w-8 text-white mr-2" />
                <h1 className="text-2xl font-bold text-white">
                  Financeiro
                </h1>
              </div>
              <p className="mt-2 mb-8 text-sm text-white">
                Gerenciamento do financeiro (Títulos)
              </p>
            </div>
            
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

                  {/* Filtro de Asaas */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="asaasFilter"
                      checked={showAsaasOnly}
                      onChange={(e) => setShowAsaasOnly(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="asaasFilter" className="ml-2 text-sm text-gray-700">
                      Apenas clientes Asaas
                    </label>
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
                          
                          {/* Botão Bloquear Cliente - Mostrar apenas para contratos ativos */}
                          {contrato.status === 'Ativo' && (
                            <button
                              onClick={() => handleBloquearCliente(contrato)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Bloquear Cliente"
                            >
                              <LockClosedIcon className="h-5 w-5" />
                            </button>
                          )}

                          {/* Botão Cancelar Cliente - Mostrar para contratos bloqueados e agendados */}
                          {(contractStatusFilter === 'Bloqueado' || contractStatusFilter === 'Agendado') && (
                            <button
                              onClick={() => handleCancelarCliente(contrato)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                              title="Cancelar Cliente"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          )}

                          {/* Botão Liberar Cliente - Mostrar apenas para contratos bloqueados */}
                          {contractStatusFilter === 'Bloqueado' && (
                            <button
                              onClick={() => handleLiberarCliente(contrato)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Liberar Cliente"
                            >
                              <LockOpenIcon className="h-5 w-5" />
                            </button>
                          )}

                          {/* Botão Liberar 48h Cliente - Mostrar apenas para contratos bloqueados */}
                          {contractStatusFilter === 'Bloqueado' && (
                            <button
                              onClick={() => handleLiberar48hCliente(contrato)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Liberar 48h"
                            >
                              <ClockIcon className="h-5 w-5" />
                            </button>
                          )}

                          {/* Botão Ativar Cliente - Mostrar apenas para contratos agendados */}
                          {contractStatusFilter === 'Agendado' && (
                            <button
                              onClick={() => {}}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Ativar Cliente"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
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

            {/* Modal de Confirmação */}
            {showConfirmacaoModal && selectedContrato && (
              <ConfirmacaoModal
                isOpen={showConfirmacaoModal}
                onClose={handleCloseConfirmacaoModal}
                onConfirm={handleConfirmarBloqueio}
                title="Bloquear Cliente"
                message={`Tem certeza que deseja bloquear o cliente ${selectedContrato.cliente_nome} (PPPoE: ${selectedContrato.pppoe})? 
                
Esta ação irá:
1. Alterar o status do contrato para "Bloqueado" no sistema
2. Enviar o PPPoE para o webhook da Apanet para bloqueio no Radius
                
O cliente perderá acesso à internet imediatamente.`}
                confirmButtonText="Sim, Bloquear"
                cancelButtonText="Cancelar"
                confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                isLoading={blockLoading}
              />
            )}

            {/* Modal de Liberação */}
            {showLiberarModal && selectedContrato && (
              <ConfirmacaoModal
                isOpen={showLiberarModal}
                onClose={handleCloseLiberarModal}
                onConfirm={handleConfirmarLiberacao}
                title="Liberar Cliente"
                message={`Tem certeza que deseja liberar o cliente ${selectedContrato.cliente_nome} (PPPoE: ${selectedContrato.pppoe})? 
                
Esta ação irá:
1. Alterar o status do contrato para "Ativo" no sistema
2. Enviar o PPPoE para o webhook da Apanet para liberação no Radius
                
O cliente terá acesso à internet imediatamente.`}
                confirmButtonText="Sim, Liberar"
                cancelButtonText="Cancelar"
                confirmButtonClass="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                isLoading={liberarLoading}
              />
            )}

            {/* Modal de Liberação 48h */}
            {showLiberar48hModal && selectedContrato && (
              <ConfirmacaoModal
                isOpen={showLiberar48hModal}
                onClose={handleCloseLiberar48hModal}
                onConfirm={handleConfirmarLiberacao48h}
                title="Liberar 48h Cliente"
                message={`Tem certeza que deseja liberar por 48h o cliente ${selectedContrato.cliente_nome} (PPPoE: ${selectedContrato.pppoe})? 
                
Esta ação irá:
1. Alterar o status do contrato para "Liberado48" no sistema
2. Enviar o PPPoE para o webhook da Apanet para liberação no Radius
                
O cliente terá acesso à internet por 48h.`}
                confirmButtonText="Sim, Liberar 48h"
                cancelButtonText="Cancelar"
                confirmButtonClass="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                isLoading={liberar48hLoading}
              />
            )}

            {/* Modal de Cancelamento */}
            {showCancelarModal && selectedContrato && (
              <ConfirmacaoModal
                isOpen={showCancelarModal}
                onClose={handleCloseCancelarModal}
                onConfirm={handleConfirmarCancelamento}
                title="Cancelar Cliente"
                message={`Tem certeza que deseja cancelar o cliente ${selectedContrato.cliente_nome} (PPPoE: ${selectedContrato.pppoe})? 
                
Esta ação irá:
1. Alterar o status do contrato para "Cancelado" no sistema
2. Enviar o PPPoE para o webhook da Apanet para cancelamento no Radius
                
O cliente perderá acesso à internet imediatamente.`}
                confirmButtonText="Sim, Cancelar"
                cancelButtonText="Cancelar"
                confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                isLoading={cancelarLoading}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Financeiro;
