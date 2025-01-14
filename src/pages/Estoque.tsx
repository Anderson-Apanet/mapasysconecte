import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Material {
  id: number;
  nome: string;
  tipo: string;
  id_modelo: number;
  etiqueta: string;
  serial: string;
  observacoes: string;
  created_at: string;
  modelo?: ModeloMaterial; // Relacionamento com o modelo
}

interface ModeloMaterial {
  id: number;
  nome: string;
  marca: string;
  created_at: string;
}

const Estoque: React.FC = () => {
  const navigate = useNavigate();
  const tiposMaterial = [
    'Roteador',
    'Onu',
    'Cabo',
    'Switch',
    'Outros'
  ];

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [modelos, setModelos] = useState<ModeloMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modeloModalOpen, setModeloModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState({
    nome: '',
    tipo: '',
    modelo: '',
    etiqueta: ''
  });
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    id_modelo: 0,
    etiqueta: '',
    serial: '',
    observacoes: ''
  });
  const [modeloFormData, setModeloFormData] = useState({
    nome: '',
    marca: ''
  });

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate('/login');
        return;
      }
    };
    checkAuth();
  }, [navigate]);

  // Buscar materiais e modelos
  const fetchMateriais = async () => {
    try {
      let query = supabase
        .from('materiais')
        .select('*, modelo:modelo_materiais(id, nome, marca)')
        .order('created_at', { ascending: false });

      if (filters.nome) {
        query = query.ilike('nome', `%${filters.nome}%`);
      }

      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo);
      }

      if (filters.modelo) {
        // Busca por nome do modelo ao invés do ID
        query = query.textSearch('modelo_materiais.nome', filters.modelo);
      }

      if (filters.etiqueta) {
        query = query.ilike('etiqueta', `%${filters.etiqueta}%`);
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .range(from, to);

      if (error) throw error;

      setMateriais(data || []);
      if (count) {
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      toast.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  const fetchModelos = async () => {
    try {
      const { data, error } = await supabase
        .from('modelo_materiais')
        .select('*')
        .order('nome');

      if (error) {
        if (error.code === '42P01') {
          console.error('Tabela não encontrada:', error);
          toast.error('Erro ao carregar modelos: Tabela não encontrada');
        } else {
          console.error('Erro ao buscar modelos:', error);
          toast.error('Erro ao carregar modelos');
        }
        return;
      }
      setModelos(data || []);
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
      toast.error('Erro ao carregar modelos');
    }
  };

  useEffect(() => {
    fetchMateriais();
    fetchModelos();
  }, [currentPage, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Resetar para primeira página ao filtrar
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Funções do CRUD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingMaterial) {
        // Atualizar material existente
        const { error } = await supabase
          .from('materiais')
          .update({
            nome: formData.nome,
            tipo: formData.tipo,
            id_modelo: formData.id_modelo,
            etiqueta: formData.etiqueta,
            serial: formData.serial,
            observacoes: formData.observacoes
          })
          .eq('id', editingMaterial.id);

        if (error) throw error;
        toast.success('Material atualizado com sucesso!');
      } else {
        // Criar novo material
        const { error } = await supabase
          .from('materiais')
          .insert([{
            nome: formData.nome,
            tipo: formData.tipo,
            id_modelo: formData.id_modelo,
            etiqueta: formData.etiqueta,
            serial: formData.serial,
            observacoes: formData.observacoes
          }]);

        if (error) throw error;
        toast.success('Material cadastrado com sucesso!');
      }

      setModalOpen(false);
      setEditingMaterial(null);
      fetchMateriais();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      toast.error('Erro ao salvar material');
    } finally {
      setLoading(false);
    }
  };

  const handleModeloSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('modelo_materiais')
        .insert([modeloFormData]);

      if (error) throw error;
      toast.success('Modelo cadastrado com sucesso!');
      setModeloModalOpen(false);
      resetModeloForm();
      fetchModelos();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar modelo');
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
      id_modelo: material.id_modelo,
      etiqueta: material.etiqueta,
      serial: material.serial || '',
      observacoes: material.observacoes || ''
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: '',
      id_modelo: 0,
      etiqueta: '',
      serial: '',
      observacoes: ''
    });
  };

  const resetModeloForm = () => {
    setModeloFormData({
      nome: '',
      marca: ''
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col space-y-6">
          {/* Título */}
          <h1 className="text-3xl font-bold text-white">Gestão de Estoque</h1>

          {/* Botões de Ação */}
          <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-md shadow-sm transition-colors duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Material
              </button>
              <button
                onClick={() => setModeloModalOpen(true)}
                className="flex items-center px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-md shadow-sm transition-colors duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Modelo
              </button>
            </div>
          </div>

          {/* Card de Filtros Unificado */}
          <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={filters.nome}
                  onChange={(e) => setFilters({ ...filters, nome: e.target.value })}
                  placeholder="Filtrar por nome..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Filtro por Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo
                </label>
                <select
                  value={filters.tipo}
                  onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Todos</option>
                  {tiposMaterial.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Modelo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Modelo
                </label>
                <select
                  value={filters.modelo}
                  onChange={(e) => setFilters({ ...filters, modelo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Todos</option>
                  {modelos.map((modelo) => (
                    <option key={modelo.id} value={modelo.nome}>
                      {modelo.nome} - {modelo.marca}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Etiqueta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Etiqueta
                </label>
                <input
                  type="text"
                  value={filters.etiqueta}
                  onChange={(e) => setFilters({ ...filters, etiqueta: e.target.value })}
                  placeholder="Filtrar por etiqueta..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Materiais */}
          <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow overflow-hidden">
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
                      Etiqueta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Serial
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
                        {material.modelo ? `${material.modelo.nome} - ${material.modelo.marca}` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center">
                          <TagIcon className="h-5 w-5 mr-2 text-blue-500" />
                          {material.etiqueta}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {material.serial}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(material)}
                          className="text-[#2E7D32] hover:text-[#1B5E20] dark:text-[#1B5E20] dark:hover:text-[#2E7D32] mr-4"
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

          {/* Paginação */}
          <div className="mt-4 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === i + 1
                      ? 'z-10 bg-[#E8F5E9] border-[#2E7D32] text-[#2E7D32]'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Próxima
              </button>
            </nav>
          </div>

          {/* Modal de Cadastro/Edição de Material */}
          {modalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg max-w-2xl w-full p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Selecione um tipo</option>
                        {tiposMaterial.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Modelo
                      </label>
                      <select
                        value={formData.id_modelo || ''}
                        onChange={(e) => setFormData({ ...formData, id_modelo: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Selecione um modelo</option>
                        {modelos.map((modelo) => (
                          <option key={modelo.id} value={modelo.id}>
                            {modelo.nome} - {modelo.marca}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Etiqueta
                      </label>
                      <input
                        type="text"
                        value={formData.etiqueta}
                        onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Serial
                      </label>
                      <input
                        type="text"
                        value={formData.serial}
                        onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                      className="px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-md shadow-sm transition-colors duration-200"
                    >
                      {editingMaterial ? 'Atualizar' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Cadastro de Modelo */}
          {modeloModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                  Novo Modelo de Material
                </h2>
                <form onSubmit={handleModeloSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome do Modelo
                    </label>
                    <input
                      type="text"
                      value={modeloFormData.nome}
                      onChange={(e) => setModeloFormData({ ...modeloFormData, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={modeloFormData.marca}
                      onChange={(e) => setModeloFormData({ ...modeloFormData, marca: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setModeloModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-md shadow-sm transition-colors duration-200"
                    >
                      Cadastrar
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
