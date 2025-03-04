import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import MaterialList from '../components/Estoque/MaterialList';
import ModeloList from '../components/Estoque/ModeloList';
import MaterialModal from '../components/Estoque/MaterialModal';
import ModeloModal from '../components/Estoque/ModeloModal';
import MovimentacaoModal from '../components/Estoque/MovimentacaoModal';

// Interfaces
interface Material {
  id: number;
  serialnb: string;
  tipo: string;
  id_modelo: number;
  etiqueta: string;
  observacoes: string;
  created_at: string;
  modelo?: ModeloMaterial;
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

interface ModeloSummary {
  id: number;
  nome: string;
  marca: string;
  quantidade: number;
  tipo: string;
}

type TabType = 'materiais' | 'modelos';

const EstoqueNew: React.FC = () => {
  const navigate = useNavigate();
  const tiposMaterial = ['Roteador', 'Onu', 'Cabo', 'Switch', 'Outros'];

  // Estados
  const [activeTab, setActiveTab] = useState<TabType>('materiais');
  const [loading, setLoading] = useState(false);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [modelos, setModelos] = useState<ModeloMaterial[]>([]);
  const [modelosSummary, setModelosSummary] = useState<ModeloSummary[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modeloModalOpen, setModeloModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingModelo, setEditingModelo] = useState<ModeloSummary | null>(null);
  const [selectedModelo, setSelectedModelo] = useState<number | null>(null);
  const [movimentacaoModalOpen, setMovimentacaoModalOpen] = useState(false);
  const [movingMaterial, setMovingMaterial] = useState<Material | null>(null);
  const [filtros, setFiltros] = useState({
    tipo: '',
    modelo: '',
    localizacao: ''
  });

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  // Funções de manipulação de dados
  const handleSaveMaterial = async (material: Partial<Material>) => {
    try {
      if (material.id) {
        const { error } = await supabase
          .from('materiais')
          .update(material)
          .eq('id', material.id);
        
        if (error) throw error;
        toast.success('Material atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('materiais')
          .insert(material);
        
        if (error) throw error;
        toast.success('Material cadastrado com sucesso!');
      }
      
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      toast.error('Erro ao salvar material');
    }
  };

  const handleSaveModelo = async (modelo: Partial<ModeloMaterial>) => {
    try {
      if (modelo.id) {
        const { error } = await supabase
          .from('modelo_materiais')
          .update(modelo)
          .eq('id', modelo.id);
        
        if (error) throw error;
        toast.success('Modelo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('modelo_materiais')
          .insert(modelo);
        
        if (error) throw error;
        toast.success('Modelo cadastrado com sucesso!');
      }
      
      setModeloModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar modelo');
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este material?')) return;

    try {
      const { error } = await supabase
        .from('materiais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Material excluído com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      toast.error('Erro ao excluir material');
    }
  };

  const handleDeleteModelo = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      const { error } = await supabase
        .from('modelo_materiais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Modelo excluído com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast.error('Erro ao excluir modelo');
    }
  };

  const handleMovimentacao = async (materialId: number, tipo: string, destinoId?: number) => {
    try {
      // Primeiro, vamos buscar se já existe uma localização para este material
      const { data: existingLoc } = await supabase
        .from('localizacao_materiais')
        .select('id')
        .eq('material_id', materialId)
        .maybeSingle();

      const dados = {
        material_id: materialId,
        localizacao_tipo: tipo,
        empresa: tipo === 'empresa',
        veiculo_id: tipo === 'veiculo' ? destinoId : null,
        contrato_id: tipo === 'contrato' ? destinoId : null,
      };

      let error;

      if (existingLoc?.id) {
        // Se existe, atualiza
        const result = await supabase
          .from('localizacao_materiais')
          .update(dados)
          .eq('id', existingLoc.id);
        error = result.error;
      } else {
        // Se não existe, insere
        const result = await supabase
          .from('localizacao_materiais')
          .insert(dados);
        error = result.error;
      }

      if (error) throw error;
      
      toast.success('Material movimentado com sucesso!');
      setMovimentacaoModalOpen(false);
      setMovingMaterial(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao movimentar material:', error);
      toast.error('Erro ao movimentar material');
    }
  };

  // Buscar dados
  const fetchData = async () => {
    setLoading(true);
    try {
      // Primeiro, vamos buscar as localizações mais recentes de cada material
      const { data: localizacoes, error: locError } = await supabase
        .from('localizacao_materiais')
        .select(`
          id,
          material_id,
          localizacao_tipo,
          empresa,
          veiculo_id,
          contrato_id,
          veiculo:veiculos(id, placa),
          contrato:contratos(id, pppoe)
        `)
        .order('data_atualizacao', { ascending: false });

      if (locError) throw locError;

      // Criar um mapa de localizações por material_id
      const localizacoesPorMaterial = localizacoes?.reduce((acc, loc) => {
        if (!acc[loc.material_id]) {
          acc[loc.material_id] = loc;
        }
        return acc;
      }, {} as Record<number, any>);

      // Buscar materiais
      const { data: materiaisData, error: materiaisError } = await supabase
        .from('materiais')
        .select(`
          *,
          modelo:modelo_materiais!inner(*)
        `)
        .order('created_at', { ascending: false });

      if (materiaisError) throw materiaisError;

      // Formatar os dados dos materiais com suas localizações
      const materiaisFormatados = materiaisData?.map(material => ({
        ...material,
        modelo: material.modelo,
        localizacao: localizacoesPorMaterial[material.id]
      })) || [];

      setMateriais(materiaisFormatados);

      // Buscar modelos
      const { data: modelosData, error: modelosError } = await supabase
        .from('modelo_materiais')
        .select('*')
        .order('marca');

      if (modelosError) throw modelosError;
      setModelos(modelosData || []);

      // Calcular sumário dos modelos
      const summary = modelosData?.map(modelo => {
        const materiaisDoModelo = materiaisFormatados.filter(m => m.id_modelo === modelo.id);
        const tipos = [...new Set(materiaisDoModelo.map(m => m.tipo))];
        return {
          id: modelo.id,
          nome: modelo.nome,
          marca: modelo.marca,
          quantidade: materiaisDoModelo.length,
          tipo: tipos.join(', ')
        };
      }) || [];

      setModelosSummary(summary);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cabeçalho */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
            <div className="px-4 sm:px-6 lg:px-8">
              {/* Título e Botões */}
              <div className="flex justify-between items-center h-16 border-b border-gray-200">
                <div className="flex items-center">
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Estoque</h1>
                </div>
                <div className="flex items-center space-x-4">
                  {activeTab === 'materiais' ? (
                    <button
                      onClick={() => {
                        setEditingMaterial(null);
                        setModalOpen(true);
                      }}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Novo Material
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingModelo(null);
                        setModeloModalOpen(true);
                      }}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Novo Modelo
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex space-x-8 px-2 pb-4">
                <button
                  onClick={() => setActiveTab('materiais')}
                  className={`${
                    activeTab === 'materiais'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  Materiais
                </button>
                <button
                  onClick={() => setActiveTab('modelos')}
                  className={`${
                    activeTab === 'modelos'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  Modelos
                </button>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="space-y-4">
            {/* Área de loading */}
            {loading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            )}

            {/* Conteúdo das tabs */}
            {!loading && (
              <>
                {activeTab === 'materiais' && (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Tipo
                        </label>
                        <select
                          id="tipo"
                          value={filtros.tipo}
                          onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Todos</option>
                          {tiposMaterial.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Modelo
                        </label>
                        <select
                          id="modelo"
                          value={filtros.modelo}
                          onChange={(e) => setFiltros({ ...filtros, modelo: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Todos</option>
                          {modelos.map((modelo) => (
                            <option key={modelo.id} value={modelo.id}>
                              {modelo.marca} - {modelo.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="localizacao" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Localização
                        </label>
                        <select
                          id="localizacao"
                          value={filtros.localizacao}
                          onChange={(e) => setFiltros({ ...filtros, localizacao: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Todas</option>
                          <option value="empresa">Empresa</option>
                          <option value="veiculo">Veículo</option>
                          <option value="contrato">Contrato</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                  {activeTab === 'materiais' ? (
                    <MaterialList
                      materiais={materiais.filter(material => {
                        if (filtros.tipo && material.tipo !== filtros.tipo) return false;
                        if (filtros.modelo && material.id_modelo.toString() !== filtros.modelo) return false;
                        if (filtros.localizacao) {
                          const loc = material.localizacao?.localizacao_tipo || 'empresa';
                          if (loc !== filtros.localizacao) return false;
                        }
                        return true;
                      })}
                      onEdit={(material) => {
                        setEditingMaterial(material);
                        setModalOpen(true);
                      }}
                      onDelete={handleDeleteMaterial}
                      onMove={(material) => {
                        setMovingMaterial(material);
                        setMovimentacaoModalOpen(true);
                      }}
                    />
                  ) : (
                    <ModeloList
                      modelos={modelosSummary}
                      onEdit={(modelo) => {
                        setEditingModelo(modelo);
                        setModeloModalOpen(true);
                      }}
                      onDelete={handleDeleteModelo}
                      onSelect={(id) => setSelectedModelo(id)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modais */}
        <MaterialModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveMaterial}
          material={editingMaterial || undefined}
          modelos={modelos}
          tiposMaterial={tiposMaterial}
        />

        <ModeloModal
          isOpen={modeloModalOpen}
          onClose={() => setModeloModalOpen(false)}
          onSave={handleSaveModelo}
          modelo={editingModelo || undefined}
        />

        {movingMaterial && (
          <MovimentacaoModal
            isOpen={movimentacaoModalOpen}
            onClose={() => {
              setMovimentacaoModalOpen(false);
              setMovingMaterial(null);
            }}
            onSave={handleMovimentacao}
            material={movingMaterial}
          />
        )}
      </div>
    </Layout>
  );
};

export default EstoqueNew;
