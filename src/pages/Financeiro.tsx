import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import { Contrato } from '../types/contrato';
import Layout from '../components/Layout';
import EmpresaBackground from '../components/EmpresaBackground';
import ListaCaixas from '../components/ListaCaixas';
import { TitulosContratosModal } from '../components/TitulosContratosModal';
import { Transition } from '@headlessui/react';
import { 
  MagnifyingGlassIcon, 
  LockOpenIcon, 
  ClockIcon, 
  NoSymbolIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface ContratoExtended extends Contrato {
  cliente_nome?: string;
  cliente_idasaas?: string | null;
  plano?: {
    radius?: string;
  };
  radius?: string;
  plano_radius?: string;
}

const Financeiro: React.FC = () => {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  // Estados para contratos e títulos
  const [contratos, setContratos] = useState<ContratoExtended[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<ContratoExtended | null>(null);
  const [showTitulosModal, setShowTitulosModal] = useState(false);
  const [selectedPPPoE, setSelectedPPPoE] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Estados para controlar a visibilidade do histórico
  const [showHistorico, setShowHistorico] = useState(false);

  // Estados para os modais de ação
  const [showLiberarModal, setShowLiberarModal] = useState(false);
  const [showLiberar48Modal, setShowLiberar48Modal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [showBloquearModal, setShowBloquearModal] = useState(false);
  const [showBloquearEmMassaModal, setShowBloquearEmMassaModal] = useState(false);

  // Estados para controlar o loading das ações
  const [isLiberando, setIsLiberando] = useState(false);
  const [isLiberando48, setIsLiberando48] = useState(false);
  const [isCancelando, setIsCancelando] = useState(false);
  const [isBloqueando, setIsBloqueando] = useState(false);
  const [isBloqueandoEmMassa, setIsBloqueandoEmMassa] = useState(false);

  const CONTRACT_STATUS_OPTIONS = [
    { value: 'Todos', label: 'Todos os Contratos' },
    { value: 'Ativo', label: 'Contratos Ativos' },
    { value: 'Agendado', label: 'Contratos Agendados' },
    { value: 'Bloqueado', label: 'Contratos Bloqueados' },
    { value: 'Liberado48', label: 'Contratos Liberados 48h' },
    { value: 'Cancelado', label: 'Contratos Cancelados' },
    { value: 'pendencia', label: 'Contratos com Pendência' },
    { value: 'atraso', label: 'Contratos em Atraso' },
    { value: 'atraso15', label: 'Contratos em Atraso > 15 dias' },
    { value: 'Anual', label: 'Contratos Anuais' },
    { value: 'Anual_Aluguel', label: 'Contratos Anuais Aluguel' },
    { value: 'Cliente Bonificado', label: 'Contratos Bonificados' }
  ];

  const fetchContratos = async (page: number, searchTerm: string = '', status: string = '') => {
    setIsLoading(true);
    try {
      let countQuery = supabase
        .from('contratos')
        .select('*, clientes!inner(idasaas)', { count: 'exact', head: true });

      if (searchTerm) {
        countQuery = countQuery.ilike('pppoe', `%${searchTerm}%`);
      }
      
      if (status === 'atraso') {
        // Use the contratosatraso view for this filter
        const { count, error: countError } = await supabase
          .from('contratosatraso')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'Bloqueado') // Excluir contratos já bloqueados
          .not('tipo', 'eq', 'Anual')
          .not('tipo', 'eq', 'Anual_Aluguel')
          .not('tipo', 'eq', 'Cliente Bonificado');

        if (countError) throw countError;
        console.log('Total de registros em atraso encontrados:', count);
        setTotalCount(count || 0);

        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        
        const { data: contratosAtraso, error: contratosError } = await supabase
          .from('contratosatraso')
          .select(`
            *,
            planos(id, nome, radius),
            clientes(id, nome, idasaas)
          `)
          .neq('status', 'Bloqueado') // Excluir contratos já bloqueados
          .not('tipo', 'eq', 'Anual')
          .not('tipo', 'eq', 'Anual_Aluguel')
          .not('tipo', 'eq', 'Cliente Bonificado')
          .order('pppoe', { ascending: true })
          .range(from, to);

        if (contratosError) throw contratosError;

        if (contratosAtraso) {
          const contratosFormatados = contratosAtraso.map(contrato => ({
            ...contrato,
            cliente_nome: contrato.clientes?.nome || 'Cliente não encontrado',
            cliente_idasaas: contrato.clientes?.idasaas,
            plano: contrato.planos || null
          }));

          setContratos(contratosFormatados);
        } else {
          setContratos([]);
        }
        
        setIsLoading(false);
        return;
      } else if (status === 'atraso15') {
        try {
          console.log('Buscando contratos em atraso > 15 dias...');
          
          // Data limite (15 dias atrás)
          const dataLimite = new Date();
          dataLimite.setDate(dataLimite.getDate() - 15);
          const dataLimiteISO = dataLimite.toISOString();
          
          console.log('Data limite para títulos vencidos:', dataLimiteISO);
          
          // Buscar todos os contratos que não estão bloqueados ou cancelados e não são bonificados
          // e que possuem títulos vencidos há mais de 15 dias e não pagos
          const { data: contratos, error: contratosError } = await supabase
            .from('contratos')
            .select(`
              id,
              titulos!inner(id, vencimento, pago)
            `)
            .lte('titulos.vencimento', dataLimiteISO)
            .not('status', 'in', '("Bloqueado","Cancelado")')
            .not('tipo', 'eq', 'Cliente Bonificado');
          
          if (contratosError) {
            console.error('Erro ao buscar contratos:', contratosError);
            throw contratosError;
          }
          
          // Filtrar manualmente os contratos que têm títulos não pagos
          const idsContratosComTitulosNaoPagos = new Set();
          
          contratos?.forEach(contrato => {
            const titulosNaoPagos = contrato.titulos.filter(
              (titulo: any) => titulo.pago !== true
            );
            
            if (titulosNaoPagos.length > 0) {
              idsContratosComTitulosNaoPagos.add(contrato.id);
            }
          });
          
          const idsArray = Array.from(idsContratosComTitulosNaoPagos);
          console.log(`Encontrados ${idsArray.length} contratos em atraso > 15 dias`);
          
          // Paginação manual
          const totalCount = idsArray.length;
          setTotalCount(totalCount);
          
          const from = (page - 1) * itemsPerPage;
          const to = Math.min(from + itemsPerPage, totalCount);
          const idsParaBuscar = idsArray.slice(from, to);
          
          if (idsParaBuscar.length === 0) {
            console.log('Nenhum contrato em atraso > 15 dias encontrado na página atual.');
            setContratos([]);
            setIsLoading(false);
            return;
          }
          
          // Buscar os detalhes completos dos contratos
          const { data: contratosCompletos, error: completosError } = await supabase
            .from('contratos')
            .select('*')
            .in('id', idsParaBuscar)
            .order('pppoe', { ascending: true });
          
          if (completosError) {
            console.error('Erro ao buscar detalhes dos contratos:', completosError);
            throw completosError;
          }
          
          // Buscar informações adicionais dos clientes e planos
          const clienteIds = contratosCompletos?.map(c => c.id_cliente).filter(Boolean) || [];
          const planoIds = contratosCompletos?.map(c => c.id_plano).filter(Boolean) || [];
          
          const [clientesResponse, planosResponse] = await Promise.all([
            supabase.from('clientes').select('id, nome, idasaas').in('id', clienteIds),
            supabase.from('planos').select('id, nome, radius').in('id', planoIds)
          ]);
          
          const clientesMap = (clientesResponse.data || []).reduce((acc: any, cliente) => {
            acc[cliente.id] = cliente;
            return acc;
          }, {});
          
          const planosMap = (planosResponse.data || []).reduce((acc: any, plano) => {
            acc[plano.id] = plano;
            return acc;
          }, {});
          
          // Formatar os contratos para exibição
          const contratosFormatados = contratosCompletos?.map(contrato => ({
            ...contrato,
            cliente_nome: clientesMap[contrato.id_cliente]?.nome || 'Cliente não encontrado',
            cliente_idasaas: clientesMap[contrato.id_cliente]?.idasaas,
            plano: planosMap[contrato.id_plano] || null
          })) || [];
          
          setContratos(contratosFormatados);
          setIsLoading(false);
          return;
        } catch (error: any) {
          console.error('Erro ao buscar contratos em atraso > 15 dias:', error.message);
          toast.error('Erro ao buscar contratos em atraso');
          setIsLoading(false);
          return;
        }
      } else if (status === 'pendencia') {
        countQuery = countQuery.eq('pendencia', true);
      } else if (status === 'Anual') {
        countQuery = countQuery.eq('tipo', 'Anual');
      } else if (status === 'Anual_Aluguel') {
        countQuery = countQuery.eq('tipo', 'Anual_Aluguel');
      } else if (status === 'Cliente Bonificado') {
        countQuery = countQuery.eq('tipo', 'Cliente Bonificado');
      } else if (status && status !== 'Todos') {
        countQuery = countQuery.eq('status', status);
      } else if (status === 'Todos') {
        countQuery = countQuery.neq('status', 'Cancelado');
      }
      
      // Excluir tipos especiais para todos os filtros exceto "Todos" e os filtros específicos para esses tipos
      if (status !== 'Todos' && status !== 'Ativo' && status !== 'Anual' && status !== 'Anual_Aluguel' && status !== 'Cliente Bonificado' && status !== 'Bloqueado') {
        countQuery = countQuery
          .not('tipo', 'eq', 'Anual')
          .not('tipo', 'eq', 'Anual_Aluguel')
          .not('tipo', 'eq', 'Cliente Bonificado');
      }
      
      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      console.log('Total de registros encontrados:', count);
      setTotalCount(count || 0);

      let dataQuery = supabase
        .from('contratos')
        .select('*, clientes!inner(id, nome, idasaas), planos(id, nome, radius)')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        dataQuery = dataQuery.ilike('pppoe', `%${searchTerm}%`);
      }
      
      if (status === 'pendencia') {
        dataQuery = dataQuery.eq('pendencia', true);
      } else if (status === 'Anual') {
        dataQuery = dataQuery.eq('tipo', 'Anual');
      } else if (status === 'Anual_Aluguel') {
        dataQuery = dataQuery.eq('tipo', 'Anual_Aluguel');
      } else if (status === 'Cliente Bonificado') {
        dataQuery = dataQuery.eq('tipo', 'Cliente Bonificado');
      } else if (status && status !== 'Todos') {
        dataQuery = dataQuery.eq('status', status);
      } else if (status === 'Todos') {
        dataQuery = dataQuery.neq('status', 'Cancelado');
      }

      // Excluir tipos especiais para todos os filtros exceto "Todos" e os filtros específicos para esses tipos
      if (status !== 'Todos' && status !== 'Ativo' && status !== 'Anual' && status !== 'Anual_Aluguel' && status !== 'Cliente Bonificado' && status !== 'Bloqueado') {
        dataQuery = dataQuery
          .not('tipo', 'eq', 'Anual')
          .not('tipo', 'eq', 'Anual_Aluguel')
          .not('tipo', 'eq', 'Cliente Bonificado');
      }

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data: contratosData, error: contratosError } = await dataQuery
        .range(from, to);

      if (contratosError) throw contratosError;

      if (contratosData) {
        const contratosFormatados = contratosData.map(contrato => ({
          ...contrato,
          cliente_nome: contrato.clientes?.nome || 'Cliente não encontrado',
          cliente_idasaas: contrato.clientes?.idasaas,
          plano: contrato.planos || null
        }));

        setContratos(contratosFormatados);
      } else {
        setContratos([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar contratos:', error.message);
      toast.error('Erro ao carregar contratos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContratos(1, '', 'Todos');
  }, []);

  useEffect(() => {
    fetchContratos(currentPage, searchTerm, contractStatusFilter);
  }, [currentPage, searchTerm, contractStatusFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setContractStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleOpenTitulosModal = (contrato: ContratoExtended) => {
    setSelectedContrato(contrato);
    setSelectedPPPoE(contrato.pppoe || '');
    setShowTitulosModal(true);
  };

  const handleOpenLiberarModal = (contrato: ContratoExtended) => {
    setSelectedContrato(contrato);
    setShowLiberarModal(true);
  };

  const handleOpenLiberar48Modal = (contrato: ContratoExtended) => {
    setSelectedContrato(contrato);
    setShowLiberar48Modal(true);
  };

  const handleOpenCancelarModal = (contrato: ContratoExtended) => {
    setSelectedContrato(contrato);
    setShowCancelarModal(true);
  };

  const handleOpenBloquearModal = (contrato: ContratoExtended) => {
    setSelectedContrato(contrato);
    setShowBloquearModal(true);
  };

  const handleOpenBloquearEmMassaModal = () => {
    setShowBloquearEmMassaModal(true);
  };

  const handleConfirmarLiberacao = async () => {
    if (!selectedContrato) return;
    
    let radius = selectedContrato.plano?.radius;
    
    if (!radius && selectedContrato.id_plano) {
      try {
        const { data: planoData } = await supabase
          .from('planos')
          .select('radius')
          .eq('id', selectedContrato.id_plano)
          .single();
          
        if (planoData) {
          radius = planoData.radius;
          console.log('Radius recuperado do banco:', radius);
        }
      } catch (error) {
        console.error('Erro ao buscar radius do plano:', error);
      }
    }
    
    setIsLiberando(true);
    try {
      // Obter o ID da empresa do usuário logado
      const empresaId = userData?.empresa?.id;
      
      console.log('Liberando contrato com ID da empresa:', empresaId);
      console.log('Enviando dados para liberar cliente:', {
        pppoe: selectedContrato.pppoe,
        radius,
        acao: 'liberar',
        id_empresa: empresaId
      });
      
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pppoe: selectedContrato.pppoe,
          radius,
          acao: 'liberar',
          id_empresa: empresaId
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao liberar cliente');
      }

      toast.success('Cliente liberado com sucesso!');
      setShowLiberarModal(false);
      fetchContratos(currentPage, searchTerm, contractStatusFilter);
    } catch (error) {
      console.error('Erro ao liberar cliente:', error);
      toast.error('Erro ao liberar cliente');
    } finally {
      setIsLiberando(false);
      setSelectedContrato(null);
    }
  };

  const handleConfirmarLiberacao48 = async () => {
    if (!selectedContrato) return;
    
    let radius = selectedContrato.plano?.radius;
    
    if (!radius && selectedContrato.id_plano) {
      try {
        const { data: planoData } = await supabase
          .from('planos')
          .select('radius')
          .eq('id', selectedContrato.id_plano)
          .single();
          
        if (planoData) {
          radius = planoData.radius;
          console.log('Radius recuperado do banco:', radius);
        }
      } catch (error) {
        console.error('Erro ao buscar radius do plano:', error);
      }
    }
    
    setIsLiberando48(true);
    try {
      // Obter o ID da empresa do usuário logado
      const empresaId = userData?.empresa?.id;
      
      console.log('Liberando contrato por 48h com ID da empresa:', empresaId);
      
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pppoe: selectedContrato.pppoe,
          radius,
          acao: 'liberar48h',
          id_empresa: empresaId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta de erro do webhook:', errorText);
        throw new Error('Erro ao liberar cliente por 48 horas');
      }

      toast.success('Cliente liberado por 48 horas com sucesso!');
      setShowLiberar48Modal(false);
      fetchContratos(currentPage, searchTerm, contractStatusFilter);
    } catch (error) {
      console.error('Erro ao liberar cliente por 48 horas:', error);
      toast.error('Erro ao liberar cliente por 48 horas');
    } finally {
      setIsLiberando48(false);
      setSelectedContrato(null);
    }
  };

  const handleConfirmarCancelamento = async () => {
    if (!selectedContrato) return;
    
    let radius = selectedContrato.plano?.radius;
    
    if (!radius && selectedContrato.id_plano) {
      try {
        const { data: planoData } = await supabase
          .from('planos')
          .select('radius')
          .eq('id', selectedContrato.id_plano)
          .single();
          
        if (planoData) {
          radius = planoData.radius;
          console.log('Radius recuperado do banco:', radius);
        }
      } catch (error) {
        console.error('Erro ao buscar radius do plano:', error);
      }
    }
    
    setIsCancelando(true);
    try {
      // Obter o ID da empresa do usuário logado
      const empresaId = userData?.empresa?.id;
      
      console.log('Cancelando contrato com ID da empresa:', empresaId);
      console.log('Enviando dados para cancelar contrato:', {
        pppoe: selectedContrato.pppoe,
        radius,
        acao: 'cancelar',
        id_empresa: empresaId
      });
      
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pppoe: selectedContrato.pppoe,
          radius,
          acao: 'cancelar',
          id_empresa: empresaId
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao cancelar contrato');
      }

      // Atualizar o status do contrato no banco de dados
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ status: 'Cancelado' })
        .eq('id', selectedContrato.id);

      if (updateError) {
        console.error('Erro ao atualizar status do contrato:', updateError);
        throw new Error('Erro ao atualizar status do contrato');
      }

      toast.success('Contrato cancelado com sucesso!');
      setShowCancelarModal(false);
      fetchContratos(currentPage, searchTerm, contractStatusFilter);
    } catch (error) {
      console.error('Erro ao cancelar contrato:', error);
      toast.error('Erro ao cancelar contrato');
    } finally {
      setIsCancelando(false);
      setSelectedContrato(null);
    }
  };

  const handleConfirmarBloqueio = async () => {
    if (!selectedContrato) return;
    
    let radius = selectedContrato.plano?.radius;
    
    if (!radius && selectedContrato.id_plano) {
      try {
        const { data: planoData } = await supabase
          .from('planos')
          .select('radius')
          .eq('id', selectedContrato.id_plano)
          .single();
          
        if (planoData) {
          radius = planoData.radius;
          console.log('Radius recuperado do banco:', radius);
        }
      } catch (error) {
        console.error('Erro ao buscar radius do plano:', error);
      }
    }
    
    setIsBloqueando(true);
    try {
      // Obter o ID da empresa do usuário logado
      const empresaId = userData?.empresa?.id;
      
      console.log('Bloqueando contrato com ID da empresa:', empresaId);
      
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pppoe: selectedContrato.pppoe,
          radius,
          acao: 'Bloquear',
          id_empresa: empresaId
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao bloquear contrato');
      }

      toast.success('Contrato bloqueado com sucesso!');
      setShowBloquearModal(false);
      fetchContratos(currentPage, searchTerm, contractStatusFilter);
    } catch (error) {
      console.error('Erro ao bloquear contrato:', error);
      toast.error('Erro ao bloquear contrato');
    } finally {
      setIsBloqueando(false);
      setSelectedContrato(null);
    }
  };

  const handleConfirmarBloqueioEmMassa = async () => {
    setIsBloqueandoEmMassa(true);
    try {
      // Obter o ID da empresa do usuário logado
      const empresaId = userData?.empresa?.id;
      
      console.log('Bloqueando contratos em massa com ID da empresa:', empresaId);
      
      if (contractStatusFilter === 'atraso') {
        // Use the contratosatraso view for this filter - get ALL contracts, not just the current page
        const { data: contratosAtraso, error: contratosError } = await supabase
          .from('contratosatraso')
          .select('*');
        
        console.log('Total de registros em atraso encontrados via view:', contratosAtraso?.length || 0);
        
        if (contratosError) {
          console.error('Erro ao buscar contratos em atraso:', contratosError);
          toast.error('Erro ao buscar detalhes dos contratos');
          setIsBloqueandoEmMassa(false);
          return;
        }
        
        if (!contratosAtraso || contratosAtraso.length === 0) {
          toast.error('Não foram encontrados contratos válidos para bloquear');
          setIsBloqueandoEmMassa(false);
          return;
        }
        
        // Log the structure of the first contract to debug
        console.log('Estrutura do primeiro contrato:', JSON.stringify(contratosAtraso[0], null, 2));
        
        // Extract all PPPoEs and radius values from ALL contracts
        const promises = contratosAtraso.map(async (contrato) => {
          let radius = contrato.planos?.radius;
          
          if (!radius && contrato.id_plano) {
            try {
              const { data: planoData } = await supabase
                .from('planos')
                .select('radius')
                .eq('id', contrato.id_plano)
                .single();
                
              if (planoData) {
                radius = planoData.radius;
                console.log('Radius recuperado do banco:', radius);
              }
            } catch (error) {
              console.error('Erro ao buscar radius do plano:', error);
            }
          }
          
          return {
            pppoe: contrato.pppoe,
            radius
          };
        });
        
        const blockedContracts = await Promise.all(promises);
        
        console.log(`Enviando ${blockedContracts.length} contratos para bloqueio em massa:`, blockedContracts);
        
        // Use the correct n8n webhook URL
        const response = await fetch('https://webhooksn8nconecte.apanet.info/webhook/fbc34600-9d9c-4dcc-86ed-ae1b962a2f72', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contratos: blockedContracts,
            id_empresa: empresaId
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Resposta de erro do webhook:', errorText);
          throw new Error('Erro ao bloquear contratos em massa');
        }

        toast.success(`${blockedContracts.length} contratos bloqueados com sucesso!`);
        setShowBloquearEmMassaModal(false);
        fetchContratos(currentPage, searchTerm, contractStatusFilter);
      } else if (contractStatusFilter === 'atraso15') {
        try {
          console.log('Bloqueando contratos em atraso > 15 dias...');
          
          // Data limite (15 dias atrás)
          const dataLimite = new Date();
          dataLimite.setDate(dataLimite.getDate() - 15);
          const dataLimiteISO = dataLimite.toISOString();
          
          // Buscar todos os contratos que não estão bloqueados ou cancelados e não são bonificados
          // e que possuem títulos vencidos há mais de 15 dias e não pagos
          const { data: contratos, error: contratosError } = await supabase
            .from('contratos')
            .select(`
              id,
              pppoe,
              id_plano,
              titulos!inner(id, vencimento, pago)
            `)
            .lte('titulos.vencimento', dataLimiteISO)
            .not('status', 'in', '("Bloqueado","Cancelado")')
            .not('tipo', 'eq', 'Cliente Bonificado');
          
          if (contratosError) {
            console.error('Erro ao buscar contratos em atraso > 15 dias:', contratosError);
            toast.error('Erro ao buscar detalhes dos contratos');
            setIsBloqueandoEmMassa(false);
            return;
          }
          
          // Filtrar manualmente os contratos que têm títulos não pagos
          const contratosComTitulosNaoPagos = new Map();
          
          contratos?.forEach(contrato => {
            const titulosNaoPagos = contrato.titulos.filter(
              (titulo: any) => titulo.pago !== true
            );
            
            if (titulosNaoPagos.length > 0 && !contratosComTitulosNaoPagos.has(contrato.id)) {
              // Remover a propriedade titulos para evitar dados duplicados
              const { titulos, ...contratoSemTitulos } = contrato;
              contratosComTitulosNaoPagos.set(contrato.id, contratoSemTitulos);
            }
          });
          
          const contratosUnicos = Array.from(contratosComTitulosNaoPagos.values());
          console.log(`Encontrados ${contratosUnicos.length} contratos em atraso > 15 dias para bloquear`);
          
          if (contratosUnicos.length === 0) {
            toast.error('Não foram encontrados contratos válidos para bloquear');
            setIsBloqueandoEmMassa(false);
            return;
          }
          
          // Extrair apenas os PPPoEs dos contratos (sem radius)
          const pppoes = contratosUnicos.map(contrato => contrato.pppoe).filter(Boolean);
          
          console.log(`Enviando ${pppoes.length} PPPoEs para bloqueio em massa:`, pppoes);
          
          // Usar o webhook do n8n
          const response = await fetch('https://webhooksn8nconecte.apanet.info/webhook/fbc34600-9d9c-4dcc-86ed-ae1b962a2f72', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pppoes: pppoes,
              id_empresa: empresaId
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Resposta de erro do webhook:', errorText);
            throw new Error('Erro ao bloquear contratos em massa');
          }
          
          toast.success(`${pppoes.length} contratos bloqueados com sucesso!`);
          setShowBloquearEmMassaModal(false);
          fetchContratos(currentPage, searchTerm, contractStatusFilter);
        } catch (error: any) {
          console.error('Erro ao bloquear contratos em atraso > 15 dias:', error.message);
          toast.error('Erro ao bloquear contratos em massa');
          setIsBloqueandoEmMassa(false);
          return;
        }
      }
    } catch (error) {
      console.error('Erro ao bloquear contratos em massa:', error);
      toast.error('Erro ao bloquear contratos em massa');
    } finally {
      setIsBloqueandoEmMassa(false);
    }
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage)));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const exportContratosCSV = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('contratos')
        .select(`
          pppoe,
          dia_vencimento,
          planos(nome),
          clientes(nome)
        `);

      // Aplicar os mesmos filtros que estão sendo usados na visualização atual
      if (searchTerm) {
        query = query.ilike('pppoe', `%${searchTerm}%`);
      }
      
      if (contractStatusFilter === 'atraso') {
        // Usar a view de contratos em atraso
        const { data, error } = await supabase
          .from('contratosatraso')
          .select(`
            pppoe,
            dia_vencimento,
            planos(nome),
            clientes(nome)
          `)
          .neq('status', 'Bloqueado') // Excluir contratos já bloqueados
          .not('tipo', 'eq', 'Anual')
          .not('tipo', 'eq', 'Anual_Aluguel')
          .not('tipo', 'eq', 'Cliente Bonificado');

        if (error) throw error;
        
        if (data && data.length > 0) {
          downloadCSV(formatarDadosCSV(data));
        } else {
          toast.error('Nenhum dado encontrado para exportar');
        }
        
        setIsLoading(false);
        return;
      } else if (contractStatusFilter === 'atraso15') {
        try {
          console.log('Exportando contratos em atraso > 15 dias para CSV...');
          
          // Data limite (15 dias atrás)
          const dataLimite = new Date();
          dataLimite.setDate(dataLimite.getDate() - 15);
          const dataLimiteISO = dataLimite.toISOString();
          
          // Buscar todos os contratos que não estão bloqueados ou cancelados e não são bonificados
          // e que possuem títulos vencidos há mais de 15 dias e não pagos
          const { data: contratos, error: contratosError } = await supabase
            .from('contratos')
            .select(`
              id,
              pppoe,
              dia_vencimento,
              planos(id, nome),
              clientes(id, nome),
              titulos!inner(id, vencimento, pago)
            `)
            .lte('titulos.vencimento', dataLimiteISO)
            .not('status', 'in', '("Bloqueado","Cancelado")')
            .not('tipo', 'eq', 'Cliente Bonificado');
          
          if (contratosError) {
            console.error('Erro ao buscar contratos para CSV:', contratosError);
            throw contratosError;
          }
          
          // Filtrar manualmente os contratos que têm títulos não pagos
          const contratosComTitulosNaoPagos = new Map();
          
          contratos?.forEach(contrato => {
            const titulosNaoPagos = contrato.titulos.filter(
              (titulo: any) => titulo.pago !== true
            );
            
            if (titulosNaoPagos.length > 0 && !contratosComTitulosNaoPagos.has(contrato.id)) {
              // Remover a propriedade titulos para o CSV
              const { titulos, ...contratoSemTitulos } = contrato;
              contratosComTitulosNaoPagos.set(contrato.id, contratoSemTitulos);
            }
          });
          
          const contratosUnicos = Array.from(contratosComTitulosNaoPagos.values());
          console.log(`Exportando ${contratosUnicos.length} contratos em atraso > 15 dias para CSV`);
          
          if (contratosUnicos.length > 0) {
            downloadCSV(formatarDadosCSV(contratosUnicos));
          } else {
            toast.error('Nenhum contrato em atraso > 15 dias encontrado para exportar');
          }
          
          setIsLoading(false);
          return;
        } catch (error: any) {
          console.error('Erro ao exportar contratos em atraso > 15 dias:', error.message);
          toast.error('Erro ao exportar contratos em atraso > 15 dias');
          setIsLoading(false);
          return;
        }
      } else if (contractStatusFilter === 'pendencia') {
        query = query.eq('pendencia', true);
      } else if (contractStatusFilter === 'Anual') {
        query = query.eq('tipo', 'Anual');
      } else if (contractStatusFilter === 'Anual_Aluguel') {
        query = query.eq('tipo', 'Anual_Aluguel');
      } else if (contractStatusFilter === 'Cliente Bonificado') {
        query = query.eq('tipo', 'Cliente Bonificado');
      } else if (contractStatusFilter && contractStatusFilter !== 'Todos') {
        query = query.eq('status', contractStatusFilter);
      } else if (contractStatusFilter === 'Todos') {
        query = query.neq('status', 'Cancelado');
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        downloadCSV(formatarDadosCSV(data));
      } else {
        toast.error('Nenhum dado encontrado para exportar');
      }
    } catch (error) {
      console.error('Erro ao exportar contratos:', error);
      toast.error('Erro ao exportar contratos para CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const formatarDadosCSV = (data: any[]) => {
    // Cabeçalho do CSV
    let csv = 'Nome do Cliente,PPPoE,Nome do Plano,Dia do Vencimento\n';
    
    // Adicionar cada linha de dados
    data.forEach(item => {
      const nome_cliente = item.clientes?.nome || 'N/A';
      const pppoe = item.pppoe || 'N/A';
      const nome_plano = item.planos?.nome || 'N/A';
      const dia_vencimento = item.dia_vencimento || 'N/A';
      
      // Escapar vírgulas e aspas nos campos
      const linha = [
        `"${nome_cliente.replace(/"/g, '""')}"`,
        `"${pppoe.replace(/"/g, '""')}"`,
        `"${nome_plano.replace(/"/g, '""')}"`,
        `"${dia_vencimento}"`
      ].join(',');
      
      csv += linha + '\n';
    });
    
    return csv;
  };

  const downloadCSV = (csv: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contratos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Arquivo CSV gerado com sucesso!');
  };

  return (
    <Layout>
      <EmpresaBackground>
        <div className="min-h-screen p-6">
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
                        onChange={handleSearchChange}
                        placeholder="Buscar por PPPoE..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    {/* Filtro de Status */}
                    <div className="min-w-[200px]">
                      <select
                        value={contractStatusFilter}
                        onChange={handleStatusChange}
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

                    {/* Botão Exportar CSV */}
                    <button
                      onClick={exportContratosCSV}
                      className="ml-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Exportar CSV
                    </button>

                    {/* Botão Bloquear em Massa - Mostrar apenas quando o filtro for Atraso > 15 dias */}
                    {contractStatusFilter === 'atraso15' && (
                      <button
                        onClick={handleOpenBloquearEmMassaModal}
                        className="ml-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <NoSymbolIcon className="h-4 w-4 mr-1" />
                        Bloquear em Massa
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabela de Contratos */}
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <div className="flex justify-center items-center p-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-300">Carregando...</span>
                    </div>
                  ) : (
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {/* Botão Ver Títulos - Visível para todos os contratos, exceto Bonificados */}
                            {contractStatusFilter !== 'Cliente Bonificado' && (
                              <button
                                onClick={() => handleOpenTitulosModal(contrato)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                title="Ver Títulos"
                              >
                                <DocumentTextIcon className="h-5 w-5" />
                              </button>
                            )}
                            
                            {/* Botão Liberar Contrato - Mostrar quando o filtro estiver em Bloqueado ou Atraso ou Liberado48 */}
                            {(contractStatusFilter === 'Bloqueado' || contractStatusFilter === 'atraso' || contractStatusFilter === 'Liberado48') && (
                              <button
                                onClick={() => handleOpenLiberarModal(contrato)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="Liberar Contrato"
                              >
                                <LockOpenIcon className="h-5 w-5" />
                              </button>
                            )}
                            
                            {/* Botão Bloquear Contrato - Mostrar quando o filtro estiver em Ativo ou Atraso ou Liberado48 */}
                            {(contractStatusFilter === 'Ativo' || contractStatusFilter === 'atraso' || contractStatusFilter === 'Liberado48') && (
                              <button
                                onClick={() => handleOpenBloquearModal(contrato)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Bloquear Contrato"
                              >
                                <NoSymbolIcon className="h-5 w-5" />
                              </button>
                            )}
                            
                            {/* Botão Liberar Cliente 48 horas - Mostrar apenas quando o filtro estiver em Bloqueados */}
                            {contractStatusFilter === 'Bloqueado' && (
                              <button
                                onClick={() => handleOpenLiberar48Modal(contrato)}
                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                title="Liberar contrato por 48hs"
                              >
                                <ClockIcon className="h-5 w-5" />
                              </button>
                            )}
                            
                            {/* Botão Cancelar Contrato - Mostrar apenas quando o filtro estiver em Bloqueados */}
                            {contractStatusFilter === 'Bloqueado' && (
                              <button
                                onClick={() => handleOpenCancelarModal(contrato)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Cancelar Contrato"
                              >
                                <NoSymbolIcon className="h-5 w-5" />
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
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
                    Página {currentPage} de {Math.ceil(totalCount / itemsPerPage)} ({totalCount} registros)
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
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

              {/* Modal de Confirmação de Liberação */}
              {showLiberarModal && (
                <div className="fixed inset-0 z-[70] overflow-y-auto">
                  <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isLiberando && setShowLiberarModal(false)}></div>
                    <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                    <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                            <LockOpenIcon className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Liberar Contrato</h3>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Tem certeza que deseja liberar o contrato do cliente {selectedContrato?.cliente_nome}? Esta ação irá restaurar o acesso à internet.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                          type="button"
                          className={`inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${isLiberando ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={handleConfirmarLiberacao}
                          disabled={isLiberando}
                        >
                          {isLiberando ? 'Liberando...' : 'Liberar'}
                        </button>
                        <button
                          type="button"
                          className={`mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm ${isLiberando ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={() => !isLiberando && setShowLiberarModal(false)}
                          disabled={isLiberando}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Confirmação de Liberação por 48 horas */}
              {showLiberar48Modal && (
                <div className="fixed inset-0 z-[70] overflow-y-auto">
                  <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isLiberando48 && setShowLiberar48Modal(false)}></div>
                    <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                    <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                            <ClockIcon className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Liberar por 48 horas</h3>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Tem certeza que deseja liberar o contrato do cliente {selectedContrato?.cliente_nome} por 48 horas? Esta ação irá restaurar o acesso à internet temporariamente.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                          type="button"
                          className={`inline-flex w-full justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${isLiberando48 ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={handleConfirmarLiberacao48}
                          disabled={isLiberando48}
                        >
                          {isLiberando48 ? 'Liberando...' : 'Liberar por 48h'}
                        </button>
                        <button
                          type="button"
                          className={`mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm ${isLiberando48 ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={() => !isLiberando48 && setShowLiberar48Modal(false)}
                          disabled={isLiberando48}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Confirmação de Cancelamento */}
              {showCancelarModal && (
                <div className="fixed inset-0 z-[70] overflow-y-auto">
                  <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isCancelando && setShowCancelarModal(false)}></div>
                    <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                    <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <NoSymbolIcon className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Cancelar Contrato</h3>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Tem certeza que deseja cancelar o contrato do cliente {selectedContrato?.cliente_nome}? Esta ação não pode ser desfeita.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                          type="button"
                          className={`inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${isCancelando ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={handleConfirmarCancelamento}
                          disabled={isCancelando}
                        >
                          {isCancelando ? 'Cancelando...' : 'Cancelar Contrato'}
                        </button>
                        <button
                          type="button"
                          className={`mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm ${isCancelando ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={() => !isCancelando && setShowCancelarModal(false)}
                          disabled={isCancelando}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Confirmação de Bloqueio */}
              {showBloquearModal && (
                <div className="fixed inset-0 z-[70] overflow-y-auto">
                  <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isBloqueando && setShowBloquearModal(false)}></div>
                    <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                    <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <NoSymbolIcon className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Bloquear Contrato</h3>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Tem certeza que deseja bloquear o contrato do cliente {selectedContrato?.cliente_nome}? Esta ação irá suspender o acesso à internet.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                          type="button"
                          className={`inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${isBloqueando ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={handleConfirmarBloqueio}
                          disabled={isBloqueando}
                        >
                          {isBloqueando ? 'Bloqueando...' : 'Bloquear'}
                        </button>
                        <button
                          type="button"
                          className={`mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm ${isBloqueando ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={() => !isBloqueando && setShowBloquearModal(false)}
                          disabled={isBloqueando}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Confirmação de Bloqueio em Massa */}
              {showBloquearEmMassaModal && (
                <div className="fixed inset-0 z-[70] overflow-y-auto">
                  <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isBloqueandoEmMassa && setShowBloquearEmMassaModal(false)}></div>
                    <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                    <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <NoSymbolIcon className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Bloquear em Massa</h3>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Tem certeza que deseja bloquear todos os contratos visíveis na lista? Esta ação irá suspender o acesso à internet de todos os clientes.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                          type="button"
                          className={`inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${isBloqueandoEmMassa ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={handleConfirmarBloqueioEmMassa}
                          disabled={isBloqueandoEmMassa}
                        >
                          {isBloqueandoEmMassa ? 'Bloqueando...' : 'Bloquear em Massa'}
                        </button>
                        <button
                          type="button"
                          className={`mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm ${isBloqueandoEmMassa ? 'opacity-75 cursor-not-allowed' : ''}`}
                          onClick={() => !isBloqueandoEmMassa && setShowBloquearEmMassaModal(false)}
                          disabled={isBloqueandoEmMassa}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </EmpresaBackground>
    </Layout>
  );
};

export default Financeiro;
