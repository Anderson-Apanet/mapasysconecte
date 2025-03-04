import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UsersIcon, 
  DocumentTextIcon, 
  CalendarIcon, 
  ClockIcon,
  UserMinusIcon,
  LockClosedIcon,
  ClockIcon as ClockIconSolid,
  ArrowPathIcon,
  ChartBarIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  BarElement
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  BarElement
);

interface ClientStats {
  total: number;
  ativos: number;
  inativos: number;
  bloqueados: number;
}

interface InstalacoesPorMes {
  mes: string;
  total: number;
  realizadas: number;
}

interface ContratosPorMes {
  mes: string;
  total: number;
}

interface StatusContratos {
  status: string;
  total: number;
}

interface ReceitaStats {
  receitaMensal: number;
  totalContratos: number;
  mediaContrato: number;
  crescimentoMensal: {
    atual: number;
    anterior: number;
    percentual: number;
  };
}

interface ReceitaDespesaStats {
  meses: string[];
  receitas: number[];
  despesas: number[];
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [clientStats, setClientStats] = useState<ClientStats>({
    total: 0,
    ativos: 0,
    inativos: 0,
    bloqueados: 0
  });
  const [instalacoesPorMes, setInstalacoesPorMes] = useState<InstalacoesPorMes[]>([]);
  const [contratosPorMes, setContratosPorMes] = useState<ContratosPorMes[]>([]);
  const [statusContratos, setStatusContratos] = useState<StatusContratos[]>([]);
  const [receitaStats, setReceitaStats] = useState<ReceitaStats>({
    receitaMensal: 0,
    totalContratos: 0,
    mediaContrato: 0,
    crescimentoMensal: {
      atual: 0,
      anterior: 0,
      percentual: 0
    }
  });
  const [receitaDespesaStats, setReceitaDespesaStats] = useState<ReceitaDespesaStats>({
    meses: [],
    receitas: [],
    despesas: [],
    totalReceitas: 0,
    totalDespesas: 0,
    saldo: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchClientStats();
    fetchInstalacoesPorMes();
    fetchContratosPorMes();
    fetchStatusContratos();
    fetchReceitaStats();
    fetchReceitaDespesaStats();
  }, []);

  const fetchClientStats = async () => {
    try {
      setLoading(true);
      
      // Buscar total de ativos
      const { count: ativos, error: ativosError } = await supabase
        .from('contratos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativo');

      // Buscar total de inativos
      const { count: inativos, error: inativosError } = await supabase
        .from('contratos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Inativo');

      // Buscar total de bloqueados
      const { count: bloqueados, error: bloqueadosError } = await supabase
        .from('contratos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Bloqueado');

      if (ativosError) throw ativosError;
      if (inativosError) throw inativosError;
      if (bloqueadosError) throw bloqueadosError;

      // Atualizar as estatísticas
      const statsData = {
        total: (ativos || 0) + (inativos || 0) + (bloqueados || 0),
        ativos: ativos || 0,
        inativos: inativos || 0,
        bloqueados: bloqueados || 0
      };

      setClientStats(statsData);
      return statsData; // Retornar os dados para uso em outras funções
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchInstalacoesPorMes = async () => {
    try {
      const anoAtual = new Date().getFullYear();
      const { data, error } = await supabase
        .from('agenda')
        .select('*')
        .eq('tipo_evento', 'Instalação')
        .gte('datainicio', `${anoAtual}-01-01`)
        .lte('datainicio', `${anoAtual}-12-31`);

      if (error) {
        throw error;
      }

      // Agrupa as instalações por mês
      const meses = Array.from({ length: 12 }, (_, i) => {
        const mes = new Date(anoAtual, i).toLocaleString('pt-BR', { month: 'long' });
        return { 
          mes: mes.charAt(0).toUpperCase() + mes.slice(1), 
          total: 0,
          realizadas: 0
        };
      });

      data?.forEach(instalacao => {
        const mes = new Date(instalacao.datainicio).getMonth();
        meses[mes].total += 1;
        if (instalacao.realizada === true) {
          meses[mes].realizadas += 1;
        }
      });

      setInstalacoesPorMes(meses);
    } catch (error) {
      console.error('Erro ao buscar instalações:', error);
    }
  };

  const fetchContratosPorMes = async () => {
    try {
      const anoAtual = new Date().getFullYear();
      const { data, error } = await supabase
        .from('contratos')
        .select('data_cad_contrato')
        .gte('data_cad_contrato', `${anoAtual}-01-01`)
        .lte('data_cad_contrato', `${anoAtual}-12-31`);

      if (error) {
        throw error;
      }

      // Agrupa os contratos por mês
      const meses = Array.from({ length: 12 }, (_, i) => {
        const mes = new Date(anoAtual, i).toLocaleString('pt-BR', { month: 'long' });
        return { 
          mes: mes.charAt(0).toUpperCase() + mes.slice(1),
          total: 0
        };
      });

      data?.forEach(contrato => {
        const mes = new Date(contrato.data_cad_contrato).getMonth();
        meses[mes].total += 1;
      });

      setContratosPorMes(meses);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
    }
  };

  const fetchStatusContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('status');

      if (error) {
        throw error;
      }

      // Agrupa os contratos por status
      const statusCount = data.reduce((acc: { [key: string]: number }, curr) => {
        if (curr.status) {
          acc[curr.status] = (acc[curr.status] || 0) + 1;
        }
        return acc;
      }, {});

      // Converte para array e ordena por quantidade
      const statusArray = Object.entries(statusCount)
        .map(([status, total]) => ({ status, total }))
        .sort((a, b) => b.total - a.total);

      setStatusContratos(statusArray);
    } catch (error) {
      console.error('Erro ao buscar status dos contratos:', error);
    }
  };

  const fetchReceitaStats = async () => {
    try {
      console.log('Buscando dados de receita...');
      
      // Primeiro busca as estatísticas de clientes para ter o número correto de ativos
      const clientStats = await fetchClientStats();
      
      // Buscar contratos do mês atual e anterior para calcular crescimento
      const hoje = new Date();
      const primeiroDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const primeiroDiaProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

      const { data: contratosMesAtual, error: erroMesAtual } = await supabase
        .from('contratos')
        .select('count')
        .gte('data_cad_contrato', primeiroDiaMesAtual.toISOString())
        .lt('data_cad_contrato', primeiroDiaProximoMes.toISOString())
        .single();

      const { data: contratosMesAnterior, error: erroMesAnterior } = await supabase
        .from('contratos')
        .select('count')
        .gte('data_cad_contrato', primeiroDiaMesAnterior.toISOString())
        .lt('data_cad_contrato', primeiroDiaMesAtual.toISOString())
        .single();

      const contratosAtual = contratosMesAtual?.count || 0;
      const contratosAnterior = contratosMesAnterior?.count || 0;
      const percentualCrescimento = contratosAnterior > 0 
        ? ((contratosAtual - contratosAnterior) / contratosAnterior) * 100 
        : 0;

      // Buscar dados de receita
      const { data: contratosAtivos, error: contratosError } = await supabase
        .from('contratos')
        .select(`
          id,
          id_plano,
          plano:planos(
            id,
            valor
          )
        `)
        .eq('status', 'Ativo');

      if (contratosError) {
        console.error('Erro na query:', contratosError);
        throw contratosError;
      }

      let receitaTotal = 0;
      const totalContratos = clientStats?.ativos || 0;

      contratosAtivos?.forEach(contrato => {
        if (contrato.plano?.valor) {
          const valorPlano = parseFloat(contrato.plano.valor);
          receitaTotal += valorPlano;
        }
      });

      setReceitaStats({
        receitaMensal: receitaTotal,
        totalContratos,
        mediaContrato: totalContratos > 0 ? receitaTotal / totalContratos : 0,
        crescimentoMensal: {
          atual: contratosAtual,
          anterior: contratosAnterior,
          percentual: percentualCrescimento
        }
      });

      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de receita:', error);
      setLoading(false);
    }
  };

  const fetchReceitaDespesaStats = async () => {
    try {
      const anoAtual = new Date().getFullYear();
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .gte('data_cad_lancamento', `${anoAtual}-01-01`)
        .lte('data_cad_lancamento', `${anoAtual}-12-31`);

      if (error) {
        throw error;
      }

      const meses = Array.from({ length: 12 }, (_, i) => {
        const mes = new Date(anoAtual, i).toLocaleString('pt-BR', { month: 'long' });
        return mes.charAt(0).toUpperCase() + mes.slice(1);
      });

      const receitas = meses.map(() => 0);
      const despesas = meses.map(() => 0);

      data?.forEach(lancamento => {
        const mes = new Date(lancamento.data_cad_lancamento).getMonth();
        if (lancamento.tipopag === 'RECEITA') {
          receitas[mes] += Number(lancamento.entradas || 0);
        } else if (lancamento.tipopag === 'DESPESA') {
          despesas[mes] += Number(lancamento.saidas || 0);
        }
      });

      const totalReceitas = receitas.reduce((a, b) => a + b, 0);
      const totalDespesas = despesas.reduce((a, b) => a + b, 0);
      const saldo = totalReceitas - totalDespesas;

      setReceitaDespesaStats({
        meses,
        receitas,
        despesas,
        totalReceitas,
        totalDespesas,
        saldo
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas de receita e despesa:', error);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-2">
              <ChartBarIcon className="h-8 w-8 text-white dark:text-white mr-2" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent dark:from-yellow-300 dark:to-yellow-500">
                Dashboard
              </h1>
            </div>
            <p className="text-white dark:text-white">
              Visualização de métricas e indicadores de desempenho
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {/* Total Clients Card */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <UsersIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900 dark:text-white">
                      Total de Clientes
                    </h3>
                  </div>
                  <button 
                    onClick={fetchClientStats}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    title="Atualizar"
                  >
                    <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <UsersIcon className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {clientStats.total}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <UsersIcon className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Ativos</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {clientStats.ativos}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <UserMinusIcon className="h-4 w-4 text-red-400 mr-1" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Inativos</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {clientStats.inativos}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <LockClosedIcon className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Bloqueados</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {clientStats.bloqueados}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm">
                  <button
                    onClick={() => navigate('/clientes')}
                    className="font-medium bg-white dark:bg-gray-700 text-indigo-600 hover:text-indigo-500 dark:text-gray-200 dark:hover:text-white transition-colors duration-150 px-4 py-2 rounded-md"
                  >
                    Ver todos os clientes
                  </button>
                </div>
              </div>
            </div>

            {/* Card de Receita */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900 dark:text-white">
                      Perspectiva de Receita
                    </h3>
                  </div>
                  <button 
                    onClick={fetchReceitaStats}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    title="Atualizar"
                  >
                    <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Receita Mensal</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {receitaStats.receitaMensal.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Contratos Ativos</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {receitaStats.totalContratos}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CalculatorIcon className="h-4 w-4 text-purple-500 mr-1" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Média por Contrato</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {receitaStats.mediaContrato.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ArrowTrendingUpIcon className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Crescimento Mensal</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-medium ${
                          receitaStats.crescimentoMensal.percentual > 0 
                            ? 'text-green-500' 
                            : receitaStats.crescimentoMensal.percentual < 0 
                              ? 'text-red-500' 
                              : 'text-gray-500'
                        }`}>
                          {receitaStats.crescimentoMensal.percentual > 0 ? '+' : ''}
                          {receitaStats.crescimentoMensal.percentual.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400">
                          {receitaStats.crescimentoMensal.atual} novos contratos
                          <br />
                          (mês anterior: {receitaStats.crescimentoMensal.anterior})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Instalações por Mês */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900 dark:text-white">
                      Instalações por Mês
                    </h3>
                  </div>
                  <button 
                    onClick={fetchInstalacoesPorMes}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    title="Atualizar"
                  >
                    <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    {instalacoesPorMes.length > 0 && (
                      <Line
                        data={{
                          labels: instalacoesPorMes.map(r => r.mes),
                          datasets: [
                            {
                              label: 'Total de Instalações',
                              data: instalacoesPorMes.map(r => r.total),
                              borderColor: '#3B82F6', // Azul
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              fill: true,
                              tension: 0.4,
                            },
                            {
                              label: 'Instalações Realizadas',
                              data: instalacoesPorMes.map(r => r.realizadas),
                              borderColor: '#10B981', // Verde
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              fill: true,
                              tension: 0.4,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'top',
                              labels: {
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const value = context.raw as number;
                                  const label = context.dataset.label || '';
                                  return `${label}: ${value}`;
                                },
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                              grid: {
                                color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              },
                            },
                            x: {
                              ticks: {
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                              grid: {
                                color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              },
                            },
                          },
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contratos por Mês */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900 dark:text-white">
                      Contratos por Mês
                    </h3>
                  </div>
                  <button 
                    onClick={fetchContratosPorMes}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    title="Atualizar"
                  >
                    <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    {contratosPorMes.length > 0 && (
                      <Line
                        data={{
                          labels: contratosPorMes.map(r => r.mes),
                          datasets: [
                            {
                              label: 'Contratos Criados',
                              data: contratosPorMes.map(r => r.total),
                              borderColor: '#8B5CF6', // Roxo
                              backgroundColor: 'rgba(139, 92, 246, 0.1)',
                              fill: true,
                              tension: 0.4,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'top',
                              labels: {
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const value = context.raw as number;
                                  return `Contratos: ${value}`;
                                },
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                              grid: {
                                color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              },
                            },
                            x: {
                              ticks: {
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                              grid: {
                                color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              },
                            },
                          },
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status dos Contratos */}
          <div className="mt-5">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <ChartPieIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900 dark:text-white">
                      Status dos Contratos
                    </h3>
                  </div>
                  <button 
                    onClick={fetchStatusContratos}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    title="Atualizar"
                  >
                    <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    {statusContratos.length > 0 && (
                      <Pie
                        data={{
                          labels: statusContratos.map(s => s.status),
                          datasets: [
                            {
                              data: statusContratos.map(s => s.total),
                              backgroundColor: [
                                '#10B981', // Verde - Ativo
                                '#EF4444', // Vermelho - Cancelado/Inativo
                                '#F59E0B', // Amarelo - Bloqueado
                                '#3B82F6', // Azul - Agendado
                                '#8B5CF6', // Roxo - Outros
                                '#EC4899', // Rosa
                                '#6366F1', // Indigo
                              ],
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right',
                              labels: {
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const label = context.label || '';
                                  const value = context.raw as number;
                                  const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                                  const percentage = ((value / total) * 100).toFixed(1);
                                  return `${label}: ${value} (${percentage}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Receita e Despesa */}
          <div className="mt-5">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900 dark:text-white">
                      Receita e Despesa
                    </h3>
                  </div>
                  <button 
                    onClick={fetchReceitaDespesaStats}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    title="Atualizar"
                  >
                    <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    {receitaDespesaStats.meses.length > 0 && (
                      <Bar
                        data={{
                          labels: receitaDespesaStats.meses,
                          datasets: [
                            {
                              label: 'Receita',
                              data: receitaDespesaStats.receitas,
                              backgroundColor: 'rgba(16, 185, 129, 0.7)', // Verde
                              borderColor: 'rgb(16, 185, 129)',
                              borderWidth: 1,
                            },
                            {
                              label: 'Despesa',
                              data: receitaDespesaStats.despesas,
                              backgroundColor: 'rgba(239, 68, 68, 0.7)', // Vermelho
                              borderColor: 'rgb(239, 68, 68)',
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'top',
                              labels: {
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const value = context.raw as number;
                                  const label = context.dataset.label || '';
                                  return `${label}: ${value.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  })}`;
                                },
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: (value) => {
                                  return `R$ ${Number(value).toLocaleString('pt-BR')}`;
                                },
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                              grid: {
                                color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              },
                            },
                            x: {
                              ticks: {
                                color: document.documentElement.classList.contains('dark') ? 'white' : 'black',
                              },
                              grid: {
                                color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              },
                            },
                          },
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Resumo de Receitas e Despesas */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total de Receitas</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {receitaDespesaStats.totalReceitas.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total de Despesas</div>
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    {receitaDespesaStats.totalDespesas.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </div>
                
                <div className={`${
                  receitaDespesaStats.saldo >= 0 
                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                    : 'bg-yellow-50 dark:bg-yellow-900/20'
                } p-4 rounded-lg`}>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Saldo</div>
                  <div className={`text-xl font-bold ${
                    receitaDespesaStats.saldo >= 0 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {receitaDespesaStats.saldo.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
