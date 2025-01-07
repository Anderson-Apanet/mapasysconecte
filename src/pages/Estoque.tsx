import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface Material {
  id: number;
  nome: string;
  tipo: string;
  modelo: string;
  marca: string;
  quantidade: number;
  etiqueta: string;
  observacoes: string;
  created_at: string;
}

const Estoque: React.FC = () => {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    modelo: '',
    marca: '',
    quantidade: 0,
    etiqueta: '',
    observacoes: ''
  });

  // Buscar materiais
  const fetchMateriais = async () => {
    try {
      const { data, error } = await supabase
        .from('materiais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMateriais(data || []);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      toast.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMateriais();
  }, []);

  // Funções do CRUD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        const { error } = await supabase
          .from('materiais')
          .update(formData)
          .eq('id', editingMaterial.id);

        if (error) throw error;
        toast.success('Material atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('materiais')
          .insert([formData]);

        if (error) throw error;
        toast.success('Material cadastrado com sucesso!');
      }

      setModalOpen(false);
      setEditingMaterial(null);
      resetForm();
      fetchMateriais();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      toast.error('Erro ao salvar material');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este material?')) {
      try {
        const { error } = await supabase
          .from('materiais')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Material excluído com sucesso!');
        fetchMateriais();
      } catch (error) {
        console.error('Erro ao excluir material:', error);
        toast.error('Erro ao excluir material');
      }
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      nome: material.nome,
      tipo: material.tipo,
      modelo: material.modelo,
      marca: material.marca,
      quantidade: material.quantidade,
      etiqueta: material.etiqueta,
      observacoes: material.observacoes
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: '',
      modelo: '',
      marca: '',
      quantidade: 0,
      etiqueta: '',
      observacoes: ''
    });
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Gestão de Estoque
            </h1>
            <button
              onClick={() => {
                resetForm();
                setEditingMaterial(null);
                setModalOpen(true);
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Novo Material
            </button>
          </div>

          {/* Tabela de Materiais */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Modelo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Marca
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Etiqueta
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {materiais.map((material) => (
                    <tr key={material.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {material.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {material.tipo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {material.modelo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {material.marca}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {material.quantidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center">
                          <TagIcon className="h-5 w-5 mr-2 text-blue-500" />
                          {material.etiqueta}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(material)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal de Cadastro/Edição */}
          {modalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                  {editingMaterial ? 'Editar Material' : 'Novo Material'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo
                      </label>
                      <select
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        <option value="">Selecione um tipo</option>
                        <option value="Roteador">Roteador</option>
                        <option value="ONU">ONU</option>
                        <option value="Cabo">Cabo</option>
                        <option value="Switch">Switch</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        value={formData.modelo}
                        onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={formData.marca}
                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        value={formData.quantidade}
                        onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        required
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Etiqueta
                      </label>
                      <input
                        type="text"
                        value={formData.etiqueta}
                        onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Observações
                    </label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      {editingMaterial ? 'Atualizar' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Estoque;
