import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/utils/supabaseClient';
import { MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Bairro {
  id: number;
  cidade: string | null;
  nome: string | null;
}

export default function Bairros() {
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBairro, setEditingBairro] = useState<Bairro | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cidade: ''
  });

  // Buscar bairros
  const fetchBairros = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bairros')
        .select('*')
        .order('nome');

      if (error) throw error;
      setBairros(data || []);
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      toast.error('Erro ao carregar bairros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBairros();
  }, []);

  // Filtrar bairros
  const filteredBairros = bairros.filter(bairro =>
    bairro.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bairro.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Funções do modal
  const handleOpenModal = (bairro?: Bairro) => {
    if (bairro) {
      setEditingBairro(bairro);
      setFormData({
        nome: bairro.nome || '',
        cidade: bairro.cidade || ''
      });
    } else {
      setEditingBairro(null);
      setFormData({ nome: '', cidade: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBairro) {
        const { error } = await supabase
          .from('bairros')
          .update({
            nome: formData.nome,
            cidade: formData.cidade
          })
          .eq('id', editingBairro.id);

        if (error) throw error;
        toast.success('Bairro atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('bairros')
          .insert([{
            nome: formData.nome,
            cidade: formData.cidade
          }]);

        if (error) throw error;
        toast.success('Bairro criado com sucesso!');
      }

      setIsModalOpen(false);
      fetchBairros();
    } catch (error) {
      console.error('Erro ao salvar bairro:', error);
      toast.error('Erro ao salvar bairro');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <MapPinIcon className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-2" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
              Gerenciar Bairros
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie os bairros disponíveis no sistema
          </p>
        </div>

        {/* Controles */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar bairros..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Adicionar Bairro
            </button>
          </div>
        </div>

        {/* Lista de Bairros */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Cidade
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Carregando bairros...
                    </td>
                  </tr>
                ) : filteredBairros.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhum bairro encontrado
                    </td>
                  </tr>
                ) : (
                  filteredBairros.map((bairro) => (
                    <tr key={bairro.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {bairro.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {bairro.cidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleOpenModal(bairro)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Adicionar/Editar */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingBairro ? 'Editar Bairro' : 'Novo Bairro'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {editingBairro ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
