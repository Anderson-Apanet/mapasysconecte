import React, { Fragment, useState, useEffect } from 'react';
import { 
  UserIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import WhatsAppTemplateModal from '../components/WhatsAppTemplateModal';
import classNames from 'classnames';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import BairroModal from '../components/BairroModal';
import UserTypeModal from '../components/UserTypeModal';
import { supabase } from '../utils/supabaseClient';

// Interfaces
interface User {
  id_user: string;
  nome: string;
  email: string;
  id_user_tipo: number;
  created_at: string;
}

interface UserTipo {
  id_user_tipo: number;
  tipo: string;
  created_at?: string;
}

interface Empresa {
  id_empresa: number;
  nome: string;
  cnpj: string;
  created_at: string;
}

interface WhatsAppTemplate {
  id: number;
  type: 'payment_reminder' | 'overdue_payment' | 'welcome';
  message: string;
  active: boolean;
}

interface UserType {
  id: number;
  name: string;
  permissions: string[];
}

interface Bairro {
  id: number;
  nome: string;
  cidade: string;
  created_at?: string;
}

const ADM: React.FC = () => {
  // Estado para controle das abas
  const [activeTab, setActiveTab] = useState<'usuarios' | 'mensagens' | 'configuracoes' | 'tipos_usuarios' | 'bairros'>('usuarios');

  // Estados existentes
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserTipo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isWhatsAppTemplateModalOpen, setIsWhatsAppTemplateModalOpen] = useState(false);

  // Estado para mensagens do WhatsApp
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([
    {
      id: 1,
      type: 'payment_reminder',
      message: 'Olá {client_name}, este é um lembrete de que seu pagamento de {amount} vence em {due_date}.',
      active: true
    },
    {
      id: 2,
      type: 'overdue_payment',
      message: 'Olá {client_name}, seu pagamento de {amount} está atrasado desde {due_date}. Por favor, regularize sua situação.',
      active: true
    },
    {
      id: 3,
      type: 'welcome',
      message: 'Bem-vindo(a) {client_name}! Estamos felizes em tê-lo(a) como cliente.',
      active: true
    }
  ]);

  // Estado para tipos de usuários
  const [selectedUserType, setSelectedUserType] = useState<UserTipo | null>(null);
  const [isUserTypeModalOpen, setIsUserTypeModalOpen] = useState(false);
  const [userTypePermissions, setUserTypePermissions] = useState<any[]>([]);

  const availableModules = {
    usuarios: 'Usuários',
    mensagens: 'Mensagens',
    configuracoes: 'Configurações',
    bairros: 'Bairros',
  };

  // Estado para bairros
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [selectedBairro, setSelectedBairro] = useState<Bairro | null>(null);
  const [isBairroModalOpen, setIsBairroModalOpen] = useState(false);
  const [bairrosPage, setBairrosPage] = useState(1);
  const [totalBairrosPages, setTotalBairrosPages] = useState(1);
  const [bairrosSearchTerm, setBairrosSearchTerm] = useState('');
  const [loadingBairros, setLoadingBairros] = useState(false);

  // Função para adicionar novo tipo de usuário
  const handleAddUserType = async (tipo: string) => {
    try {
      const { data, error } = await supabase
        .from('user_tipo')
        .insert([{ tipo }])
        .select()
        .single();

      if (error) throw error;

      setUserTypes([...userTypes, data]);
      setIsUserTypeModalOpen(false);
      toast.success('Tipo de usuário criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar tipo de usuário:', error);
      toast.error('Erro ao criar tipo de usuário');
    }
  };

  // Função para editar tipo de usuário
  const handleEditUserType = async (id: number, tipo: string) => {
    try {
      const { error } = await supabase
        .from('user_tipo')
        .update({ tipo })
        .eq('id_user_tipo', id);

      if (error) throw error;

      setUserTypes(userTypes.map(type => type.id_user_tipo === id ? { ...type, tipo } : type));
      setIsUserTypeModalOpen(false);
      toast.success('Tipo de usuário atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar tipo de usuário:', error);
      toast.error('Erro ao atualizar tipo de usuário');
    }
  };

  // Função para excluir tipo de usuário
  const handleDeleteUserType = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este tipo de usuário?')) return;

    try {
      // First delete permissions
      const { error: permissionsError } = await supabase
        .from('user_tipo_permissoes')
        .delete()
        .eq('id_user_tipo', id);

      if (permissionsError) throw permissionsError;

      // Then delete the user type
      const { error } = await supabase
        .from('user_tipo')
        .delete()
        .eq('id_user_tipo', id);

      if (error) throw error;
      
      toast.success('Tipo de usuário excluído com sucesso');
      fetchUserTypes();
    } catch (error) {
      console.error('Erro ao excluir tipo de usuário:', error);
      toast.error('Erro ao excluir tipo de usuário');
    }
  };

  // Função para buscar tipos de usuário
  const fetchUserTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tipo')
        .select('*')
        .order('tipo');

      if (error) throw error;

      setUserTypes(data || []);
    } catch (error) {
      console.error('Erro ao buscar tipos de usuário:', error);
      toast.error('Erro ao carregar tipos de usuário');
    }
  };

  const fetchUserTypePermissions = async (userTypeId: number) => {
    try {
      const { data, error } = await supabase
        .from('user_tipo_permissoes')
        .select('*')
        .eq('id_user_tipo', userTypeId);

      if (error) throw error;
      setUserTypePermissions(data || []);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      toast.error('Erro ao carregar permissões');
    }
  };

  const handleOpenUserTypeModal = async (type?: UserTipo) => {
    setSelectedUserType(type || null);
    if (type) {
      await fetchUserTypePermissions(type.id_user_tipo);
    } else {
      setUserTypePermissions([]);
    }
    setIsUserTypeModalOpen(true);
  };

  useEffect(() => {
    if (activeTab === 'tipos_usuarios') {
      fetchUserTypes();
    }
  }, [activeTab]);

  // Módulos disponíveis para permissões
  const availablePermissions = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Usuários' },
    { id: 'messages', label: 'Mensagens' },
    { id: 'settings', label: 'Configurações' }
  ];

  const fetchUsers = async (page: number) => {
    try {
      setIsLoading(true);
      const from = (page - 1) * 10;
      const to = from + 9;

      // Primeiro, obter o total de registros para calcular a paginação
      const { count: totalCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .ilike('nome', `%${searchTerm}%`);

      if (totalCount === null) throw new Error('Erro ao contar usuários');

      setTotalPages(Math.ceil(totalCount / 10));

      // Buscar usuários com join na tabela user_tipo
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          *,
          user_tipo (tipo)
        `)
        .ilike('nome', `%${searchTerm}%`)
        .range(from, to)
        .order('nome');

      if (error) throw error;

      setUsers(usersData || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'usuarios') {
      fetchUsers(currentPage);
    }
  }, [currentPage, searchTerm, activeTab]);

  const handleDeleteUser = (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      setIsLoading(true);
      const updatedUsers = users.filter(user => user.id_user !== userId);
      setUsers(updatedUsers);
      toast.success('Usuário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'usuarios', name: 'Usuários', icon: UserIcon },
    { id: 'mensagens', name: 'Mensagens WhatsApp', icon: ChatBubbleLeftRightIcon },
    { id: 'tipos_usuarios', name: 'Tipos de Usuários', icon: UserGroupIcon },
    { id: 'configuracoes', name: 'Configurações', icon: Cog6ToothIcon },
    { id: 'bairros', name: 'Bairros', icon: MapPinIcon },
  ];

  // Função para atualizar template de WhatsApp
  const handleUpdateWhatsAppTemplate = (template: WhatsAppTemplate) => {
    try {
      switch (template.type) {
        case 'payment_reminder':
          setWhatsappTemplates(prev => prev.map(t => t.id === template.id ? template : t));
          break;
        case 'overdue_payment':
          setWhatsappTemplates(prev => prev.map(t => t.id === template.id ? template : t));
          break;
        case 'welcome':
          setWhatsappTemplates(prev => prev.map(t => t.id === template.id ? template : t));
          break;
      }
      toast.success('Template atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      toast.error('Erro ao atualizar template');
    }
  };

  // Função para alternar o status ativo/inativo
  const handleToggleActive = (id: number) => {
    try {
      setWhatsappTemplates(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Função para buscar templates do WhatsApp
  const fetchWhatsAppTemplates = async () => {
    try {
      const templates = [
        {
          id: 1,
          type: 'payment_reminder',
          message: 'Olá {client_name}, este é um lembrete de que seu pagamento de {amount} vence em {due_date}.',
          active: true
        },
        {
          id: 2,
          type: 'overdue_payment',
          message: 'Olá {client_name}, seu pagamento de {amount} está atrasado desde {due_date}. Por favor, regularize sua situação.',
          active: true
        },
        {
          id: 3,
          type: 'welcome',
          message: 'Bem-vindo(a) {client_name}! Estamos felizes em tê-lo(a) como cliente.',
          active: true
        },
      ];

      setWhatsappTemplates(templates);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      toast.error('Erro ao carregar templates');
    }
  };

  // Carregar templates quando a aba de mensagens for selecionada
  useEffect(() => {
    if (activeTab === 'mensagens') {
      fetchWhatsAppTemplates();
    }
  }, [activeTab]);

  const handleToggleTemplateActive = (id: number) => {
    setWhatsappTemplates(prev =>
      prev.map(template =>
        template.id === id ? { ...template, active: !template.active } : template
      )
    );
    toast.success('Status do template atualizado com sucesso!');
  };

  // Função para salvar alterações no template
  const handleSaveTemplate = (updatedTemplate: WhatsAppTemplate) => {
    setWhatsappTemplates(prev =>
      prev.map(template =>
        template.id === updatedTemplate.id ? updatedTemplate : template
      )
    );
    setIsWhatsAppTemplateModalOpen(false);
    toast.success('Template atualizado com sucesso!');
  };

  // Função para buscar bairros
  const fetchBairros = async (page: number) => {
    try {
      setLoadingBairros(true);
      const startRange = (page - 1) * 6;
      const endRange = startRange + 5;

      // Primeiro, obter o total de registros para a paginação
      let countQuery = supabase
        .from('bairros')
        .select('count', { count: 'exact' });

      if (bairrosSearchTerm) {
        countQuery = countQuery.or(`nome.ilike.%${bairrosSearchTerm}%,cidade.ilike.%${bairrosSearchTerm}%`);
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;

      const totalPages = Math.ceil((count || 0) / 6);
      setTotalBairrosPages(totalPages);

      // Agora, buscar os registros da página atual
      let query = supabase
        .from('bairros')
        .select('*')
        .order('nome', { ascending: true });

      if (bairrosSearchTerm) {
        query = query.or(`nome.ilike.%${bairrosSearchTerm}%,cidade.ilike.%${bairrosSearchTerm}%`);
      }

      const { data, error } = await query
        .range(startRange, endRange);

      if (error) throw error;
      setBairros(data || []);

      console.log('Total de registros:', count);
      console.log('Registros na página:', data?.length);
      console.log('Total de páginas:', totalPages);
    } catch (error: any) {
      console.error('Erro ao carregar bairros:', error);
      toast.error('Erro ao carregar bairros: ' + error.message);
    } finally {
      setLoadingBairros(false);
    }
  };

  // Efeito para carregar bairros quando a página ou termo de busca mudar
  useEffect(() => {
    if (activeTab === 'bairros') {
      fetchBairros(bairrosPage);
    }
  }, [bairrosPage, bairrosSearchTerm, activeTab]);

  // Funções de gerenciamento de bairros
  const handleAddBairro = () => {
    setSelectedBairro(null);
    setIsBairroModalOpen(true);
  };

  const handleEditBairro = (bairro: Bairro) => {
    setSelectedBairro(bairro);
    setIsBairroModalOpen(true);
  };

  const handleDeleteBairro = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este bairro?')) {
      try {
        const { error } = await supabase
          .from('bairros')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Bairro excluído com sucesso!');
        fetchBairros(bairrosPage);
      } catch (error: any) {
        console.error('Erro ao excluir bairro:', error);
        toast.error('Erro ao excluir bairro: ' + error.message);
      }
    }
  };

  const handleSaveBairro = async (bairro: Bairro) => {
    try {
      if (selectedBairro) {
        // Update
        const { error } = await supabase
          .from('bairros')
          .update({ nome: bairro.nome, cidade: bairro.cidade })
          .eq('id', selectedBairro.id);

        if (error) throw error;
        toast.success('Bairro atualizado com sucesso!');
      } else {
        // Insert
        const { error } = await supabase
          .from('bairros')
          .insert([{ nome: bairro.nome, cidade: bairro.cidade }]);

        if (error) throw error;
        toast.success('Bairro adicionado com sucesso!');
      }

      setIsBairroModalOpen(false);
      fetchBairros(bairrosPage);
    } catch (error: any) {
      console.error('Erro ao salvar bairro:', error);
      toast.error('Erro ao salvar bairro: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <UserGroupIcon className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-2" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
              Administração
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie usuários, permissões e configurações do sistema
          </p>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Grid of management buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Usuários */}
            <button
              onClick={() => setActiveTab('usuarios')}
              className={classNames(
                'flex items-center p-6 rounded-xl shadow-sm transition-all duration-200',
                'bg-gradient-to-br hover:bg-gradient-to-r',
                activeTab === 'usuarios'
                  ? 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                  : 'from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600',
                'border border-gray-200 dark:border-gray-700',
                'group'
              )}
            >
              <div className={classNames(
                'flex items-center space-x-4',
                activeTab === 'usuarios' ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              )}>
                <UserIcon className={classNames(
                  'h-8 w-8 transition-colors duration-200',
                  activeTab === 'usuarios' ? 'text-white' : 'text-blue-500 group-hover:text-blue-600 dark:text-blue-400'
                )} />
                <div className="text-left">
                  <p className="font-semibold text-lg">Usuários</p>
                  <p className="text-sm opacity-90">Gerenciar usuários do sistema</p>
                </div>
              </div>
            </button>

            {/* WhatsApp */}
            <button
              onClick={() => setActiveTab('mensagens')}
              className={classNames(
                'flex items-center p-6 rounded-xl shadow-sm transition-all duration-200',
                'bg-gradient-to-br hover:bg-gradient-to-r',
                activeTab === 'mensagens'
                  ? 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                  : 'from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600',
                'border border-gray-200 dark:border-gray-700',
                'group'
              )}
            >
              <div className={classNames(
                'flex items-center space-x-4',
                activeTab === 'mensagens' ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              )}>
                <ChatBubbleLeftRightIcon className={classNames(
                  'h-8 w-8 transition-colors duration-200',
                  activeTab === 'mensagens' ? 'text-white' : 'text-green-500 group-hover:text-green-600 dark:text-green-400'
                )} />
                <div className="text-left">
                  <p className="font-semibold text-lg">WhatsApp</p>
                  <p className="text-sm opacity-90">Configurar mensagens automáticas</p>
                </div>
              </div>
            </button>

            {/* Tipos de Usuários */}
            <button
              onClick={() => setActiveTab('tipos_usuarios')}
              className={classNames(
                'flex items-center p-6 rounded-xl shadow-sm transition-all duration-200',
                'bg-gradient-to-br hover:bg-gradient-to-r',
                activeTab === 'tipos_usuarios'
                  ? 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                  : 'from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600',
                'border border-gray-200 dark:border-gray-700',
                'group'
              )}
            >
              <div className={classNames(
                'flex items-center space-x-4',
                activeTab === 'tipos_usuarios' ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              )}>
                <UserGroupIcon className={classNames(
                  'h-8 w-8 transition-colors duration-200',
                  activeTab === 'tipos_usuarios' ? 'text-white' : 'text-purple-500 group-hover:text-purple-600 dark:text-purple-400'
                )} />
                <div className="text-left">
                  <p className="font-semibold text-lg">Tipos de Usuários</p>
                  <p className="text-sm opacity-90">Gerenciar perfis de acesso</p>
                </div>
              </div>
            </button>

            {/* Configurações */}
            <button
              onClick={() => setActiveTab('configuracoes')}
              className={classNames(
                'flex items-center p-6 rounded-xl shadow-sm transition-all duration-200',
                'bg-gradient-to-br hover:bg-gradient-to-r',
                activeTab === 'configuracoes'
                  ? 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                  : 'from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600',
                'border border-gray-200 dark:border-gray-700',
                'group'
              )}
            >
              <div className={classNames(
                'flex items-center space-x-4',
                activeTab === 'configuracoes' ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              )}>
                <Cog6ToothIcon className={classNames(
                  'h-8 w-8 transition-colors duration-200',
                  activeTab === 'configuracoes' ? 'text-white' : 'text-gray-500 group-hover:text-gray-600 dark:text-gray-400'
                )} />
                <div className="text-left">
                  <p className="font-semibold text-lg">Configurações</p>
                  <p className="text-sm opacity-90">Configurações do sistema</p>
                </div>
              </div>
            </button>

            {/* Bairros */}
            <button
              onClick={() => setActiveTab('bairros')}
              className={classNames(
                'flex items-center p-6 rounded-xl shadow-sm transition-all duration-200',
                'bg-gradient-to-br hover:bg-gradient-to-r',
                activeTab === 'bairros'
                  ? 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                  : 'from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600',
                'border border-gray-200 dark:border-gray-700',
                'group'
              )}
            >
              <div className={classNames(
                'flex items-center space-x-4',
                activeTab === 'bairros' ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              )}>
                <MapPinIcon className={classNames(
                  'h-8 w-8 transition-colors duration-200',
                  activeTab === 'bairros' ? 'text-white' : 'text-orange-500 group-hover:text-orange-600 dark:text-orange-400'
                )} />
                <div className="text-left">
                  <p className="font-semibold text-lg">Bairros</p>
                  <p className="text-sm opacity-90">Gerenciar bairros</p>
                </div>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'usuarios' && (
            <div>
              {/* Barra de Ferramentas */}
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full sm:w-96">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar usuários..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Tabela de Usuários */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Nome
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {isLoading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            Carregando...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            Nenhum usuário encontrado
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id_user} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {user.nome}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {user.user_tipo?.tipo || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsModalOpen(true);
                                  }}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id_user)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
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

              {/* Paginação */}
              {users.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                        currentPage === 1
                          ? 'text-gray-400 bg-gray-100 cursor-not-allowed dark:text-gray-500 dark:bg-gray-700'
                          : 'text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                        currentPage === totalPages
                          ? 'text-gray-400 bg-gray-100 cursor-not-allowed dark:text-gray-500 dark:bg-gray-700'
                          : 'text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      Próximo
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> até{' '}
                        <span className="font-medium">{Math.min(currentPage * 10, users.length)}</span> de{' '}
                        <span className="font-medium">{totalPages * 10}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                            currentPage === 1
                              ? 'text-gray-400 bg-gray-100 cursor-not-allowed dark:text-gray-500 dark:bg-gray-700 dark:border-gray-600'
                              : 'text-gray-500 bg-white hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="sr-only">Anterior</span>
                          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                            currentPage === totalPages
                              ? 'text-gray-400 bg-gray-100 cursor-not-allowed dark:text-gray-500 dark:bg-gray-700 dark:border-gray-600'
                              : 'text-gray-500 bg-white hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="sr-only">Próximo</span>
                          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'mensagens' && (
            <div className="space-y-6">
              {/* Lembrete de Pagamento */}
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Lembrete de Pagamento</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleTemplateActive(whatsappTemplates[0].id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        whatsappTemplates[0].active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-400 dark:hover:bg-green-800/50'
                          : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-400 dark:hover:bg-red-800/50'
                      }`}
                    >
                      {whatsappTemplates[0].active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(whatsappTemplates[0]);
                        setIsWhatsAppTemplateModalOpen(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mensagem</label>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{whatsappTemplates[0].message}</p>
                  </div>
                </div>
              </div>

              {/* Mensalidade Vencida */}
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Mensalidade Vencida</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleTemplateActive(whatsappTemplates[1].id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        whatsappTemplates[1].active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-400 dark:hover:bg-green-800/50'
                          : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-400 dark:hover:bg-red-800/50'
                      }`}
                    >
                      {whatsappTemplates[1].active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(whatsappTemplates[1]);
                        setIsWhatsAppTemplateModalOpen(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mensagem</label>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{whatsappTemplates[1].message}</p>
                  </div>
                </div>
              </div>

              {/* Boas-vindas */}
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Mensagem de Boas-vindas</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleTemplateActive(whatsappTemplates[2].id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        whatsappTemplates[2].active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-400 dark:hover:bg-green-800/50'
                          : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-400 dark:hover:bg-red-800/50'
                      }`}
                    >
                      {whatsappTemplates[2].active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(whatsappTemplates[2]);
                        setIsWhatsAppTemplateModalOpen(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mensagem</label>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{whatsappTemplates[2].message}</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Template Modal */}
              <WhatsAppTemplateModal
                isOpen={isWhatsAppTemplateModalOpen}
                onClose={() => setIsWhatsAppTemplateModalOpen(false)}
                onSave={handleSaveTemplate}
                template={selectedTemplate}
              />
            </div>
          )}
          {activeTab === 'tipos_usuarios' && (
            <div>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Tipos de Usuário</h2>
                <button
                  onClick={() => handleOpenUserTypeModal()}
                  className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 font-medium"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Novo Tipo
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mt-4">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {userTypes.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Nenhum tipo de usuário encontrado
                        </td>
                      </tr>
                    ) : (
                      userTypes.map((type) => (
                        <tr key={type.id_user_tipo} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {type.tipo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleOpenUserTypeModal(type)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUserType(type.id_user_tipo)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
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

              {/* User Type Modal */}
              {isUserTypeModalOpen && (
                <UserTypeModal
                  isOpen={isUserTypeModalOpen}
                  onClose={() => setIsUserTypeModalOpen(false)}
                  userType={selectedUserType}
                  userTypePermissions={userTypePermissions}
                  onSuccess={() => {
                    fetchUserTypes();
                    setIsUserTypeModalOpen(false);
                  }}
                  availableModules={availableModules}
                />
              )}
            </div>
          )}
          {activeTab === 'configuracoes' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Configurações do Sistema</h3>
                <div className="space-y-4">
                  {/* Add your configuration options here */}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configurações em desenvolvimento...
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'bairros' && (
            <div>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Bairros</h2>
                <button
                  onClick={() => handleAddBairro()}
                  className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 font-medium"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Novo Bairro
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nome ou cidade..."
                    value={bairrosSearchTerm}
                    onChange={(e) => {
                      setBairrosSearchTerm(e.target.value);
                      setBairrosPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Cidade
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loadingBairros ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Carregando...
                        </td>
                      </tr>
                    ) : bairros.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Nenhum bairro encontrado
                        </td>
                      </tr>
                    ) : (
                      bairros.map((bairro) => (
                        <tr key={bairro.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {bairro.nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {bairro.cidade}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEditBairro(bairro)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBairro(bairro.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
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

              {/* Pagination */}
              {bairros.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setBairrosPage(prev => Math.max(prev - 1, 1))}
                      disabled={bairrosPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setBairrosPage(prev => Math.min(prev + 1, totalBairrosPages))}
                      disabled={bairrosPage === totalBairrosPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando <span className="font-medium">{((bairrosPage - 1) * 6) + 1}</span> até{' '}
                        <span className="font-medium">
                          {Math.min(bairrosPage * 6, (totalBairrosPages * 6))}
                        </span> de{' '}
                        <span className="font-medium">{totalBairrosPages * 6}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setBairrosPage(prev => Math.max(prev - 1, 1))}
                          disabled={bairrosPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                          <span className="sr-only">Anterior</span>
                          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        {[...Array(totalBairrosPages)].map((_, index) => (
                          <button
                            key={index + 1}
                            onClick={() => setBairrosPage(index + 1)}
                            className={classNames(
                              bairrosPage === index + 1
                                ? 'z-10 bg-primary-50 dark:bg-primary-900 border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600',
                              'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                            )}
                          >
                            {index + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setBairrosPage(prev => Math.min(prev + 1, totalBairrosPages))}
                          disabled={bairrosPage === totalBairrosPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                          <span className="sr-only">Próxima</span>
                          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}

              {/* Bairro Modal */}
              {isBairroModalOpen && (
                <BairroModal
                  isOpen={isBairroModalOpen}
                  onClose={() => setIsBairroModalOpen(false)}
                  bairro={selectedBairro}
                  onSave={() => {
                    fetchBairros(bairrosPage);
                  }}
                />
              )}
            </div>
          )}
          <BairroModal
            isOpen={isBairroModalOpen}
            onClose={() => setIsBairroModalOpen(false)}
            bairro={selectedBairro}
            onSave={() => {
              fetchBairros(bairrosPage);
            }}
          />
        </div>
      </div>
    </Layout>
  );
};

export { ADM };
