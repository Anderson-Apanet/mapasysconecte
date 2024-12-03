import React, { useState, useMemo, useEffect } from 'react';
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  FunnelIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  DocumentTextIcon,
  NoSymbolIcon,
  LockClosedIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

// Tipos de lançamento
const TRANSACTION_TYPES = {
  INCOME: 'RECEITA',
  EXPENSE: 'DESPESA'
};

// Status dos contratos
const CONTRACT_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Contratos' },
  { value: 'a-vencer', label: 'Contratos com Títulos a Vencer' },
  { value: 'vencidos', label: 'Contratos com Títulos Vencidos' },
  { value: 'vencidos-15d', label: 'Contratos com Títulos Vencidos +15 dias' },
  { value: 'agendados', label: 'Contratos Agendados' },
  { value: 'bloqueados', label: 'Contratos Bloqueados' },
  { value: 'reduzidos', label: 'Contratos Reduzidos' },
  { value: 'liberados-48h', label: 'Contratos Liberados 48hs' },
  { value: 'bonificados', label: 'Contratos Bonificados' },
  { value: 'cancelados', label: 'Contratos Cancelados' },
  { value: 'cancelados-pendencia', label: 'Contratos Cancelados com Pendência' }
];

// Categorias fictícias
const CATEGORIES = {
  INCOME: ['Mensalidade', 'Matrícula', 'Serviços', 'Outros'],
  EXPENSE: ['Salários', 'Aluguel', 'Materiais', 'Impostos', 'Outros']
};

// Interface para anexos
interface Attachment {
  path: string;
  url: string;
  name: string;
}

// Interface para Cliente
interface Cliente {
  id: number;
  nome: string;
  cpf_cnpj: string;
}

// Interface para Contrato
interface Contrato {
  id: number;
  pppoe: string;
  plano: string;
  status: string;
  created_at: string;
  cliente?: string;
  bairro?: string;
  complemento?: string;
  contratoassinado?: boolean;
  data_instalacao?: string;
  dia_vencimento?: number;
  id_empresa?: number;
  endereco?: string;
}

// Interface para Título
interface Titulo {
  id: number;
  contrato_id: number;
  valor: number;
  data_vencimento: string;
  status: string;
}

// Interface para transação
interface Transaction {
  id: number;
  type: string;
  description: string;
  category: string;
  value: number;
  date: string;
  status: string;
  attachments?: Attachment[];
  cliente_id?: number;
  contrato_id?: number;
  titulo_id?: number;
  paymentType?: string;
  installmentInfo?: {
    currentInstallment: number;
    totalInstallments: number;
    originalValue: number;
  };
  recurringInfo?: {
    isRecurring: boolean;
    startDate: string;
    endDate: string;
  };
}

interface Lancamento {
  id: number;
  data_cad_lancamento: string;
  descricao: string;
  total: number;
}

// Dados fictícios de lançamentos
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    type: TRANSACTION_TYPES.INCOME,
    description: 'Mensalidade - João Silva',
    category: 'Mensalidade',
    value: 1500.00,
    date: '2024-01-15',
    status: 'Confirmado'
  },
  {
    id: 2,
    type: TRANSACTION_TYPES.EXPENSE,
    description: 'Aluguel Janeiro',
    category: 'Aluguel',
    value: 3000.00,
    date: '2024-01-10',
    status: 'Pendente'
  },
  {
    id: 3,
    type: TRANSACTION_TYPES.INCOME,
    description: 'Matrícula - Maria Santos',
    category: 'Matrícula',
    value: 500.00,
    date: '2024-01-05',
    status: 'Confirmado'
  }
];

// Mock de contratos para a lista
const MOCK_CONTRATOS_LISTA = [
  {
    id: 1,
    numero: "CONT-001",
    cliente: "João Silva",
    plano: "Fibra 100MB",
    valor: 89.90,
    vencimento: 10,
    status: "Em dia"
  },
  {
    id: 2,
    numero: "CONT-002",
    cliente: "Maria Santos",
    plano: "Fibra 200MB",
    valor: 119.90,
    vencimento: 15,
    status: "Atrasado"
  },
  {
    id: 3,
    numero: "CONT-003",
    cliente: "Pedro Oliveira",
    plano: "Fibra 500MB",
    valor: 199.90,
    vencimento: 5,
    status: "Em dia"
  }
];

const Financeiro: React.FC = () => {
  // Estados gerais
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'caixa' | 'contratos'>('caixa');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Estados do modal de transação
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [selectedType, setSelectedType] = useState(TRANSACTION_TYPES.INCOME);
  const [paymentType, setPaymentType] = useState<'single' | 'installment' | 'recurring'>('single');
  const [installments, setInstallments] = useState(2);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [transactionValue, setTransactionValue] = useState('');
  
  // Estados de categorias
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expenseCategories, setExpenseCategories] = useState(CATEGORIES.EXPENSE);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [contractStatusFilter, setContractStatusFilter] = useState('all');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setExpenseCategories([...expenseCategories, newCategoryName.trim()]);
      setNewCategoryName('');
      setShowNewCategoryModal(false);
      toast.success('Categoria adicionada com sucesso!');
    }
  };

  // Lista de todas as categorias únicas
  const uniqueCategories = useMemo(() => {
    const categories = transactions.map(t => t.category);
    return ['TODOS', ...new Set(categories)];
  }, [transactions]);

  // Transações filtradas
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesType = selectedType === 'all' || transaction.type === selectedType;
      const matchesCategory = searchTerm === '' || transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesCategory;
    });
  }, [transactions, selectedType, searchTerm]);

  // Cálculo do resumo financeiro baseado nas transações filtradas
  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        const value = transaction.value;
        if (transaction.type === TRANSACTION_TYPES.INCOME) {
          acc.totalIncome += value;
        } else {
          acc.totalExpense += value;
        }
        acc.balance = acc.totalIncome - acc.totalExpense;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, balance: 0 }
    );
  }, [filteredTransactions]);

  // Estados para cliente, contrato e título
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [selectedTitulo, setSelectedTitulo] = useState<Titulo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingContratos, setIsLoadingContratos] = useState(true);

  // Função para fazer upload de arquivo para o Supabase
  const uploadFile = async (file: File) => {
    try {
      console.log('Iniciando upload para Supabase:', {
        nome: file.name,
        tipo: file.type,
        tamanho: file.size
      });

      // Verificar se o usuário está autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Usuário não autenticado');
      }

      const timestamp = new Date().getTime();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `retornos/${session.user.id}/${fileName}`; // Incluir ID do usuário no caminho

      // Verificar se o arquivo já existe
      const { data: existingFile } = await supabase.storage
        .from('assets-mapasys')
        .list(`retornos/${session.user.id}`, {
          search: fileName
        });

      if (existingFile && existingFile.length > 0) {
        console.log('Arquivo já existe, tentando sobrescrever');
      }

      // Tentar upload com política pública
      const { data, error } = await supabase.storage
        .from('assets-mapasys')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        });

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        
        // Se for erro de RLS, tentar novamente com política anônima
        if (error.message.includes('row-level security')) {
          const { data: publicData, error: publicError } = await supabase.storage
            .from('assets-mapasys')
            .upload(`public/${filePath}`, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'application/octet-stream'
            });

          if (publicError) {
            console.error('Erro ao tentar upload público:', publicError);
            throw new Error(`Erro ao fazer upload: ${publicError.message}`);
          }

          if (!publicData) {
            throw new Error('Upload falhou: nenhum dado retornado');
          }

          // Usar o caminho público para gerar a URL
          const { data: { publicUrl } } = supabase.storage
            .from('assets-mapasys')
            .getPublicUrl(`public/${filePath}`);

          console.log('Upload público bem-sucedido:', publicData);
          console.log('URL pública gerada:', publicUrl);

          return {
            path: `public/${filePath}`,
            url: publicUrl,
            name: file.name
          };
        }

        throw new Error(`Erro ao fazer upload: ${error.message}`);
      }

      if (!data) {
        throw new Error('Upload falhou: nenhum dado retornado');
      }

      console.log('Upload para Supabase bem-sucedido:', data);

      // Gerar URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('assets-mapasys')
        .getPublicUrl(filePath);

      console.log('URL pública gerada:', publicUrl);

      return {
        path: filePath,
        url: publicUrl,
        name: file.name
      };
    } catch (error) {
      console.error('Erro completo ao fazer upload:', error);
      if (error instanceof Error) {
        toast.error(`Erro ao fazer upload: ${error.message}`);
      } else {
        toast.error('Erro desconhecido ao fazer upload');
      }
      throw error;
    }
  };

  // Função para buscar clientes
  const searchClientes = async (search: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .ilike('nome', `%${search}%`)
        .order('nome')
        .limit(10);

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao buscar clientes');
    } finally {
      setIsSearching(false);
    }
  };

  // Função para buscar todos os contratos
  const fetchContratos = async () => {
    setIsLoadingContratos(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('id, pppoe, plano, status, created_at')
        .not('plano', 'is', null)
        .not('plano', 'eq', '')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar contratos:', error);
        toast.error('Erro ao carregar contratos');
        return;
      }

      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast.error('Erro ao carregar contratos');
    } finally {
      setIsLoadingContratos(false);
    }
  };

  // Carregar contratos quando a view mudar para 'contratos'
  useEffect(() => {
    if (activeView === 'contratos') {
      fetchContratos();
    }
  }, [activeView]);

  // Função para buscar contratos do cliente
  const fetchContratosCliente = async (clienteId: number) => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('numero');

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast.error('Erro ao buscar contratos');
    }
  };

  // Função para buscar títulos do contrato
  const fetchTitulos = async (contratoId: number) => {
    try {
      const { data, error } = await supabase
        .from('titulos')
        .select('*')
        .eq('contrato_id', contratoId)
        .eq('status', 'PENDENTE')
        .order('data_vencimento');

      if (error) throw error;
      setTitulos(data || []);
    } catch (error) {
      console.error('Erro ao buscar títulos:', error);
      toast.error('Erro ao buscar títulos');
    }
  };

  // Handler para seleção de cliente
  const handleClienteSelect = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setSelectedContrato(null);
    setSelectedTitulo(null);
    setTitulos([]);
    fetchContratosCliente(cliente.id);
  };

  // Handler para seleção de contrato
  const handleContratoSelect = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setSelectedTitulo(null);
    fetchTitulos(contrato.id);
  };

  // Handler para seleção de título
  const handleTituloSelect = (titulo: Titulo) => {
    setSelectedTitulo(titulo);
    // Atualizar o valor e a data do formulário com os dados do título
    const form = document.querySelector('form');
    if (form) {
      const valueInput = form.querySelector('input[name="value"]') as HTMLInputElement;
      const dateInput = form.querySelector('input[name="date"]') as HTMLInputElement;
      if (valueInput) valueInput.value = titulo.valor.toString();
      if (dateInput) dateInput.value = titulo.data_vencimento;
    }
  };

  const handleNewTransaction = () => {
    setSelectedCliente(null);
    setSelectedContrato(null);
    setSelectedTitulo(null);
    setShowNewTransactionModal(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, transactionId?: number) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      console.log('Iniciando upload de', files.length, 'arquivo(s)');
      
      const uploadPromises = Array.from(files).map(async (file) => {
        console.log('Processando arquivo:', {
          nome: file.name,
          tipo: file.type,
          tamanho: file.size
        });

        // Upload para o Supabase
        const result = await uploadFile(file);
        console.log('Resultado do upload Supabase:', result);

        // Enviar URL do arquivo para o N8N
        try {
          console.log('Enviando para N8N:', {
            fileUrl: result.url,
            fileName: file.name,
            uploadDate: new Date().toISOString(),
            fileSize: file.size,
            transactionId: transactionId || null
          });

          const response = await fetch('https://workflows.apanet.tec.br/webhook-test/retornobancario', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              fileUrl: result.url,
              fileName: file.name,
              uploadDate: new Date().toISOString(),
              fileSize: file.size,
              transactionId: transactionId || null
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Resposta de erro do N8N:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });
            throw new Error(`Erro ao enviar para N8N: ${response.status} - ${errorText || response.statusText}`);
          }

          const n8nResult = await response.json();
          console.log('Resposta do N8N:', n8nResult);
          toast.success('Arquivo processado com sucesso!');
        } catch (n8nError) {
          console.error('Erro ao enviar para N8N:', n8nError);
          toast.error('Arquivo enviado ao Supabase, mas houve erro ao processar');
        }
        
        return {
          path: result.path,
          url: result.url,
          name: file.name
        };
      });

      const attachments = await Promise.all(uploadPromises);
      console.log('Todos os arquivos foram processados:', attachments);

      if (transactionId) {
        setTransactions(prevTransactions =>
          prevTransactions.map(transaction =>
            transaction.id === transactionId
              ? {
                  ...transaction,
                  attachments: [...(transaction.attachments || []), ...attachments]
                }
              : transaction
          )
        );
      }

      toast.success('Arquivo(s) enviado(s) e processado(s) com sucesso!');
    } catch (error) {
      console.error('Erro detalhado ao fazer upload:', error);
      if (error instanceof Error) {
        toast.error(`Erro ao enviar arquivo(s): ${error.message}`);
      } else {
        toast.error('Erro ao enviar arquivo(s)');
      }
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const baseTransaction = {
      type: selectedType,
      description: formData.get('description') as string,
      category: selectedType === TRANSACTION_TYPES.EXPENSE ? formData.get('category') as string : 'Receita',
      value: parseFloat(formData.get('value') as string),
      date: formData.get('date') as string,
      status: formData.get('status') as string,
      paymentType: selectedType === TRANSACTION_TYPES.EXPENSE ? paymentType : 'single',
    };

    try {
      if (selectedType === TRANSACTION_TYPES.EXPENSE && paymentType !== 'single') {
        const transactions = [];
        const baseDate = new Date(baseTransaction.date);
        
        if (paymentType === 'installment') {
          // Criar transações para cada parcela
          const installmentValue = baseTransaction.value / installments;
          for (let i = 0; i < installments; i++) {
            const installmentDate = new Date(baseDate);
            installmentDate.setMonth(baseDate.getMonth() + i);
            
            transactions.push({
              ...baseTransaction,
              description: `${baseTransaction.description} (${i + 1}/${installments})`,
              value: installmentValue,
              date: installmentDate.toISOString().split('T')[0],
              installmentInfo: {
                currentInstallment: i + 1,
                totalInstallments: installments,
                originalValue: baseTransaction.value
              }
            });
          }
        } else if (paymentType === 'recurring') {
          // Criar transações mensais até a data final
          const endDate = new Date(recurringEndDate);
          let currentDate = new Date(baseDate);
          
          while (currentDate <= endDate) {
            transactions.push({
              ...baseTransaction,
              date: currentDate.toISOString().split('T')[0],
              recurringInfo: {
                isRecurring: true,
                startDate: baseDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
              }
            });
            
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        }

        // Salvar todas as transações
        for (const transaction of transactions) {
          await addTransaction(transaction);
        }

        toast.success(
          paymentType === 'installment'
            ? `Lançamento parcelado criado em ${installments}x`
            : 'Lançamento mensal recorrente criado'
        );
      } else {
        // Lançamento único
        await addTransaction(baseTransaction);
        toast.success('Lançamento criado com sucesso!');
      }

      setShowNewTransactionModal(false);
      await fetchTransactions(); // Atualizar a lista de transações
    } catch (error) {
      console.error('Erro ao criar lançamento:', error);
      toast.error('Erro ao criar lançamento');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Funções para gerenciar contratos
  const handleCancelarContrato = (contratoId: number) => {
    if (window.confirm('Tem certeza que deseja cancelar este contrato?')) {
      // TODO: Implementar chamada à API para cancelar contrato
      console.log('Cancelar contrato:', contratoId);
    }
  };

  const handleBloquearContrato = (contratoId: number) => {
    if (window.confirm('Tem certeza que deseja bloquear este contrato?')) {
      // TODO: Implementar chamada à API para bloquear contrato
      console.log('Bloquear contrato:', contratoId);
    }
  };

  const handleLiberar48h = (contratoId: number) => {
    if (window.confirm('Liberar acesso por 48 horas?')) {
      // TODO: Implementar chamada à API para liberar acesso temporário
      console.log('Liberar 48h para contrato:', contratoId);
    }
  };

  // Função para filtrar contratos baseado no status
  const filteredContratos = useMemo(() => {
    if (contractStatusFilter === 'all') {
      return MOCK_CONTRATOS_LISTA;
    }
    
    // TODO: Implementar a lógica de filtro específica para cada status
    // Por enquanto, retornamos todos os contratos
    return MOCK_CONTRATOS_LISTA;
  }, [contractStatusFilter]);

  const [currentContractsPage, setCurrentContractsPage] = useState(1);
  const contractsPerPage = 10;

  // Filtragem e paginação dos contratos
  const filteredAndPaginatedContratos = useMemo(() => {
    const indexOfLastContract = currentContractsPage * contractsPerPage;
    const indexOfFirstContract = indexOfLastContract - contractsPerPage;
    return contratos.filter(contrato => {
      if (contractStatusFilter === 'all') return true;
      return contrato.status?.toLowerCase() === contractStatusFilter.toLowerCase();
    }).slice(indexOfFirstContract, indexOfLastContract);
  }, [contratos, contractStatusFilter, currentContractsPage]);

  const totalContractsPages = Math.ceil(contratos.length / contractsPerPage);

  const handleContractsPageChange = (pageNumber: number) => {
    setCurrentContractsPage(pageNumber);
  };

  // Função para definir a cor do status do contrato
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100';
      case 'inativo':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100';
      case 'pendente':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100';
    }
  };

  // Efeito para carregar contratos
  useEffect(() => {
    const loadContratos = async () => {
      try {
        setIsLoadingContratos(true);
        const { data: contratosData, error } = await supabase
          .from('contratos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContratos(contratosData || []);
      } catch (error) {
        console.error('Erro ao carregar contratos:', error);
        toast.error('Erro ao carregar contratos');
      } finally {
        setIsLoadingContratos(false);
      }
    };

    if (activeView === 'contratos') {
      loadContratos();
    }
  }, [activeView]);

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [lancamentosLoading, setLancamentosLoading] = useState(true);

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLancamentos, setTotalLancamentos] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        let query = supabase.from('lancamentos').select('total');

        if (searchTerm) {
          query = query.ilike('descricao', `%${searchTerm}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        const totalReceitas = data.reduce((acc, lancamento) => {
          return lancamento.total > 0 ? acc + Number(lancamento.total) : acc;
        }, 0);

        const totalDespesas = data.reduce((acc, lancamento) => {
          return lancamento.total < 0 ? acc + Math.abs(Number(lancamento.total)) : acc;
        }, 0);

        setLancamentosSummary({
          totalIncome: totalReceitas,
          totalExpense: totalDespesas,
          balance: totalReceitas - totalDespesas
        });
      } catch (error) {
        console.error('Erro ao buscar totais:', error);
      }
    };

    if (activeView === 'caixa') {
      fetchTotals();
    }
  }, [activeView, searchTerm]);

  useEffect(() => {
    const fetchLancamentos = async () => {
      try {
        setLancamentosLoading(true);

        // Buscar o total de registros com filtro de busca, se houver
        const countQuery = supabase
          .from('lancamentos')
          .select('*', { count: 'exact', head: true });

        if (searchTerm) {
          countQuery.ilike('descricao', `%${searchTerm}%`);
        }

        const { count, error: countError } = await countQuery;

        if (countError) throw countError;
        
        setTotalLancamentos(count || 0);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));

        // Buscar os registros da página atual
        const dataQuery = supabase
          .from('lancamentos')
          .select('id, data_cad_lancamento, descricao, total')
          .order('data_cad_lancamento', { ascending: false });

        if (searchTerm) {
          dataQuery.ilike('descricao', `%${searchTerm}%`);
        }

        const { data, error: dataError } = await dataQuery
          .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

        if (dataError) throw dataError;
        
        setLancamentos(data || []);
      } catch (error) {
        console.error('Erro ao buscar lançamentos:', error);
        toast.error('Erro ao carregar lançamentos');
      } finally {
        setLancamentosLoading(false);
      }
    };

    if (activeView === 'caixa') {
      fetchLancamentos();
    }
  }, [activeView, currentPage, searchTerm]);

  // Estado para os totais
  const [lancamentosSummary, setLancamentosSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0
  });

  // Reset modal states
  const resetModalStates = () => {
    setSelectedType(TRANSACTION_TYPES.INCOME);
    setPaymentType('single');
    setInstallments(2);
    setRecurringEndDate('');
    setTransactionValue('');
  };

  // Fechar modal
  const handleCloseModal = () => {
    setShowNewTransactionModal(false);
    resetModalStates();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Cabeçalho elegante */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Financeiro
              </h1>
              <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-blue-600/20 to-transparent"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">
            Gerencie suas transações financeiras
          </p>
        </div>

        <div className="space-y-6">
          {/* Navegação e Arquivo de Retorno em um único card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-400/20 dark:shadow-gray-700/20 backdrop-blur-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Navegação - Ocupa 2 colunas */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Navegação</h3>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setActiveView('caixa')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      activeView === 'caixa'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <BanknotesIcon className="h-5 w-5" />
                    <span>Caixa</span>
                  </button>
                  <button
                    onClick={() => setActiveView('contratos')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      activeView === 'contratos'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    <span>Contratos</span>
                  </button>
                </div>
              </div>

              {/* Arquivo de Retorno - Ocupa 1 coluna */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Arquivo de Retorno</h3>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <input
                      type="file"
                      className="hidden"
                      id="retorno-upload"
                      accept=".ret"
                      onChange={handleFileUpload}
                    />
                    <label
                      htmlFor="retorno-upload"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                      <ArrowUpTrayIcon className="h-5 w-5" />
                      <span>Selecionar Arquivo</span>
                    </label>
                  </div>
                  {selectedFile && (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {selectedFile.name}
                      </span>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo Principal */}
          {activeView === 'caixa' ? (
            <div className="space-y-6">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.24)] backdrop-blur-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="rounded-full p-2 bg-emerald-100 dark:bg-emerald-900/50">
                        <ArrowTrendingUpIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receitas</p>
                        <h4 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                          R$ 5.000,00
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.24)] backdrop-blur-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="rounded-full p-2 bg-red-100 dark:bg-red-900/50">
                        <ArrowTrendingDownIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Despesas</p>
                        <h4 className="text-lg font-semibold text-red-600 dark:text-red-400">
                          R$ 3.000,00
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.24)] backdrop-blur-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/50">
                        <BanknotesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Saldo</p>
                        <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          R$ 2.000,00
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações do Caixa */}
              <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                <button
                  onClick={() => setShowNewTransactionModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Novo Lançamento
                </button>

                {/* Search Bar */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar transações..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all duration-200"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Tabela de Transações */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.24)] backdrop-blur-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Transações Recentes
                    </h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {lancamentosLoading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                              <span className="ml-2">Carregando lançamentos...</span>
                            </div>
                          </td>
                        </tr>
                      ) : lancamentos.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            {searchTerm ? 'Nenhum lançamento encontrado para a busca' : 'Nenhum lançamento encontrado'}
                          </td>
                        </tr>
                      ) : (
                        lancamentos.map((lancamento) => (
                          <tr
                            key={lancamento.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {lancamento.data_cad_lancamento ? new Date(lancamento.data_cad_lancamento).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {lancamento.descricao || '-'}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              lancamento.total >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(lancamento.total)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <button
                                onClick={() => {}} // Implementar edição
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => {}} // Implementar exclusão
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {!lancamentosLoading && lancamentos.length > 0 && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} até{' '}
                        {Math.min(currentPage * itemsPerPage, totalLancamentos)} de{' '}
                        {totalLancamentos} registros
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            currentPage === 1
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          Anterior
                        </button>
                        {[...Array(totalPages)].map((_, index) => {
                          const pageNumber = index + 1;
                          const isCurrentPage = pageNumber === currentPage;
                          const isNearCurrentPage = 
                            Math.abs(pageNumber - currentPage) <= 1 || 
                            pageNumber === 1 || 
                            pageNumber === totalPages;
                          
                          if (!isNearCurrentPage) {
                            if (pageNumber === 2 || pageNumber === totalPages - 1) {
                              return <span key={pageNumber} className="px-3 py-1">...</span>;
                            }
                            return null;
                          }

                          return (
                            <button
                              key={pageNumber}
                              onClick={() => setCurrentPage(pageNumber)}
                              className={`px-3 py-1 rounded-md text-sm font-medium ${
                                isCurrentPage
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            currentPage === totalPages
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filtro de Contratos */}
              <div className="backdrop-blur-xl rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filtros</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status do Contrato
                      </label>
                      <select
                        value={contractStatusFilter}
                        onChange={(e) => setContractStatusFilter(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all duration-200 px-3 py-2"
                      >
                        {CONTRACT_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Contratos */}
              <div className="backdrop-blur-xl rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Lista de Contratos</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PPPoE</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plano</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {isLoadingContratos ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                              <div className="flex justify-center items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                <span className="ml-2">Carregando contratos...</span>
                              </div>
                            </td>
                          </tr>
                        ) : contratos.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                              Nenhum contrato encontrado
                            </td>
                          </tr>
                        ) : (
                          filteredAndPaginatedContratos.map((contrato) => (
                            <tr key={contrato.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {contrato.cliente || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {contrato.pppoe || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {contrato.plano || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contrato.status)}`}>
                                  {contrato.status || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleBloquearContrato(contrato.id)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 mr-3"
                                >
                                  Bloquear
                                </button>
                                <button
                                  onClick={() => handleLiberar48h(contrato.id)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                  Liberar 48h
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  {contratos.length > 0 && (
                    <div className="flex justify-center mt-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleContractsPageChange(Math.max(currentContractsPage - 1, 1))}
                          disabled={currentContractsPage === 1}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            currentContractsPage === 1
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          Anterior
                        </button>
                        {[...Array(totalContractsPages)].map((_, index) => {
                          const pageNumber = index + 1;
                          const isCurrentPage = pageNumber === currentContractsPage;
                          const isNearCurrentPage = 
                            Math.abs(pageNumber - currentContractsPage) <= 1 || 
                            pageNumber === 1 || 
                            pageNumber === totalContractsPages;
                          
                          if (!isNearCurrentPage) {
                            if (pageNumber === 2 || pageNumber === totalContractsPages - 1) {
                              return <span key={pageNumber} className="px-3 py-1">...</span>;
                            }
                            return null;
                          }

                          return (
                            <button
                              key={pageNumber}
                              onClick={() => handleContractsPageChange(pageNumber)}
                              className={`px-3 py-1 rounded-md text-sm font-medium ${
                                isCurrentPage
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => handleContractsPageChange(Math.min(currentContractsPage + 1, totalContractsPages))}
                          disabled={currentContractsPage === totalContractsPages}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            currentContractsPage === totalContractsPages
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Nova Transação */}
        {showNewTransactionModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => handleCloseModal()}></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 shadow-xl">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    onClick={() => handleCloseModal()}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Novo Lançamento</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Tipo de Lançamento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo de Lançamento
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setSelectedType(TRANSACTION_TYPES.INCOME)}
                        className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                          selectedType === TRANSACTION_TYPES.INCOME
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_8px_30px_rgb(16,185,129,0.12)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.24)]'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <ArrowTrendingUpIcon className={`h-5 w-5 mr-2 ${
                          selectedType === TRANSACTION_TYPES.INCOME
                            ? 'text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`} />
                        Receita
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedType(TRANSACTION_TYPES.EXPENSE)}
                        className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                          selectedType === TRANSACTION_TYPES.EXPENSE
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_8px_30px_rgb(239,68,68,0.12)] hover:shadow-[0_8px_30px_rgb(239,68,68,0.24)]'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <ArrowTrendingDownIcon className={`h-5 w-5 mr-2 ${
                          selectedType === TRANSACTION_TYPES.EXPENSE
                            ? 'text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`} />
                        Despesa
                      </button>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Descrição
                    </label>
                    <input
                      type="text"
                      name="description"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Categoria */}
                  {selectedType === TRANSACTION_TYPES.EXPENSE && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Categoria
                      </label>
                      <div className="relative">
                        <select
                          name="category"
                          required
                          onChange={(e) => {
                            if (e.target.value === 'new') {
                              setShowNewCategoryModal(true);
                              e.target.value = expenseCategories[0]; // Reset to first option
                            }
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {expenseCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="new" className="font-medium text-blue-600 dark:text-blue-400">
                            + Adicionar nova categoria
                          </option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Tipo de Pagamento - Apenas para Despesa */}
                  {selectedType === TRANSACTION_TYPES.EXPENSE && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tipo de Pagamento
                        </label>
                        <div className="mt-2 grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setPaymentType('single')}
                            className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium
                              ${paymentType === 'single'
                                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-200'
                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                              }`}
                          >
                            À Vista
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentType('installment')}
                            className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium
                              ${paymentType === 'installment'
                                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-200'
                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                              }`}
                          >
                            Parcelado
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentType('recurring')}
                            className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium
                              ${paymentType === 'recurring'
                                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-200'
                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                              }`}
                          >
                            Mensal
                          </button>
                        </div>
                      </div>

                      {/* Opções específicas para pagamento parcelado */}
                      {paymentType === 'installment' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Número de Parcelas
                          </label>
                          <input
                            type="number"
                            name="installments"
                            min="2"
                            max="48"
                            value={installments}
                            onChange={(e) => setInstallments(Math.max(2, Math.min(48, parseInt(e.target.value) || 2)))}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Valor por parcela: R$ {(parseFloat(transactionValue || '0') / installments).toFixed(2)}
                          </p>
                        </div>
                      )}

                      {/* Opções específicas para pagamento mensal */}
                      {paymentType === 'recurring' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Data Final da Recorrência
                          </label>
                          <input
                            type="date"
                            name="recurringEndDate"
                            value={recurringEndDate}
                            onChange={(e) => setRecurringEndDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Valor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valor
                    </label>
                    <input
                      type="number"
                      name="value"
                      step="0.01"
                      required
                      value={transactionValue}
                      onChange={(e) => setTransactionValue(e.target.value)}
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Data */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Data
                    </label>
                    <input
                      type="date"
                      name="date"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <select
                      name="status"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="PAGO">Pago</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => handleCloseModal()}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Nova Categoria */}
        {showNewCategoryModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                onClick={() => setShowNewCategoryModal(false)}
              ></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    onClick={() => setShowNewCategoryModal(false)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Nova Categoria
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome da Categoria
                    </label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Digite o nome da categoria"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Financeiro;
