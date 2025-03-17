import React, { useState, useEffect } from 'react';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { supabase } from '../utils/supabaseClient';
import { Caixa } from '../types/caixa';
import { LockClosedIcon, LockOpenIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface CaixaWithUser extends Caixa {
  users: {
    nome: string;
  };
  lancamentos: {
    id: number;
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
  const [filteredCaixas, setFilteredCaixas] = useState<CaixaWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCaixa, setSelectedCaixa] = useState<CaixaWithUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchCaixas();
  }, [selectedDate]);

  useEffect(() => {
    // Aplicar filtros e atualizar a lista filtrada
    let filtered = [...caixas];
    
    if (statusFilter === 'aberto') {
      filtered = filtered.filter(caixa => !caixa.horario_fechamento);
    } else if (statusFilter === 'fechado') {
      filtered = filtered.filter(caixa => !!caixa.horario_fechamento);
    }
    
    setFilteredCaixas(filtered);
    setCurrentPage(1); // Resetar para a primeira página ao mudar filtros
  }, [caixas, statusFilter]);

  // Função para converter a data formatada para o formato ISO
  const parseFormattedDate = (formattedDate: string) => {
    if (!formattedDate) return '';
    const parts = formattedDate.split('/');
    if (parts.length !== 3) return '';
    
    // Validar se as partes são números válidos
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Verificar se a data é válida
    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    if (day < 1 || day > 31) return '';
    if (month < 1 || month > 12) return '';
    if (year < 1900 || year > 2100) return '';
    
    // Formato: ano-mes-dia
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  };

  // Função para aplicar máscara de data (dd/mm/yyyy)
  const applyDateMask = (value: string) => {
    // Remove tudo que não é número
    let onlyNumbers = value.replace(/\D/g, '');
    
    // Limita a 8 dígitos (ddmmyyyy)
    if (onlyNumbers.length > 8) {
      onlyNumbers = onlyNumbers.substring(0, 8);
    }
    
    // Aplica a máscara
    let maskedValue = '';
    
    if (onlyNumbers.length > 0) {
      // Adiciona o dia
      maskedValue = onlyNumbers.substring(0, Math.min(2, onlyNumbers.length));
      
      // Adiciona a primeira barra e o mês
      if (onlyNumbers.length > 2) {
        maskedValue += '/' + onlyNumbers.substring(2, Math.min(4, onlyNumbers.length));
        
        // Adiciona a segunda barra e o ano
        if (onlyNumbers.length > 4) {
          maskedValue += '/' + onlyNumbers.substring(4, 8);
        }
      }
    }
    
    return maskedValue;
  };

  // Handler para quando o usuário digita uma data
  const handleFormattedDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maskedValue = applyDateMask(value);
    setFormattedDate(maskedValue);
    
    // Verifica se a data está no formato correto (dd/mm/yyyy)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (dateRegex.test(maskedValue)) {
      const isoDate = parseFormattedDate(maskedValue);
      if (isoDate) {
        setSelectedDate(isoDate);
      }
    } else if (maskedValue === '') {
      setSelectedDate('');
    }
  };

  // Handler para quando o usuário seleciona uma data no datepicker
  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedDate(value);
      
      // Converter para o formato dd/mm/yyyy para exibição
      try {
        const date = parseISO(value);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        setFormattedDate(`${day}/${month}/${year}`);
      } catch (error) {
        console.error('Erro ao formatar data:', error);
      }
    } else {
      setSelectedDate('');
      setFormattedDate('');
    }
    
    setShowDatePicker(false);
  };

  // Limpar o filtro de data
  const clearDateFilter = () => {
    setSelectedDate('');
    setFormattedDate('');
  };

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
            id,
            total,
            tipopag,
            data_cad_lancamento
          )
        `)
        .order('horario_abertura', { ascending: false });

      // Aplica o filtro de data apenas se uma data estiver selecionada
      if (selectedDate) {
        try {
          const date = parseISO(selectedDate);
          const start = startOfDay(date).toISOString();
          const end = endOfDay(date).toISOString();
          
          query = query.gte('horario_abertura', start).lte('horario_abertura', end);
        } catch (error) {
          console.error('Erro ao processar data:', error);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calcular o saldo para cada caixa
      const caixasComSaldo = data?.map(caixa => {
        const lancamentos = caixa.lancamentos || [];
        const receitas = lancamentos
          .filter((l: any) => l.tipopag === 'RECEITA')
          .reduce((sum: number, l: any) => sum + (l.total || 0), 0);
        const despesas = lancamentos
          .filter((l: any) => l.tipopag === 'DESPESA')
          .reduce((sum: number, l: any) => sum + (l.total || 0), 0);
        
        return {
          ...caixa,
          saldo: [{ receitas, despesas }]
        };
      }) || [];

      setCaixas(caixasComSaldo);
      setFilteredCaixas(caixasComSaldo);
    } catch (error) {
      console.error('Erro ao buscar caixas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: string) => {
    const dateObj = new Date(date);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };
  
  const handleCaixaClick = (caixa: CaixaWithUser) => {
    setSelectedCaixa(caixa);
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setSelectedCaixa(null);
  };
  
  // Cálculo para paginação
  const totalPages = Math.ceil(filteredCaixas.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCaixas.slice(indexOfFirstItem, indexOfLastItem);
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Histórico de Caixas
        </h2>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="todos">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="date-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Data:
            </label>
            <div className="relative">
              <input
                id="date-filter"
                type="text"
                placeholder="dd/mm/yyyy"
                value={formattedDate}
                onChange={handleFormattedDateChange}
                onClick={() => setShowDatePicker(true)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              {showDatePicker && (
                <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 border border-gray-200 dark:border-gray-700">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDatePickerChange}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              )}
            </div>
            {formattedDate && (
              <button
                onClick={clearDateFilter}
                className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                Limpar
              </button>
            )}
          </div>
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
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum caixa encontrado {selectedDate ? 'para esta data' : ''}
                </td>
              </tr>
            ) : (
              currentItems.map((caixa) => {
                const saldoTotal = caixa.saldo?.[0]?.receitas - caixa.saldo?.[0]?.despesas;

                return (
                  <tr 
                    key={caixa.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => handleCaixaClick(caixa)}
                  >
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
                        {formatCurrency(saldoTotal || 0)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginação */}
      {filteredCaixas.length > 0 && (
        <div className="flex justify-between items-center mt-4 px-2">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">
              {Math.min(indexOfLastItem, filteredCaixas.length)}
            </span> de <span className="font-medium">{filteredCaixas.length}</span> resultados
          </div>
          <nav className="flex space-x-1">
            <button
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`px-3 py-1 rounded-md ${
                  currentPage === number
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {number}
              </button>
            ))}
            <button
              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md ${
                currentPage === totalPages
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Próxima
            </button>
          </nav>
        </div>
      )}
      
      {/* Modal de detalhes do caixa */}
      {showModal && selectedCaixa && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Detalhes do Caixa - {formatDateTime(selectedCaixa.horario_abertura)}
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    onClick={closeModal}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status:</p>
                      <p className={`text-sm font-medium ${
                        selectedCaixa.horario_fechamento 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {selectedCaixa.horario_fechamento ? 'Fechado' : 'Aberto'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Operador:</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedCaixa.users?.nome || 'Usuário não encontrado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Abertura:</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDateTime(selectedCaixa.horario_abertura)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Fechamento:</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedCaixa.horario_fechamento 
                          ? formatDateTime(selectedCaixa.horario_fechamento)
                          : '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receitas:</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedCaixa.saldo?.[0]?.receitas || 0)}
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Despesas:</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(selectedCaixa.saldo?.[0]?.despesas || 0)}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Saldo:</p>
                      <p className={`text-lg font-semibold ${
                        (selectedCaixa.saldo?.[0]?.receitas - selectedCaixa.saldo?.[0]?.despesas) >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency((selectedCaixa.saldo?.[0]?.receitas || 0) - (selectedCaixa.saldo?.[0]?.despesas || 0))}
                      </p>
                    </div>
                  </div>
                  
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Lançamentos
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Data/Hora
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedCaixa.lancamentos && selectedCaixa.lancamentos.length > 0 ? (
                          selectedCaixa.lancamentos.map((lancamento) => (
                            <tr key={lancamento.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  lancamento.tipopag === 'RECEITA'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {lancamento.tipopag}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {formatDateTime(lancamento.data_cad_lancamento)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                {lancamento.id}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                <span className={`${
                                  lancamento.tipopag === 'RECEITA'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {formatCurrency(lancamento.total || 0)}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                              Nenhum lançamento encontrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeModal}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaCaixas;
