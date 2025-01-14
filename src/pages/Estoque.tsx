import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon, CubeIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Material {
  id: number;
  nome: string;
  tipo: string;
  id_modelo: number;
  etiqueta: string;
  observacoes: string;
  created_at: string;
  modelo?: ModeloMaterial; // Relacionamento com o modelo
  localizacao?: {
    localizacao_tipo: string;
    veiculo?: { placa: string };
    contrato?: { pppoe: string };
  };
}

interface ModeloMaterial {
  id: number;
  nome: string;
  marca: string;
  created_at: string;
}

type TabType = 'materiais' | 'modelos';

const Estoque: React.FC = () => {
  const navigate = useNavigate();
  const tiposMaterial = [
    'Roteador',
    'Onu',
    'Cabo',
    'Switch',
    'Outros'
  ];

  const [activeTab, setActiveTab] = useState<TabType>('materiais');
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [modelos, setModelos] = useState<ModeloMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modeloModalOpen, setModeloModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingModelo, setEditingModelo] = useState<ModeloMaterial | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modelosCurrentPage, setModelosCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modelosTotalPages, setModelosTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState({
    nome: '',
    tipo: '',
    modelo: '',
    etiqueta: ''
  });
  const [modeloFilters, setModeloFilters] = useState({
    nome: '',
    marca: ''
  });
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    id_modelo: 0,
    etiqueta: '',
    observacoes: ''
  });
  const [modeloFormData, setModeloFormData] = useState({
    nome: '',
    marca: ''
  });

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [moveForm, setMoveForm] = useState({
    localizacao_tipo: 'empresa',
    veiculo_id: null as number | null,
    contrato_id: null as number | null
  });
  const [veiculos, setVeiculos] = useState<Array<{ id: number; placa: string; nome: string }>>([]);
  const [contratos, setContratos] = useState<Array<{ id: number; numero: string; pppoe: string }>>([]);
  const [contratoSearch, setContratoSearch] = useState('');
  const [contratoSearchResults, setContratoSearchResults] = useState<Array<{ id: number; numero: string; pppoe: string }>>([]);
  const [currentLocation, setCurrentLocation] = useState<{
    tipo: string;
    veiculo?: { id: number; placa: string; nome: string };
    contrato?: { id: number; numero: string; pppoe: string };
  } | null>(null);

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
    setLoading(true);
    try {
      const { from, to } = getPaginationRange(currentPage, itemsPerPage);
      
      // Primeiro, buscar os materiais
      const { data: materiaisData, error: materiaisError, count } = await supabase
        .from('materiais')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (materiaisError) throw materiaisError;

      // Para cada material, buscar sua localização atual
      const materiaisComLocalizacao = await Promise.all(
        (materiaisData || []).map(async (material) => {
          const { data: localizacao } = await supabase
            .from('localizacao_materiais')
            .select(`
              localizacao_tipo,
              veiculo:veiculos(placa),
              contrato:contratos(pppoe)
            `)
            .eq('material_id', material.id)
            .order('data_atualizacao', { ascending: false })
            .limit(1)
            .single();

          return {
            ...material,
            localizacao: localizacao || { localizacao_tipo: 'empresa' }
          };
        })
      );

      setMateriais(materiaisComLocalizacao || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      toast.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  const fetchModelos = async () => {
    setLoading(true);
    try {
      const { from, to } = getPaginationRange(modelosCurrentPage, itemsPerPage);
      let query = supabase
        .from('modelo_materiais')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('nome');

      if (modeloFilters.nome) {
        query = query.ilike('nome', `%${modeloFilters.nome}%`);
      }

      if (modeloFilters.marca) {
        query = query.ilike('marca', `%${modeloFilters.marca}%`);
      }

      const { data, error, count } = await query;

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
      setModelosTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoading(false);
    }
  };

  const getPaginationRange = (page: number, perPage: number) => {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    return { from, to };
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleModeloPageChange = (page: number) => {
    setModelosCurrentPage(page);
  };

  useEffect(() => {
    fetchMateriais();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchModelos();
  }, [modelosCurrentPage, modeloFilters]);

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
            observacoes: formData.observacoes
          })
          .eq('id', editingMaterial.id);

        if (error) throw error;
        toast.success('Material atualizado com sucesso!');
      } else {
        // Criar novo material
        const { data: newMaterial, error: materialError } = await supabase
          .from('materiais')
          .insert([{
            nome: formData.nome,
            tipo: formData.tipo,
            id_modelo: formData.id_modelo,
            etiqueta: formData.etiqueta,
            observacoes: formData.observacoes
          }])
          .select()
          .single();

        if (materialError) throw materialError;

        // Inserir localização inicial do material
        const { error: locationError } = await supabase
          .from('localizacao_materiais')
          .insert([{
            material_id: newMaterial.id,
            localizacao_tipo: 'empresa',
            empresa: true,
            veiculo_id: null,
            contrato_id: null
          }]);

        if (locationError) {
          console.error('Erro ao salvar localização:', locationError);
          toast.error('Material cadastrado, mas houve um erro ao definir sua localização');
        } else {
          toast.success('Material cadastrado com sucesso!');
        }
      }

      resetForm();
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
      if (editingModelo) {
        // Atualizar modelo existente
        const { error } = await supabase
          .from('modelo_materiais')
          .update({
            nome: modeloFormData.nome,
            marca: modeloFormData.marca
          })
          .eq('id', editingModelo.id);

        if (error) throw error;
        toast.success('Modelo atualizado com sucesso!');
      } else {
        // Criar novo modelo
        const { error } = await supabase
          .from('modelo_materiais')
          .insert([modeloFormData]);

        if (error) throw error;
        toast.success('Modelo cadastrado com sucesso!');
      }

      setModeloModalOpen(false);
      resetModeloForm();
      setEditingModelo(null);
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

  const handleModeloDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
      try {
        const { error } = await supabase
          .from('modelo_materiais')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Modelo excluído com sucesso!');
        fetchModelos();
      } catch (error) {
        console.error('Erro ao excluir modelo:', error);
        toast.error('Erro ao excluir modelo');
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
      observacoes: material.observacoes || ''
    });
    setModalOpen(true);
  };

  const handleModeloEdit = (modelo: ModeloMaterial) => {
    setEditingModelo(modelo);
    setModeloFormData({
      nome: modelo.nome,
      marca: modelo.marca
    });
    setModeloModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: '',
      id_modelo: 0,
      etiqueta: '',
      observacoes: ''
    });
  };

  const resetModeloForm = () => {
    setModeloFormData({
      nome: '',
      marca: ''
    });
  };

  // Buscar veículos e contratos
  const fetchVeiculos = async () => {
    const { data, error } = await supabase
      .from('veiculos')
      .select('id, placa')
      .order('placa');
    
    if (error) {
      console.error('Erro ao buscar veículos:', error);
      return;
    }
    setVeiculos(data || []);
  };

  const fetchContratos = async () => {
    const { data, error } = await supabase
      .from('contratos')
      .select('id, pppoe')
      .order('pppoe');
    
    if (error) {
      console.error('Erro ao buscar contratos:', error);
      return;
    }
    setContratos(data || []);
  };

  // Buscar localização atual do material
  const fetchCurrentLocation = async (materialId: number) => {
    try {
      const { data: existingLocation, error: locationError } = await supabase
        .from('localizacao_materiais')
        .select(`
          id,
          localizacao_tipo,
          veiculo:veiculos(id, placa),
          contrato:contratos(id, pppoe)
        `)
        .eq('material_id', materialId)
        .order('data_atualizacao', { ascending: false })
        .limit(1)
        .single();

      if (locationError && locationError.code === 'PGRST116') {
        // Nenhuma localização encontrada, criar uma nova com tipo 'empresa'
        const { error: insertError } = await supabase
          .from('localizacao_materiais')
          .insert({
            material_id: materialId,
            localizacao_tipo: 'empresa',
            veiculo_id: null,
            contrato_id: null,
            empresa: true
          });

        if (insertError) {
          console.error('Erro ao criar localização inicial:', insertError);
          return;
        }

        setCurrentLocation({ tipo: 'empresa' });
        return;
      }

      if (locationError) {
        console.error('Erro ao buscar localização:', locationError);
        return;
      }

      if (existingLocation) {
        setCurrentLocation({
          tipo: existingLocation.localizacao_tipo,
          veiculo: existingLocation.veiculo,
          contrato: existingLocation.contrato
        });
      }
    } catch (error) {
      console.error('Erro ao processar localização:', error);
    }
  };

  // Buscar contratos baseado na pesquisa
  const searchContratos = async (search: string) => {
    if (!search.trim()) {
      setContratoSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('contratos')
      .select('id, pppoe')
      .ilike('pppoe', `%${search}%`)
      .order('pppoe')
      .limit(10);
    
    if (error) {
      console.error('Erro ao buscar contratos:', error);
      return;
    }
    setContratoSearchResults(data || []);
  };

  // Efeito para buscar contratos quando o usuário digita
  useEffect(() => {
    const timer = setTimeout(() => {
      searchContratos(contratoSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [contratoSearch]);

  // Função para mover material
  const handleMove = async () => {
    if (!selectedMaterial) return;

    const { error } = await supabase
      .from('localizacao_materiais')
      .insert({
        material_id: selectedMaterial.id,
        localizacao_tipo: moveForm.localizacao_tipo,
        veiculo_id: moveForm.localizacao_tipo === 'veiculo' ? moveForm.veiculo_id : null,
        contrato_id: moveForm.localizacao_tipo === 'contrato' ? moveForm.contrato_id : null,
        empresa: moveForm.localizacao_tipo === 'empresa'
      });

    if (error) {
      console.error('Erro ao mover material:', error);
      toast.error('Erro ao mover material');
      return;
    }

    toast.success('Material movido com sucesso!');
    setMoveModalOpen(false);
    setSelectedMaterial(null);
    setMoveForm({
      localizacao_tipo: 'empresa',
      veiculo_id: null,
      contrato_id: null
    });
    fetchCurrentLocation(selectedMaterial.id);
  };

  useEffect(() => {
    if (moveModalOpen) {
      fetchVeiculos();
      fetchContratos();
    }
  }, [moveModalOpen]);

  useEffect(() => {
    if (selectedMaterial) {
      fetchCurrentLocation(selectedMaterial.id);
    }
  }, [selectedMaterial]);

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col space-y-6">
          {/* Título */}
          <h1 className="text-3xl font-bold text-white mb-8">Gestão de Estoque</h1>

          {/* Tabs */}
          <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow p-1 mb-6">
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('materiais')}
                className={`${
                  activeTab === 'materiais'
                    ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-500'
                    : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-white/[0.12] dark:hover:bg-gray-800/[0.12]'
                } flex-1 px-6 py-3 text-base font-medium rounded-md transition-all duration-200 ease-in-out`}
              >
                <div className="flex items-center justify-center">
                  <TagIcon className={`h-5 w-5 mr-2 ${
                    activeTab === 'materiais'
                      ? 'text-green-600 dark:text-green-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  Materiais
                </div>
              </button>
              <button
                onClick={() => setActiveTab('modelos')}
                className={`${
                  activeTab === 'modelos'
                    ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-500'
                    : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-white/[0.12] dark:hover:bg-gray-800/[0.12]'
                } flex-1 px-6 py-3 text-base font-medium rounded-md transition-all duration-200 ease-in-out`}
              >
                <div className="flex items-center justify-center">
                  <CubeIcon className={`h-5 w-5 mr-2 ${
                    activeTab === 'modelos'
                      ? 'text-green-600 dark:text-green-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  Modelos
                </div>
              </button>
            </nav>
          </div>

          {/* Botões de Ação */}
          <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              {activeTab === 'materiais' ? (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-md shadow-sm transition-colors duration-200"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Novo Material
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingModelo(null);
                    resetModeloForm();
                    setModeloModalOpen(true);
                  }}
                  className="flex items-center px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-md shadow-sm transition-colors duration-200"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Novo Modelo
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          {activeTab === 'materiais' ? (
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
          ) : (
            <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome do Modelo
                  </label>
                  <input
                    type="text"
                    name="nome"
                    id="nome"
                    value={modeloFilters.nome}
                    onChange={(e) => setModeloFilters({ ...modeloFilters, nome: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="marca" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Marca
                  </label>
                  <input
                    type="text"
                    name="marca"
                    id="marca"
                    value={modeloFilters.marca}
                    onChange={(e) => setModeloFilters({ ...modeloFilters, marca: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Materiais */}
          {activeTab === 'materiais' && (
            <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Modelo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Etiqueta
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Localização
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {materiais.map((material) => (
                      <tr key={material.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {material.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {material.tipo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {material.modelo?.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {material.etiqueta}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${material.localizacao?.localizacao_tipo === 'empresa' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 
                                material.localizacao?.localizacao_tipo === 'veiculo' ? 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-300' :
                                'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-300'}`}
                            >
                              {material.localizacao?.localizacao_tipo === 'empresa' && 'Empresa'}
                              {material.localizacao?.localizacao_tipo === 'veiculo' && material.localizacao.veiculo && 
                                `Veículo: ${material.localizacao.veiculo.placa}`}
                              {material.localizacao?.localizacao_tipo === 'contrato' && material.localizacao.contrato && 
                                `Contrato: ${material.localizacao.contrato.pppoe}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => {
                              setSelectedMaterial(material);
                              setMoveModalOpen(true);
                            }}
                            className="text-green-600 hover:text-green-900 dark:text-green-500 dark:hover:text-green-400"
                          >
                            <ArrowsRightLeftIcon className="h-5 w-5" />
                          </button>
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

              {/* Paginação para Materiais */}
              {totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Próxima
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? 'z-10 bg-green-50 border-green-500 text-green-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            } ${page === 1 ? 'rounded-l-md' : ''} ${
                              page === totalPages ? 'rounded-r-md' : ''
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabela de Modelos */}
          {activeTab === 'modelos' && (
            <div className="bg-[#E8F5E9] dark:bg-[#1B5E20] rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Marca
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {modelos.map((modelo) => (
                      <tr key={modelo.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {modelo.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {modelo.marca}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleModeloEdit(modelo)}
                            className="text-[#2E7D32] hover:text-[#1B5E20] dark:text-[#1B5E20] dark:hover:text-[#2E7D32] mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleModeloDelete(modelo.id)}
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

              {/* Paginação para Modelos */}
              {modelosTotalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handleModeloPageChange(modelosCurrentPage - 1)}
                      disabled={modelosCurrentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        modelosCurrentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handleModeloPageChange(modelosCurrentPage + 1)}
                      disabled={modelosCurrentPage === modelosTotalPages}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        modelosCurrentPage === modelosTotalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Próxima
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando página <span className="font-medium">{modelosCurrentPage}</span> de{' '}
                        <span className="font-medium">{modelosTotalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        {Array.from({ length: modelosTotalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handleModeloPageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === modelosCurrentPage
                                ? 'z-10 bg-green-50 border-green-500 text-green-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            } ${page === 1 ? 'rounded-l-md' : ''} ${
                              page === modelosTotalPages ? 'rounded-r-md' : ''
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                  {editingModelo ? 'Editar Modelo' : 'Novo Modelo'}
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
                      {editingModelo ? 'Atualizar' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Movimentação */}
          {moveModalOpen && selectedMaterial && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Movimentar Material: {selectedMaterial.nome}
                </h3>

                {/* Localização Atual */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Localização Atual:
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Tipo:</span> {currentLocation?.tipo.charAt(0).toUpperCase() + currentLocation?.tipo.slice(1)}
                    </p>
                    {currentLocation?.tipo === 'veiculo' && currentLocation.veiculo && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Veículo:</span> {currentLocation.veiculo.placa}
                      </p>
                    )}
                    {currentLocation?.tipo === 'contrato' && currentLocation.contrato && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Contrato:</span> {currentLocation.contrato.pppoe}
                      </p>
                    )}
                  </div>
                </div>

                {/* Formulário de Movimentação */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Novo Destino
                    </label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={moveForm.localizacao_tipo}
                      onChange={(e) => setMoveForm({
                        ...moveForm,
                        localizacao_tipo: e.target.value,
                        veiculo_id: null,
                        contrato_id: null
                      })}
                    >
                      <option value="empresa">Empresa</option>
                      <option value="veiculo">Veículo</option>
                      <option value="contrato">Contrato</option>
                    </select>
                  </div>

                  {moveForm.localizacao_tipo === 'veiculo' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Veículo
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={moveForm.veiculo_id || ''}
                        onChange={(e) => setMoveForm({
                          ...moveForm,
                          veiculo_id: e.target.value ? Number(e.target.value) : null
                        })}
                      >
                        <option value="">Selecione um veículo</option>
                        {veiculos.map((veiculo) => (
                          <option key={veiculo.id} value={veiculo.id}>
                            {veiculo.placa}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {moveForm.localizacao_tipo === 'contrato' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pesquisar Contrato
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={contratoSearch}
                          onChange={(e) => setContratoSearch(e.target.value)}
                          placeholder="Digite o número ou PPPOE do contrato"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {contratoSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                            {contratoSearchResults.map((contrato) => (
                              <button
                                key={contrato.id}
                                onClick={() => {
                                  setMoveForm({
                                    ...moveForm,
                                    contrato_id: contrato.id
                                  });
                                  setContratoSearch(contrato.pppoe);
                                  setContratoSearchResults([]);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                {contrato.pppoe}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMoveModalOpen(false);
                      setSelectedMaterial(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleMove}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Estoque;
