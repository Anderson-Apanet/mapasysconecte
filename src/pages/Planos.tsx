import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { getRadiusGroups } from '../services/radiusService';
import EmpresaBackground from '../components/EmpresaBackground';
import useAuth from '../hooks/useAuth';

interface Plano {
  id: number;
  ativo: boolean | null;
  nome: string | null;
  radius: string | null;
  valor: number | null;
  creation_date: string | null;
  empresa_id: number | null;
}

export default function Planos() {
  const { userData } = useAuth();
  const empresaId = userData?.empresa_id;
  
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    radius: '',
    valor: '',
    ativo: true
  });
  const [openNewModal, setOpenNewModal] = useState(false);
  const [newPlano, setNewPlano] = useState<Plano>({
    nome: '',
    valor: '',
    radius: '',
    ativo: true,
    empresa_id: empresaId
  });
  const velocidades = ['100M', '200M', '300M', '400M', '500M', '600M', '700M', '800M', '1GB'];

  const handleNewPlanoChange = (field: keyof Plano, value: any) => {
    setNewPlano(prev => ({ ...prev, [field]: value }));
  };

  const handleCreatePlano = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Buscar o maior ID atual
      const { data: maxIdResult } = await supabase
        .from('planos')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      const nextId = maxIdResult && maxIdResult.length > 0 
        ? Number(maxIdResult[0].id) + 1 
        : 1;

      // Validar campos obrigatórios
      if (!newPlano.nome || !newPlano.valor || !newPlano.radius) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      // Obter a data atual no formato ISO (YYYY-MM-DD)
      const currentDate = new Date().toISOString().split('T')[0];

      // Preparar dados com ID
      const planoData = {
        id: nextId,
        ...newPlano,
        valor: Number(newPlano.valor.replace(/\D/g, '')) / 100,
        empresa_id: empresaId, // Adiciona o ID da empresa atual
        creation_date: currentDate // Adiciona a data atual
      };

      console.log('Criando plano:', planoData);

      const { data, error } = await supabase
        .from('planos')
        .insert([planoData])
        .select();

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      toast.success('Plano criado com sucesso!');
      setOpenNewModal(false);
      fetchPlanos();
      setNewPlano({ nome: '', valor: '', radius: '', ativo: true, empresa_id: empresaId });
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast.error('Erro ao criar plano');
    }
  };

  // Carregar planos do Supabase
  useEffect(() => {
    fetchPlanos();
  }, []);

  const fetchPlanos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('nome');

      if (error) {
        throw error;
      }

      if (data) {
        // Log para debug
        data.forEach(plano => {
          console.log('Plano:', {
            nome: plano.nome,
            ativo: plano.ativo,
            tipoAtivo: typeof plano.ativo,
            valorAtivo: Boolean(plano.ativo)
          });
        });
        setPlanos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlanos = planos.filter((plano) => {
    const matchesSearch = (plano.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plano.radius?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'todos' ? true :
      statusFilter === 'ativo' ? plano.ativo === true :
      statusFilter === 'inativo' ? plano.ativo === false : true;

    return matchesSearch && matchesStatus;
  });

  // Paginação
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredPlanos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPlanos.length / ITEMS_PER_PAGE);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleEdit = (plano: Plano) => {
    setSelectedPlano(plano);
    // Formata o valor inicial usando a mesma função de formatação
    const initialValue = plano.valor ? formatCurrency(String(plano.valor * 100)) : '';
    setEditForm({
      nome: plano.nome || '',
      radius: plano.radius || '',
      valor: initialValue,
      ativo: plano.ativo || false
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlano) return;

    try {
      const { error } = await supabase
        .from('planos')
        .update({
          nome: editForm.nome,
          radius: editForm.radius,
          valor: parseFloat(editForm.valor.replace(/\D/g, '')) / 100,
          ativo: editForm.ativo
        })
        .eq('id', selectedPlano.id);

      if (error) throw error;

      toast.success('Plano atualizado com sucesso!');
      setIsEditModalOpen(false);
      fetchPlanos();
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast.error('Erro ao atualizar plano');
    }
  };

  const handleEditValorChange = (value: string) => {
    // Remove formatação atual
    const plainNumber = value.replace(/\D/g, '');
    
    // Se não houver números, define como vazio
    if (!plainNumber) {
      setEditForm(prev => ({ ...prev, valor: '' }));
      return;
    }
    
    // Formata o valor
    const formattedValue = formatCurrency(plainNumber);
    
    // Atualiza o estado com o valor formatado
    setEditForm(prev => ({ ...prev, valor: formattedValue }));
  };

  const formatCurrency = (value: string): string => {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '');
    
    // Converte para número e divide por 100 para considerar os centavos
    const amount = parseFloat(numbers) / 100;
    
    // Formata o número com pontuação de milhar e decimal
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleValorChange = (value: string) => {
    // Remove formatação atual
    const plainNumber = value.replace(/\D/g, '');
    
    // Se não houver números, define como vazio
    if (!plainNumber) {
      handleNewPlanoChange('valor', '');
      return;
    }
    
    // Formata o valor
    const formattedValue = formatCurrency(plainNumber);
    
    // Atualiza o estado com o valor formatado
    handleNewPlanoChange('valor', formattedValue);
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent dark:from-yellow-300 dark:to-yellow-500">
                  Planos
                </h1>
              </div>
              <p className="text-white dark:text-white">
                Gerenciamento de planos
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-1 gap-4 w-full sm:w-auto">
                  {/* Campo de Busca */}
                  <div className="flex-1 max-w-md">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Buscar planos
                    </label>
                    <input
                      type="text"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      placeholder="Digite para buscar..."
                    />
                  </div>

                  {/* Filtro de Status */}
                  <div className="w-40">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    >
                      <option value="todos">Todos</option>
                      <option value="ativo">Ativos</option>
                      <option value="inativo">Inativos</option>
                    </select>
                  </div>
                </div>

                {/* Botão Adicionar */}
                <div className="w-full sm:w-auto">
                  <label className="block text-sm font-medium text-transparent dark:text-transparent mb-1">
                    Ações
                  </label>
                  <button
                    onClick={() => setOpenNewModal(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Adicionar Plano
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-700/20 border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">Carregando planos...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Nome
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Radius
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Valor
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Ativo
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Data Criação
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                      {currentItems.map((plano) => (
                        <tr key={plano.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {plano.nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {plano.radius}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {plano.valor ? `R$ ${Number(plano.valor).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              plano.ativo
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}>
                              {plano.ativo ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {plano.creation_date ? new Date(plano.creation_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEdit(plano)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Paginação */}
            <div className="flex justify-between items-center mt-4 pb-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> até{' '}
                <span className="font-medium">
                  {Math.min(indexOfLastItem, filteredPlanos.length)}
                </span>{' '}
                de <span className="font-medium">{filteredPlanos.length}</span> registros
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  }`}
                >
                  Primeiro
                </button>

                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  }`}
                >
                  Anterior
                </button>

                <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  }`}
                >
                  Próximo
                </button>

                <button
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  }`}
                >
                  Último
                </button>
              </div>
            </div>
          </div>

          {/* Modal de Edição */}
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Editar Plano
                  </h2>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={editForm.nome}
                      onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Radius
                    </label>
                    <select
                      value={editForm.radius}
                      onChange={(e) => setEditForm({ ...editForm, radius: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Selecione um grupo</option>
                      {velocidades.map((vel) => (
                        <option key={vel} value={vel}>
                          {vel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valor
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editForm.valor}
                      onChange={(e) => handleEditValorChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.ativo}
                      onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Ativo
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal para Novo Plano */}
          {openNewModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Novo Plano
                  </h2>
                  <button
                    onClick={() => setOpenNewModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreatePlano} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={newPlano.nome}
                      onChange={(e) => handleNewPlanoChange('nome', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Radius
                    </label>
                    <select
                      value={newPlano.radius}
                      onChange={(e) => handleNewPlanoChange('radius', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Selecione um grupo</option>
                      {velocidades.map((vel) => (
                        <option key={vel} value={vel}>
                          {vel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valor
                    </label>
                    <input
                      type="text"
                      value={newPlano.valor}
                      onChange={(e) => handleValorChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newPlano.ativo}
                      onChange={(e) => handleNewPlanoChange('ativo', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Ativo
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setOpenNewModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Criar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </EmpresaBackground>
    </Layout>
  );
}
