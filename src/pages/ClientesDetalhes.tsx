import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import { Cliente } from '../types/cliente';
import { formatPhone } from '../utils/formatters';
import { formatDate } from '../utils/formatDate';
import ContratoAccordion from '../components/ContratoAccordion';
import VisitasAgendamentos from '../components/VisitasAgendamentos';

interface Contrato {
  id: number;
  pppoe: string;
  plano: {
    id: number;
    nome: string;
    valor: number;
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
            plano:id_plano (id, nome, valor),
            bairro:id_bairro (id, nome)
          `)
          .eq('id_cliente', id);
        
        if (contratosError) throw contratosError;
        
        // Para cada contrato, buscar seus títulos
        if (contratosData) {
          const contratosComTitulos = await Promise.all(
            contratosData.map(async (contrato) => {
              const { data: titulosData, error: titulosError } = await supabase
                .from('titulos')
                .select('*')
                .eq('id_contrato', contrato.id)
                .order('vencimento', { ascending: false });
              
              if (titulosError) {
                console.error('Erro ao buscar títulos:', titulosError);
                return { 
                  ...contrato, 
                  plano: contrato.plano?.[0] || { id: 0, nome: '', valor: 0 },
                  bairro: contrato.bairro?.[0] || { id: 0, nome: '' },
                  titulos: [] 
                } as Contrato;
              }
              
              return { 
                ...contrato, 
                plano: contrato.plano?.[0] || { id: 0, nome: '', valor: 0 },
                bairro: contrato.bairro?.[0] || { id: 0, nome: '' },
                titulos: titulosData || [] 
              } as Contrato;
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
              className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Informações do Cliente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nome</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cliente.nome || 'Não informado'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">CPF/CNPJ</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cliente.cpf_cnpj || 'Não informado'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Telefone</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {cliente.fonewhats ? formatPhone(cliente.fonewhats) : 'Não informado'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cliente.email || 'Não informado'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Endereço</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {cliente.logradouro ? `${cliente.logradouro}, ${cliente.nrlogradouro || 'S/N'}` : 'Não informado'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Contratos
              </h2>
              <ContratoAccordion 
                contratos={contratos} 
                isLoading={loadingContratos} 
              />
            </div>

            {/* Seção de visitas e agendamentos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Visitas e Agendamentos
              </h2>
              <VisitasAgendamentos 
                visitas={visitas} 
                agendamentos={agendamentos} 
                isLoading={loadingVisitasAgendamentos} 
              />
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-700 dark:text-yellow-400">
            Nenhum cliente encontrado com o ID especificado.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientesDetalhes;
