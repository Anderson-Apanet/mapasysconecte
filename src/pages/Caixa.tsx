import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NovoLancamentoModal from '../components/NovoLancamentoModal';
import GerenciamentoCaixa from '../components/GerenciamentoCaixa';
import VisualizarLancamentoModal from '../components/VisualizarLancamentoModal';
import {
  TRANSACTION_TYPES,
  CATEGORIES,
  Lancamento,
  CaixaStatus
} from '../types/financeiro';

export default function Caixa() {
  // Estados para controle de lançamentos
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null);
  const [caixaStatus, setCaixaStatus] = useState<CaixaStatus>({
    isOpen: false,
    caixaAtual: null
  });

  // Handler para mudança de status do caixa
  const handleCaixaStatusChange = (status: CaixaStatus) => {
    setCaixaStatus(status);
  };

  // Funções de cálculo de totais
  const calcularTotais = (lancamentos: Lancamento[]) => {
    return lancamentos.reduce(
      (acc, lancamento) => {
        // Soma apenas os lançamentos do tipo receita
        if (lancamento.tipopag === 'RECEITA') {
          acc.totalReceitas += Number(lancamento.total || 0);
        }
        // Soma apenas os lançamentos do tipo despesa
        if (lancamento.tipopag === 'DESPESA') {
          acc.totalDespesas += Number(lancamento.total || 0);
        }
        acc.saldoDia = acc.totalReceitas - acc.totalDespesas;
        return acc;
      },
      { saldoDia: 0, totalReceitas: 0, totalDespesas: 0 }
    );
  };

  // Função para buscar lançamentos
  const fetchLancamentos = async () => {
    try {
      setLoading(true);
      const startOfDayDate = startOfDay(selectedDate);
      const endOfDayDate = endOfDay(selectedDate);
      
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .gte('data_cad_lancamento', format(startOfDayDate, 'yyyy-MM-dd HH:mm:ss'))
        .lte('data_cad_lancamento', format(endOfDayDate, 'yyyy-MM-dd HH:mm:ss'))
        .order('data_cad_lancamento', { ascending: false });

      if (error) throw error;

      // Formata os dados recebidos
      const formattedData = (data || []).map(lancamento => ({
        ...lancamento,
        tipo: lancamento.tipo || 'receita', // Define 'receita' como padrão se não houver tipo
        total: Number(lancamento.total || 0),
        saidas: Number(lancamento.saidas || 0)
      }));

      setLancamentos(formattedData);
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      toast.error('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar lançamentos quando a data mudar
  useEffect(() => {
    fetchLancamentos();
  }, [selectedDate]);

  // Função para mudar a data
  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate(current => 
      direction === 'prev' ? subDays(current, 1) : addDays(current, 1)
    );
  };

  // Função para deletar lançamento
  const handleDeleteLancamento = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('lancamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lançamento excluído com sucesso!');
      fetchLancamentos();
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      toast.error('Erro ao excluir lançamento');
    } finally {
      setLoading(false);
    }
  };

  // Handler para visualizar lançamento
  const handleVisualizarLancamento = (lancamento: Lancamento) => {
    setSelectedLancamento(lancamento);
    setIsVisualizarModalOpen(true);
  };

  // Cálculo dos totais
  const { saldoDia, totalReceitas, totalDespesas } = calcularTotais(lancamentos);

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
        <div className="container mx-auto px-4 py-8">
          {/* Cabeçalho */}
          <div className="mb-8">
            <div className="flex items-center mb-2">
              <BanknotesIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-2" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
                Caixa
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie os lançamentos diários de receitas e despesas
            </p>
          </div>

          {/* Componente de Gerenciamento do Caixa */}
          <GerenciamentoCaixa onStatusChange={handleCaixaStatusChange} />

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Saldo do Dia */}
            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Saldo do Dia</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoDia)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <BanknotesIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                </div>
              </div>
            </div>

            {/* Total Receitas */}
            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Receitas</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceitas)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
              </div>
            </div>

            {/* Total Despesas */}
            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Despesas</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <ArrowTrendingDownIcon className="h-6 w-6 text-red-600 dark:text-red-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Ferramentas */}
          <div className="mb-6 bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                {/* Campo de Busca */}
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Buscar lançamentos..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder-gray-600 dark:placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>

                {/* Filtro de Data */}
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <input
                    type="date"
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setSelectedDate(new Date(e.target.value));
                    }}
                  />
                </div>

                {/* Filtro de Tipo */}
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <select
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value as 'todos' | 'receita' | 'despesa')}
                  >
                    <option value="todos" className="bg-white dark:bg-gray-700">Todos</option>
                    <option value="receita" className="bg-white dark:bg-gray-700">Receitas</option>
                    <option value="despesa" className="bg-white dark:bg-gray-700">Despesas</option>
                  </select>
                </div>
              </div>

              {/* Botão Novo Lançamento */}
              <button
                onClick={() => {
                  if (!caixaStatus.isOpen) {
                    toast.error('Abra o caixa antes de fazer novos lançamentos!');
                    return;
                  }
                  setIsModalOpen(true);
                }}
                className="ml-4 inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!caixaStatus.isOpen}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Lançamento
              </button>
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.24)] backdrop-blur-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transações Recentes</h3>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleDateChange('prev')}
                    className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
                  >
                    ← Dia anterior
                  </button>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {format(selectedDate, 'dd/MM/yyyy')}
                  </span>
                  <button 
                    onClick={() => handleDateChange('next')}
                    className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
                  >
                    Próximo dia →
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Formas Pgto.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                        </div>
                      </td>
                    </tr>
                  ) : lancamentos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                        Nenhum lançamento encontrado
                      </td>
                    </tr>
                  ) : (
                    lancamentos.map((lancamento) => (
                      <tr
                        key={lancamento.id}
                        onClick={() => handleVisualizarLancamento(lancamento)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {lancamento.data_cad_lancamento ? format(new Date(lancamento.data_cad_lancamento), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          <div className="relative group">
                            <span className="inline-block max-w-xs truncate">
                              {lancamento.descricao?.length > 30 
                                ? lancamento.descricao.substring(0, 30) + '...' 
                                : lancamento.descricao}
                            </span>
                            {lancamento.descricao?.length > 30 && (
                              <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-sm rounded-lg py-2 px-3 -mt-1 left-0">
                                {lancamento.descricao}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.total || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          <div className="space-y-1">
                            {lancamento.entrada_pixsicredi > 0 && (
                              <div>PIX Sicredi: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.entrada_pixsicredi)}</div>
                            )}
                            {lancamento.entrada_pixbradesco > 0 && (
                              <div>PIX Bradesco: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.entrada_pixbradesco)}</div>
                            )}
                            {lancamento.entrada_cartaocredito > 0 && (
                              <div>Cartão Crédito: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.entrada_cartaocredito)}</div>
                            )}
                            {lancamento.entrada_cartaodebito > 0 && (
                              <div>Cartão Débito: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.entrada_cartaodebito)}</div>
                            )}
                            {lancamento.entrada_dinheiro > 0 && (
                              <div>Dinheiro: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.entrada_dinheiro)}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {lancamento.tipopag}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Novo Lançamento */}
      {isModalOpen && (
        <NovoLancamentoModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedLancamento(null);
          }}
          onSave={() => {
            setIsModalOpen(false);
            setSelectedLancamento(null);
            fetchLancamentos();
          }}
          lancamentoToEdit={selectedLancamento}
          caixaStatus={caixaStatus}
        />
      )}

      {/* Modal de Visualizar Lançamento */}
      {isVisualizarModalOpen && (
        <VisualizarLancamentoModal
          isOpen={isVisualizarModalOpen}
          onClose={() => {
            setIsVisualizarModalOpen(false);
            setSelectedLancamento(null);
          }}
          lancamento={selectedLancamento}
        />
      )}
    </Layout>
  );
}
