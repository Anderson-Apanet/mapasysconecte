import React, { useState, useEffect } from 'react';
import { TruckIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

interface Veiculo {
  id: number;
  marca: string;
  placa: string;
  created_at: string;
}

interface VeiculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  veiculo?: Veiculo;
  onSave: () => void;
}

const VeiculoModal: React.FC<VeiculoModalProps> = ({ isOpen, onClose, veiculo, onSave }) => {
  const [marca, setMarca] = useState(veiculo?.marca || '');
  const [placa, setPlaca] = useState(veiculo?.placa || '');

  useEffect(() => {
    if (veiculo) {
      setMarca(veiculo.marca);
      setPlaca(veiculo.placa);
    } else {
      setMarca('');
      setPlaca('');
    }
  }, [veiculo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (veiculo?.id) {
        const { error } = await supabase
          .from('veiculos')
          .update({ marca, placa })
          .eq('id', veiculo.id);

        if (error) throw error;
        toast.success('Veículo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('veiculos')
          .insert([{ marca, placa }]);

        if (error) throw error;
        toast.success('Veículo cadastrado com sucesso!');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      toast.error('Erro ao salvar veículo');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {veiculo ? 'Editar Veículo' : 'Novo Veículo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <span className="sr-only">Fechar</span>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="marca" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Marca/Modelo
            </label>
            <input
              type="text"
              id="marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="placa" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Placa
            </label>
            <input
              type="text"
              id="placa"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Veiculos: React.FC = () => {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchVeiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVeiculos(data || []);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVeiculos();
  }, []);

  const handleEdit = (veiculo: Veiculo) => {
    setSelectedVeiculo(veiculo);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
      try {
        const { error } = await supabase
          .from('veiculos')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Veículo excluído com sucesso!');
        fetchVeiculos();
      } catch (error) {
        console.error('Erro ao excluir veículo:', error);
        toast.error('Erro ao excluir veículo');
      }
    }
  };

  const handleAddNew = () => {
    setSelectedVeiculo(undefined);
    setIsModalOpen(true);
  };

  return (
    <Layout>
      <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-2">
            <TruckIcon className="h-8 w-8 text-green-600 dark:text-green-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Veículos
            </h1>
          </div>
          <p className="mt-2 mb-8 text-sm text-gray-600 dark:text-gray-400">
            Gerencie os veículos da empresa
          </p>

          {/* Card de Ação */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Adicionar Novo Veículo
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cadastre um novo veículo no sistema
                </p>
              </div>
              <button
                onClick={handleAddNew}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Veículo
              </button>
            </div>
          </div>

          {/* Card da Lista */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Lista de Veículos
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Visualize e gerencie todos os veículos cadastrados
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Marca/Modelo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Placa
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Data de Cadastro
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex justify-center items-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 dark:border-green-500"></div>
                          <span>Carregando...</span>
                        </div>
                      </td>
                    </tr>
                  ) : veiculos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4">
                        <div className="text-center">
                          <TruckIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Nenhum veículo cadastrado
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Comece cadastrando um novo veículo.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    veiculos.map((veiculo) => (
                      <tr key={veiculo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {veiculo.marca}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {veiculo.placa}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(veiculo.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => handleEdit(veiculo)}
                              className="text-green-600 hover:text-green-900 dark:text-green-500 dark:hover:text-green-400 transition-colors duration-200"
                              title="Editar"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(veiculo.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                              title="Excluir"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal de Veículo */}
        <VeiculoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          veiculo={selectedVeiculo}
          onSave={fetchVeiculos}
        />
      </div>
    </Layout>
  );
};

export default Veiculos;
