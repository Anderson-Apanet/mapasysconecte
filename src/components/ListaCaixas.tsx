import React, { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../utils/supabaseClient';
import { Caixa } from '../types/caixa';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid';

interface CaixaWithUser extends Caixa {
  users: {
    nome: string;
  };
  lancamentos: {
    total: number;
    tipopag: string;
    data_cad_lancamento: string;
  }[];
  saldo: {
    receitas: number;
    despesas: number;
  }[];
}

const ListaCaixas: React.FC = () => {
  const [caixas, setCaixas] = useState<CaixaWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    fetchCaixas();
  }, [selectedDate]);

  const fetchCaixas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Usuário não autenticado');
        return;
      }

      let query = supabase
        .from('caixas')
        .select(`
          *,
          users:id_usuario (
            nome
          ),
          lancamentos (
            total,
            tipopag,
            data_cad_lancamento
          )
        `)
        .order('horario_abertura', { ascending: false });

      // Aplica o filtro de data apenas se uma data estiver selecionada
      if (selectedDate) {
        const start = startOfDay(parseISO(selectedDate)).toISOString();
        const end = endOfDay(parseISO(selectedDate)).toISOString();
        query = query.gte('horario_abertura', start).lte('horario_abertura', end);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calcular o saldo para cada caixa
      const caixasComSaldo = data?.map(caixa => {
        const lancamentos = caixa.lancamentos || [];
        const receitas = lancamentos
          .filter(l => l.tipopag === 'RECEITA')
          .reduce((sum, l) => sum + (l.total || 0), 0);
        const despesas = lancamentos
          .filter(l => l.tipopag === 'DESPESA')
          .reduce((sum, l) => sum + (l.total || 0), 0);
        
        return {
          ...caixa,
          saldo: [{ receitas, despesas }]
        };
      }) || [];

      setCaixas(caixasComSaldo);
    } catch (error) {
      console.error('Erro ao buscar caixas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Histórico de Caixas
        </h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="date-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtrar por data:
          </label>
          <input
            id="date-filter"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              Limpar filtro
            </button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Abertura
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Fechamento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Operador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {caixas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum caixa encontrado {selectedDate ? 'para esta data' : ''}
                </td>
              </tr>
            ) : (
              caixas.map((caixa) => {
                const saldoTotal = caixa.saldo?.[0]?.receitas - caixa.saldo?.[0]?.despesas;

                return (
                  <tr key={caixa.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {caixa.horario_fechamento ? (
                          <LockClosedIcon className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
                        ) : (
                          <LockOpenIcon className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                        )}
                        <span className={`text-sm font-medium ${
                          caixa.horario_fechamento 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {caixa.horario_fechamento ? 'Fechado' : 'Aberto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDateTime(caixa.horario_abertura)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {caixa.horario_fechamento 
                        ? formatDateTime(caixa.horario_fechamento)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {caixa.users?.nome || 'Usuário não encontrado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`${
                        saldoTotal >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(saldoTotal || 0)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaCaixas;
