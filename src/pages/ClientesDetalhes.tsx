import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import { Cliente } from '../types/cliente';
import { formatPhone } from '../utils/formatters';
import ContratoAccordion from '../components/ContratoAccordion';
import VisitasAgendamentos from '../components/VisitasAgendamentos';

interface Contrato {
  id: number;
  pppoe: string;
  plano: {
    id: number;
    nome: string;
    valor: number;
    radius?: string;
    ativo?: boolean;
  };
  status: string;
  created_at: string;
  data_instalacao?: string;
  dia_vencimento?: number;
  endereco?: string;
  bairro?: {
    id: number;
    nome: string;
  };
  tipo?: string;
  titulos?: any[];
}

interface Visita {
  id: number;
  created_at: string;
  data: string;
  relato: string;
  acompanhante?: string;
  id_contrato: number;
  tecnicos?: any[];
}

interface Agendamento {
  id: number;
  nome: string;
  descricao: string;
  datainicio: string;
  datafinal: string;
  pppoe: string;
  tipo_evento: string;
  realizada: boolean;
  cancelado: boolean;
  responsaveis?: any[];
}

const ClientesDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContratos, setLoadingContratos] = useState(true);
  const [loadingVisitasAgendamentos, setLoadingVisitasAgendamentos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCliente = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setCliente(data);
        } else {
          setError('Cliente não encontrado');
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        setError('Erro ao buscar informações do cliente');
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
  }, [id]);

  useEffect(() => {
    const fetchContratos = async () => {
      if (!id) return;
      
      try {
        setLoadingContratos(true);
        
        // Buscar contratos do cliente
        const { data: contratosData, error: contratosError } = await supabase
          .from('contratos')
          .select(`
            id,
            pppoe,
            status,
            created_at,
            data_instalacao,
            dia_vencimento,
            endereco,
            id_plano,
            tipo,
            id_bairro
          `)
          .eq('id_cliente', id);
        
        if (contratosError) throw contratosError;
        
        console.log('Contratos data antes de buscar planos:', JSON.stringify(contratosData, null, 2));
        
        // Para cada contrato, buscar o plano associado
        if (contratosData) {
          const contratosComPlanos = await Promise.all(
            contratosData.map(async (contrato) => {
              // Buscar plano do contrato
              const { data: planoData, error: planoError } = await supabase
                .from('planos')
                .select('id, nome, valor, radius, ativo')
                .eq('id', contrato.id_plano)
                .single();
              
              // Buscar bairro do contrato
              const { data: bairroData, error: bairroError } = await supabase
                .from('bairros')
                .select('id, nome')
                .eq('id', contrato.id_bairro)
                .single();
              
              if (planoError) {
                console.error('Erro ao buscar plano:', planoError);
              }
              
              if (bairroError) {
                console.error('Erro ao buscar bairro:', bairroError);
              }
              
              return {
                ...contrato,
                plano: planoData || { id: 0, nome: '', valor: 0, radius: '', ativo: false },
                bairro: bairroData || { id: 0, nome: '' }
              };
            })
          );
          
          console.log('Contratos com planos:', JSON.stringify(contratosComPlanos, null, 2));
          
          // Para cada contrato, buscar seus títulos
          const contratosComTitulos = await Promise.all(
            contratosComPlanos.map(async (contrato) => {
              const { data: titulosData, error: titulosError } = await supabase
                .from('titulos')
                .select(`
                  id,
                  valor,
                  vencimento,
                  status,
                  data_pag,
                  valorpago,
                  nrdocumento,
                  formapgto,
                  nossonumero,
                  pago
                `)
                .eq('id_contrato', contrato.id)
                .order('vencimento', { ascending: true });
              
              if (titulosError) {
                console.error('Erro ao buscar títulos:', titulosError);
                
                return { 
                  ...contrato, 
                  titulos: [] 
                } as unknown as Contrato;
              }
              
              return { 
                ...contrato, 
                titulos: titulosData || [] 
              } as unknown as Contrato;
            })
          );
          
          setContratos(contratosComTitulos);
        }
      } catch (error) {
        console.error('Erro ao buscar contratos:', error);
      } finally {
        setLoadingContratos(false);
      }
    };

    fetchContratos();
  }, [id]);

  useEffect(() => {
    const fetchVisitasEAgendamentos = async () => {
      if (!id || contratos.length === 0) return;
      
      try {
        setLoadingVisitasAgendamentos(true);
        
        // Obter IDs dos contratos para filtrar visitas e agendamentos
        const contratoIds = contratos.map(c => c.id);
        
        // Buscar visitas relacionadas aos contratos do cliente
        const { data: visitasData, error: visitasError } = await supabase
          .from('visitas')
          .select(`
            id,
            created_at,
            data,
            relato,
            acompanhante,
            id_contrato,
            visitas_tecnicos (
              tecnico_id
            )
          `)
          .in('id_contrato', contratoIds)
          .order('data', { ascending: false });
        
        if (visitasError) throw visitasError;
        
        // Buscar agendamentos relacionados aos contratos (via pppoe)
        const pppoes = contratos.map(c => c.pppoe).filter(Boolean);
        
        const { data: agendamentosData, error: agendamentosError } = await supabase
          .from('agenda')
          .select(`
            id,
            nome,
            descricao,
            datainicio,
            datafinal,
            pppoe,
            tipo_evento,
            realizada,
            cancelado,
            agenda_responsaveis (
              user_id
            )
          `)
          .in('pppoe', pppoes)
          .order('datainicio', { ascending: false });
        
        if (agendamentosError) throw agendamentosError;
        
        setVisitas(visitasData || []);
        setAgendamentos(agendamentosData || []);
      } catch (error) {
        console.error('Erro ao buscar visitas e agendamentos:', error);
      } finally {
        setLoadingVisitasAgendamentos(false);
      }
    };

    fetchVisitasEAgendamentos();
  }, [id, contratos]);

  const handleVoltar = () => {
    navigate('/clientes');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button
              onClick={handleVoltar}
              className="mr-4 p-2 rounded-full bg-[#1976D2] hover:bg-[#0D47A1] text-white"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">
              Detalhes do Cliente
            </h1>
          </div>
        </div>

        {/* Conteúdo principal */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : cliente ? (
          <div className="grid grid-cols-1 gap-6">
            {/* Seção de informações do cliente */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-[#1092E8] mb-4">
                Informações do Cliente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-[#1092E8]">Nome</p>
                  <p className="font-medium text-gray-900">{cliente.nome || 'Não informado'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-[#1092E8]">CPF/CNPJ</p>
                  <p className="font-medium text-gray-900">{cliente.cpf_cnpj || 'Não informado'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-[#1092E8]">Telefone</p>
                  <p className="font-medium text-gray-900">
                    {cliente.fonewhats ? formatPhone(cliente.fonewhats) : 'Não informado'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-[#1092E8]">Email</p>
                  <p className="font-medium text-gray-900">{cliente.email || 'Não informado'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-[#1092E8]">Endereço</p>
                  <p className="font-medium text-gray-900">
                    {cliente.logradouro ? `${cliente.logradouro}, ${cliente.nrlogradouro || 'S/N'}` : 'Não informado'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-[#1092E8]">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${cliente.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                    cliente.status === 'Inativo' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                    {cliente.status || 'Pendente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Seção de contratos */}
            {loadingContratos ? (
              <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center">
                <p className="text-gray-500">Carregando contratos...</p>
              </div>
            ) : contratos.length > 0 ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-[#1092E8] mb-4">
                  Contratos
                </h2>
                <div className="space-y-4">
                  <ContratoAccordion 
                    contratos={contratos} 
                    isLoading={false}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-[#1092E8] mb-4">
                  Contratos
                </h2>
                <p className="text-gray-500">Nenhum contrato encontrado para este cliente.</p>
              </div>
            )}

            {/* Seção de visitas e agendamentos */}
            {loadingVisitasAgendamentos ? (
              <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center">
                <p className="text-gray-500">Carregando histórico...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-[#1092E8] mb-4">
                  Histórico de Visitas e Agendamentos
                </h2>
                <VisitasAgendamentos 
                  visitas={visitas} 
                  agendamentos={agendamentos} 
                  isLoading={false}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
            <p>Nenhum cliente encontrado com o ID especificado.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientesDetalhes;
