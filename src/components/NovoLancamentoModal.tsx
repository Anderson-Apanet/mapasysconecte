import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Combobox, Switch } from '@headlessui/react';
import { XMarkIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CheckIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabaseClient';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { 
  TRANSACTION_TYPES,
  Cliente,
  Contrato,
  Titulo,
  FORMAS_PAGAMENTO,
  CATEGORIES,
  Lancamento
} from '../types/financeiro';
import { CaixaStatus } from '../types/caixa';

interface NovoLancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  caixaStatus: CaixaStatus;
  lancamentoToEdit?: Lancamento | null;
}

export default function NovoLancamentoModal({ 
  isOpen, 
  onClose, 
  onSave, 
  caixaStatus,
  lancamentoToEdit 
}: NovoLancamentoModalProps) {
  // Estado para controlar o tipo de lançamento selecionado
  const [selectedType, setSelectedType] = useState<'RECEITA' | 'DESPESA' | null>(null);

  // Estados para o fluxo de receita
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [isLoadingContratos, setIsLoadingContratos] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [isLoadingTitulos, setIsLoadingTitulos] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<Titulo | null>(null);

  // Estados para o formulário
  const [formData, setFormData] = useState({
    titulo_id: 0,
    valor: '',
    valor_numerico: 0,
    data_vencimento: '',
    descricao: '',
    cliente_id: 0,
    cliente_nome: '',
    cliente_cpf_cnpj: '',
    categoria_id: 0,
    categoria_nome: '',
    tipo: '',
    parcelas: 1,
    data_inicio: '',
    data_fim: '',
    recorrente: false,
  });

  const [descricao, setDescricao] = useState('');

  const [valor, setValor] = useState('R$ 0,00');
  const [dataVencimento, setDataVencimento] = useState('');
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [juros, setJuros] = useState('0');
  const [multa, setMulta] = useState('R$ 0,00');
  const [valorTotal, setValorTotal] = useState('R$ 0,00');
  const [formasPagamento, setFormasPagamento] = useState({
    pix: 'R$ 0,00',
    credito: 'R$ 0,00',
    debito: 'R$ 0,00',
    dinheiro: 'R$ 0,00'
  });
  const [loading, setLoading] = useState(false);
  const [troco, setTroco] = useState('R$ 0,00');

  // Estados para o formulário de despesas
  const [categoria, setCategoria] = useState('');
  const [categorias, setCategorias] = useState<any[]>([]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [paymentType, setPaymentType] = useState<'single' | 'installment' | 'recurring'>('single');
  const [installments, setInstallments] = useState(2);
  const [recurringEndDate, setRecurringEndDate] = useState('');

  // Estado para busca de cliente
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Estado para controlar o debounce da busca
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Estado para armazenar os dados do formulário
  

  // Estado para desconto
  const [mostrarDesconto, setMostrarDesconto] = useState(false);
  const [tipoDesconto, setTipoDesconto] = useState<'valor' | 'percentual'>('valor');
  const [desconto, setDesconto] = useState('');
  const [valorComDesconto, setValorComDesconto] = useState('R$ 0,00');

  // Função para buscar clientes
  const searchClientes = async (search: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cpf_cnpj, fonewhats')
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

  // Efeito para buscar clientes quando a query muda
  useEffect(() => {
    // Limpa o timeout anterior se existir
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Só busca se tiver pelo menos 2 caracteres
    if (query.length >= 2) {
      // Cria um novo timeout para fazer a busca após 300ms
      const timeout = setTimeout(() => {
        searchClientes(query);
      }, 300);

      setSearchTimeout(timeout);
    } else {
      setClientes([]);
    }

    // Limpa o timeout quando o componente for desmontado
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [query]);

  useEffect(() => {
    if (selectedType === 'RECEITA') {
      fetchClientes();
    } else if (selectedType === 'DESPESA') {
      fetchCategorias();
    }
  }, [selectedType]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  useEffect(() => {
    if (isOpen && selectedType === 'DESPESA') {
      fetchCategorias();
    }
  }, [isOpen, selectedType]);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_lancamentos')
        .select('id, nome')
        .eq('tipo', 'despesa')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        toast.error('Erro ao carregar categorias');
        return;
      }

      console.log('Categorias carregadas:', data);
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast.error('Erro ao carregar categorias');
    }
  };

  // Função para buscar contratos do cliente
  const fetchContratosCliente = async (clienteId: number) => {
    setIsLoadingContratos(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('id_cliente', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast.error('Erro ao buscar contratos');
    } finally {
      setIsLoadingContratos(false);
    }
  };

  // Função para selecionar cliente
  const handleClienteSelect = (cliente: Cliente | null) => {
    setSelectedCliente(cliente);
    if (cliente) {
      fetchContratosCliente(cliente.id);
    } else {
      setContratos([]);
      setSelectedContrato(null);
    }
  };

  // Função para buscar títulos não pagos do contrato
  const fetchTitulosContrato = async (pppoe: string) => {
    setIsLoadingTitulos(true);
    try {
      const { data, error } = await supabase
        .from('titulos')
        .select('*')
        .eq('pppoe', pppoe)
        .eq('pago', false)
        .order('vencimento');

      if (error) throw error;
      setTitulos(data || []);
    } catch (error) {
      console.error('Erro ao buscar títulos:', error);
      toast.error('Erro ao buscar títulos');
    } finally {
      setIsLoadingTitulos(false);
    }
  };

  // Função para selecionar contrato
  const handleContratoSelect = (contrato: Contrato | null) => {
    setSelectedContrato(contrato);
    setSelectedTitulo(null);
    if (contrato && contrato.pppoe) {
      fetchTitulosContrato(contrato.pppoe);
    } else {
      setTitulos([]);
    }
  };

  // Função auxiliar para formatar valores em Real
  const formatarMoeda = (valor: number): string => {
    return `R$ ${(valor / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Função auxiliar para converter string de moeda em número
  const parseMoeda = (valor: string): number => {
    if (!valor) return 0;
    // Remove 'R$ ' e converte '1.234,56' para '1234.56'
    return Number(valor.replace('R$ ', '').replace('.', '').replace(',', '.'));
  };

  // Função para lidar com a mudança no input de valor
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoValor = e.target.value.replace(/\D/g, '');
    if (novoValor === '') {
      setValor('R$ 0,00');
      return;
    }
    setValor(formatarMoeda(Number(novoValor)));
  };

  // Função para lidar com entrada de valores monetários
  const handleValorInput = (valor: string) => {
    // Remove tudo exceto números
    const numbers = valor.replace(/\D/g, '');
    
    // Converte para centavos
    const cents = Number(numbers) / 100;
    
    return formatarMoeda(cents);
  };

  // Função para calcular o total das formas de pagamento
  const calcularTotalFormasPagamento = (formas = formasPagamento) => {
    let total = 0;
    // Soma todos os valores das formas de pagamento
    for (const valor of Object.values(formas)) {
      total += parseMoeda(valor);
    }
    return total;
  };

  // Função para calcular o troco
  const calcularTroco = (totalPago: number, valorAPagar: number) => {
    // Calcula a diferença entre o total pago e o valor a pagar
    const diferenca = totalPago - valorAPagar;
    // Retorna 0 se a diferença for negativa, caso contrário retorna a diferença
    return diferenca > 0 ? diferenca : 0;
  };

  // Função para atualizar forma de pagamento com formatação
  const handleFormaPagamentoChange = (tipo: keyof typeof formasPagamento, valor: string) => {
    const novoValor = valor.replace(/\D/g, '');
    
    // Atualiza o objeto de formas de pagamento
    const novasFormasPagamento = {
      ...formasPagamento,
      [tipo]: novoValor === '' ? 'R$ 0,00' : formatarMoeda(Number(novoValor))
    };
    
    // Atualiza o estado com as novas formas de pagamento
    setFormasPagamento(novasFormasPagamento);

    // Calcula o total pago somando todas as formas de pagamento
    const totalPago = calcularTotalFormasPagamento(novasFormasPagamento);

    // Pega o valor final a ser pago (considerando desconto se houver)
    const valorFinalAPagar = valorComDesconto ? parseMoeda(valorComDesconto) : parseMoeda(valorTotal);

    // Calcula e atualiza o troco
    const trocoCalculado = calcularTroco(totalPago, valorFinalAPagar);
    setTroco(formatarMoeda(trocoCalculado * 100));
  };

  // Função para calcular juros e multa
  const calcularJurosEMulta = (valorBase: number, dataVenc: Date, dataPag: Date) => {
    let juros = 0;
    let multa = 0;
    let total = valorBase;

    if (dataPag > dataVenc) {
      // Calcula a diferença em meses
      const diffTime = Math.abs(dataPag.getTime() - dataVenc.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = Math.ceil(diffDays / 30);

      // Juros de 1.5% ao mês
      juros = valorBase * (0.015 * diffMonths);
      
      // Multa fixa de R$ 2,00
      multa = 2;
      
      total = valorBase + juros + multa;
    }

    return { juros, multa, total };
  };

  // Função para aplicar desconto
  const aplicarDesconto = (valor: string) => {
    if (!valor) {
      setValorComDesconto(valorTotal);
      setDesconto('');
      return;
    }

    const valorTotalNumerico = parseMoeda(valorTotal);
    let novoValor = valorTotalNumerico;

    if (tipoDesconto === 'valor') {
      // Remove caracteres não numéricos
      const valorLimpo = valor.replace(/\D/g, '');
      // Formata o valor como moeda
      const valorFormatado = formatarMoeda(Number(valorLimpo));
      setDesconto(valorFormatado);
      
      const descontoNumerico = parseMoeda(valorFormatado);
      novoValor = valorTotalNumerico - descontoNumerico;
    } else { // percentual
      const valorLimpo = valor.replace(/[^\d]/g, '');
      const valorFormatado = valorLimpo ? `${valorLimpo}%` : '';
      setDesconto(valorFormatado);
      
      const percentual = Number(valorLimpo);
      if (!isNaN(percentual)) {
        novoValor = valorTotalNumerico * (1 - (percentual / 100));
      }
    }

    // Atualiza o valor com desconto
    setValorComDesconto(formatarMoeda(Math.max(0, novoValor * 100)));

    // Recalcula o troco com o novo valor após desconto
    const totalPago = calcularTotalFormasPagamento();
    const trocoCalculado = calcularTroco(totalPago, novoValor);
    setTroco(formatarMoeda(trocoCalculado * 100));
  };

  // Função para mudar o tipo de desconto
  const handleTipoDescontoChange = (tipo: 'valor' | 'percentual') => {
    setTipoDesconto(tipo);
    setDesconto('');
    setValorComDesconto(valorTotal);
  };

  // Função para formatar data
  const formatarData = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy');
  };

  // Função para gerar o resumo do lançamento
  const gerarResumo = () => {
    const resumo = {
      tipo: selectedType,
      cliente: selectedCliente?.nome || '',
      contrato: selectedContrato?.pppoe || '',
      titulo: selectedTitulo?.id ? `#${selectedTitulo.id}` : '',
      valor: valorTotal,
      dataVencimento: selectedTitulo?.vencimento ? formatarData(selectedTitulo.vencimento) : '',
      dataPagamento: formatarData(dataPagamento),
      juros: juros,
      multa: multa,
      desconto: desconto ? (tipoDesconto === 'valor' ? desconto : `${desconto} (${valorComDesconto})`) : 'Sem desconto',
      valorFinal: valorComDesconto || valorTotal,
      formasPagamento: Object.entries(formasPagamento)
        .filter(([_, valor]) => valor && parseMoeda(valor) > 0)
        .map(([forma, valor]) => `${forma.toUpperCase()}: ${valor}`)
        .join(', '),
      troco: troco !== 'R$ 0,00' ? troco : 'Sem troco'
    };

    return resumo;
  };

  // Efeito para carregar dados do lançamento quando estiver editando
  useEffect(() => {
    if (lancamentoToEdit) {
      // Set transaction type
      setSelectedType(lancamentoToEdit.tipopag === 'RECEITA' ? 'RECEITA' : 'DESPESA');
      
      // Set basic form data
      setDescricao(lancamentoToEdit.descricao || '');
      setValor(formatarMoeda(lancamentoToEdit.total * 100));
      setDataPagamento(format(new Date(lancamentoToEdit.data_pagamento || new Date()), 'yyyy-MM-dd'));
      
      // Set payment methods
      setFormasPagamento({
        pix: formatarMoeda((lancamentoToEdit.entrada_pixsicredi || 0) * 100),
        credito: formatarMoeda((lancamentoToEdit.entrada_cartaocredito || 0) * 100),
        debito: formatarMoeda((lancamentoToEdit.entrada_cartaodebito || 0) * 100),
        dinheiro: formatarMoeda((lancamentoToEdit.entrada_dinheiro || 0) * 100)
      });

      // Set additional values
      setJuros(lancamentoToEdit.juros?.toString() || '0');
      setMulta(formatarMoeda((lancamentoToEdit.multa || 0) * 100));
      setValorTotal(formatarMoeda(lancamentoToEdit.total * 100));
      setValorComDesconto(formatarMoeda(lancamentoToEdit.total * 100));

      // Set category if it's an expense
      if (lancamentoToEdit.tipopag === 'DESPESA') {
        setCategoria(lancamentoToEdit.categoria_id?.toString() || '');
      }

      // Set client if it's a revenue
      if (lancamentoToEdit.tipopag === 'RECEITA' && lancamentoToEdit.id_cliente) {
        fetchClienteById(lancamentoToEdit.id_cliente);
      }
    }
  }, [lancamentoToEdit]);

  // Função para buscar cliente por ID
  const fetchClienteById = async (clienteId: number) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedCliente(data);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
    }
  };

  // Função para salvar o lançamento
  const handleSave = async () => {
    try {
      setLoading(true);
      console.log('Iniciando salvamento...', { 
        selectedType, 
        valor, 
        valorTotal,
        descricao,
        formData,
        caixaStatus,
        selectedTitulo
      });

      // Verificar se o caixa está aberto
      if (!caixaStatus?.isOpen || !caixaStatus?.caixaAtual?.id) {
        toast.error('Não é possível realizar lançamentos com o caixa fechado');
        setLoading(false);
        return;
      }

      // Pegar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Buscar o nome do usuário e o ID da empresa na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('nome, empresa_id')
        .eq('id_user', user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar informações do usuário:', userError);
      }

      const nomeUsuario = userData?.nome || user.email;
      const empresaId = userData?.empresa_id;
      
      console.log('ID da empresa do usuário:', empresaId);

      // Determinar o valor correto baseado no tipo de lançamento
      let valorFinal = selectedType === 'RECEITA' ? 
        parseMoeda(valorTotal) : 
        parseMoeda(valor);

      // Se houver desconto e for receita, usar o valor com desconto
      if (valorComDesconto && selectedType === 'RECEITA') {
        valorFinal = parseMoeda(valorComDesconto);
      }

      // Preparar dados do lançamento
      const lancamentoData = {
        ...(lancamentoToEdit?.id ? { id: lancamentoToEdit.id } : {}), // Manter ID apenas ao editar
        id_caixa: caixaStatus.caixaAtual.id,
        data_pagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
        descricao: formData.descricao || descricao,
        total: valorFinal,
        subtotal: valorFinal,
        saidas: selectedType === 'DESPESA' ? valorFinal : 0,
        entradas: selectedType === 'RECEITA' ? valorFinal : 0,
        data_cad_lancamento: lancamentoToEdit ? new Date(lancamentoToEdit.data_cad_lancamento) : new Date(),
        tipopag: selectedType,
        entrada_pixsicredi: selectedType === 'RECEITA' ? parseMoeda(formasPagamento.pix) : 0,
        entrada_cartaocredito: selectedType === 'RECEITA' ? parseMoeda(formasPagamento.credito) : 0,
        entrada_cartaodebito: selectedType === 'RECEITA' ? parseMoeda(formasPagamento.debito) : 0,
        entrada_dinheiro: selectedType === 'RECEITA' ? parseMoeda(formasPagamento.dinheiro) : 0,
        troco: selectedType === 'RECEITA' ? parseMoeda(troco) : 0,
        quemrecebeu: nomeUsuario,
        desconto: valorComDesconto && selectedType === 'RECEITA' ? (parseMoeda(valorTotal) - parseMoeda(valorComDesconto)) : 0,
        desconto_porcentagem: tipoDesconto === 'percentual' ? Number(desconto.replace('%', '')) : 0,
        titulo: selectedType === 'RECEITA' && selectedTitulo ? true : false,
        total_recebido: selectedType === 'RECEITA' ? calcularTotalFormasPagamento() : valorFinal,
        juros: selectedType === 'RECEITA' ? parseMoeda(juros) : 0,
        multa: selectedType === 'RECEITA' ? parseMoeda(multa) : 0,
        titulobancario: selectedType === 'RECEITA' ? selectedTitulo?.nossonumero || null : null,
        id_categoria: selectedType === 'DESPESA' ? categoria : null,
        pago_boleto: false,
        empresa_id: empresaId // Adiciona o ID da empresa do usuário
      };

      console.log('Dados do lançamento antes de salvar:', lancamentoData);

      // Armazenar informações adicionais do título para uso no recibo
      // Essas informações não serão salvas na tabela lancamentos, mas serão usadas
      // pelo componente ReciboTermico para gerar o recibo
      const tituloInfo = selectedType === 'RECEITA' && selectedTitulo ? {
        nossonumero: selectedTitulo.nossonumero,
        vencimento: selectedTitulo.vencimento,
        titulo_id: selectedTitulo.id
      } : null;

      console.log('Informações adicionais do título para recibo:', tituloInfo);

      let result;
      if (lancamentoToEdit) {
        // Update existing transaction
        result = await supabase
          .from('lancamentos')
          .update(lancamentoData)
          .eq('id', lancamentoToEdit.id);
      } else {
        // Insert new transaction - mantém o campo id pois a tabela não gera automaticamente
        result = await supabase
          .from('lancamentos')
          .insert([lancamentoData])
          .select();
      }

      const { error, data } = result;
      console.log('Resultado da operação:', { error, data });

      if (error) {
        console.error('Erro ao salvar lançamento:', error);
        throw error;
      }

      // Se for receita e tiver um título selecionado, atualiza ele para pago
      if (selectedType === 'RECEITA' && selectedTitulo?.nossonumero) {
        console.log('Atualizando título para pago:', {
          nossonumero: selectedTitulo.nossonumero
        });

        const { error: updateError } = await supabase
          .from('titulos')
          .update({ pago: true })
          .eq('nossonumero', selectedTitulo.nossonumero);

        if (updateError) {
          console.error('Erro ao atualizar título:', updateError);
          throw new Error('Erro ao atualizar status do título');
        }
      }

      toast.success(lancamentoToEdit ? 'Lançamento atualizado com sucesso!' : 'Lançamento salvo com sucesso!');
      onSave(); // Chama a função de callback para atualizar a lista de lançamentos
      handleClose(); // Fecha o modal e limpa os estados
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      toast.error(error.message || 'Erro ao salvar lançamento');
    } finally {
      setLoading(false);
    }
  };

  // Função para iniciar o processo de salvamento
  const handleSaveInit = () => {
    console.log('Iniciando validação...', { 
      selectedType, 
      valor, 
      valorTotal,
      descricao,
      formData,
      caixaStatus,
      selectedTitulo
    });

    if (!caixaStatus?.isOpen || !caixaStatus?.caixaAtual) {
      toast.error('Não é possível realizar lançamentos com o caixa fechado!');
      return;
    }

    if (!selectedType) {
      toast.error('Selecione o tipo de lançamento');
      return;
    }

    // Verifica o valor apropriado baseado no tipo de lançamento
    const valorAtual = selectedType === 'RECEITA' ? valorTotal : valor;
    const valorNumerico = parseMoeda(valorAtual);

    console.log('Valor para validação:', { valorAtual, valorNumerico });

    if (!valorAtual || valorNumerico <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    // Verifica a descrição do formData
    const descricaoAtual = formData.descricao || descricao;
    console.log('Descrição atual:', { descricaoAtual, formData, descricao });

    if (!descricaoAtual?.trim()) {
      toast.error('Informe a descrição');
      return;
    }

    // Validações específicas para RECEITA
    if (selectedType === 'RECEITA') {
      if (!selectedCliente) {
        toast.error('Selecione um cliente');
        return;
      }

      const totalFormasPagamento = calcularTotalFormasPagamento();
      const valorTotalNumerico = parseMoeda(valorComDesconto || valorTotal);
      
      if (totalFormasPagamento < valorTotalNumerico) {
        toast.error('O total das formas de pagamento deve ser igual ou maior que o valor total');
        return;
      }
    }

    // Se passou nas validações, salva o lançamento
    handleSave();
  };

  // Atualizar campos quando um título for selecionado
  const handleTituloChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const tituloId = Number(event.target.value);
    const tituloSelecionado = titulos.find((titulo) => titulo.id === tituloId);
    
    if (tituloSelecionado) {
      setSelectedTitulo(tituloSelecionado);
      // Multiplicar o valor por 100 para converter para centavos antes de formatar
      const valor = tituloSelecionado.valor * 100;
      
      setFormData(prev => ({
        ...prev,
        titulo_id: tituloId,
        valor: formatarMoeda(valor),
        valor_numerico: valor,
        data_vencimento: format(new Date(tituloSelecionado.vencimento), 'yyyy-MM-dd'),
        descricao: `Pagamento de título - Contrato ${selectedContrato?.pppoe}`
      }));

      const vencimento = new Date(tituloSelecionado.vencimento);
      const pagamento = new Date(dataPagamento);
      
      const { juros, multa, total } = calcularJurosEMulta(valor, vencimento, pagamento);
      
      setJuros(formatarMoeda(juros));
      setMulta(formatarMoeda(multa));
      setValorTotal(formatarMoeda(total));
      setValorComDesconto(formatarMoeda(total));
      setDesconto('');
    }
  };

  // Atualizar cálculos quando a data de pagamento mudar
  const handleDataPagamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaData = e.target.value;
    setDataPagamento(novaData);

    if (selectedTitulo) {
      const valor = selectedTitulo.valor * 100;
      const vencimento = new Date(selectedTitulo.vencimento);
      const pagamento = new Date(novaData);
      
      const { juros, multa, total } = calcularJurosEMulta(valor, vencimento, pagamento);
      
      setJuros(formatarMoeda(juros));
      setMulta(formatarMoeda(multa));
      setValorTotal(formatarMoeda(total));
      setValorComDesconto(formatarMoeda(total));
    }
  };

  // Função para limpar o estado e fechar o modal
  const handleClose = () => {
    setSelectedType(null);
    setSelectedCliente(null);
    setContratos([]);
    setSelectedContrato(null);
    setTitulos([]);
    setSelectedTitulo(null);
    setDescricao('');
    setValor('R$ 0,00');
    setDataVencimento('');
    setDataPagamento(format(new Date(), 'yyyy-MM-dd'));
    setJuros('0');
    setMulta('R$ 0,00');
    setValorTotal('R$ 0,00');
    setFormasPagamento({
      pix: 'R$ 0,00',
      credito: 'R$ 0,00',
      debito: 'R$ 0,00',
      dinheiro: 'R$ 0,00'
    });
    setTroco('R$ 0,00');
    setCategoria('');
    setPaymentType('single');
    setInstallments(2);
    setRecurringEndDate('');
    setQuery('');
    setMostrarDesconto(false);
    setTipoDesconto('valor');
    setDesconto('');
    setValorComDesconto('R$ 0,00');
    setFormData({
      titulo_id: 0,
      valor: '',
      valor_numerico: 0,
      data_vencimento: '',
      descricao: '',
      cliente_id: 0,
      cliente_nome: '',
      cliente_cpf_cnpj: '',
      categoria_id: 0,
      categoria_nome: '',
      tipo: '',
      parcelas: 1,
      data_inicio: '',
      data_fim: '',
      recorrente: false,
    });
    onClose();
  };

  // Resetar estados quando o modal é fechado
  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setSelectedCliente(null);
      setSelectedContrato(null);
      setSelectedTitulo(null);
      setDescricao('');
      setValor('R$ 0,00');
      setDataVencimento('');
      setDataPagamento(format(new Date(), 'yyyy-MM-dd'));
      setJuros('0');
      setMulta('R$ 0,00');
      setValorTotal('R$ 0,00');
      setFormasPagamento({
        pix: 'R$ 0,00',
        credito: 'R$ 0,00',
        debito: 'R$ 0,00',
        dinheiro: 'R$ 0,00'
      });
      setTroco('R$ 0,00');
      setCategoria('');
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setPaymentType('single');
      setInstallments(2);
      setRecurringEndDate('');
      setFormData({
        titulo_id: 0,
        valor: '',
        valor_numerico: 0,
        data_vencimento: '',
        descricao: '',
        cliente_id: 0,
        cliente_nome: '',
        cliente_cpf_cnpj: '',
        categoria_id: 0,
        categoria_nome: '',
        tipo: '',
        parcelas: 1,
        data_inicio: '',
        data_fim: '',
        recorrente: false,
      });
      setMostrarDesconto(false);
      setTipoDesconto('valor');
      setDesconto('');
      setValorComDesconto('R$ 0,00');
    }
  }, [isOpen]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Digite um nome para a categoria');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categorias_lancamentos')
        .insert([{ 
          nome: newCategoryName.trim(),
          tipo: 'despesa'
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar categoria:', error);
        toast.error('Erro ao criar categoria. Por favor, tente novamente.');
        return;
      }

      // Atualiza a lista de categorias e seleciona a nova categoria
      setCategorias(prev => [...prev, data]);
      setCategoria(data.id);
      setNewCategoryName('');
      setIsCreatingCategory(false);
      toast.success('Categoria criada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao criar categoria:', error);
      toast.error(error.message || 'Erro ao criar categoria. Por favor, tente novamente.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log('Input changed:', { name, value });
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Se for o campo de descrição, atualiza também o estado descricao
    if (name === 'descricao') {
      setDescricao(value);
    }
  };

  return (
    <Fragment>
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                  {selectedType === 'RECEITA' ? (
                    <ArrowTrendingUpIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                  )}
                </div>
                <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Novo Lançamento
                </Dialog.Title>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={handleClose}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto px-4 pb-4 sm:px-6">
            {/* Seleção do Tipo de Lançamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Tipo de Lançamento
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedType('RECEITA')}
                  className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    selectedType === 'RECEITA'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('DESPESA')}
                  className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    selectedType === 'DESPESA'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <ArrowTrendingDownIcon className="h-5 w-5 mr-2" />
                  Despesa
                </button>
              </div>
            </div>

            {/* Campos específicos para RECEITA */}
            {selectedType === 'RECEITA' && (
              <>
                {/* Seleção de Cliente com Searchbox */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Cliente
                  </label>
                  <Combobox value={selectedCliente} onChange={handleClienteSelect}>
                    <div className="relative mt-1">
                      <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white dark:bg-gray-700 text-left border border-gray-300 dark:border-gray-600 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                        <Combobox.Input
                          className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-0"
                          placeholder="Buscar cliente..."
                          displayValue={(cliente: Cliente | null) => cliente?.nome || ''}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                          <MagnifyingGlassIcon
                            className="h-5 w-5 text-gray-400 dark:text-gray-300"
                            aria-hidden="true"
                          />
                        </Combobox.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery('')}
                      >
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-600 focus:outline-none sm:text-sm">
                          {isSearching ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                              Buscando...
                            </div>
                          ) : clientes.length === 0 && query !== '' ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                              Nenhum cliente encontrado.
                            </div>
                          ) : (
                            clientes.map((cliente) => (
                              <Combobox.Option
                                key={cliente.id}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                    active ? 'bg-primary-600 text-white' : 'text-gray-900 dark:text-white'
                                  }`
                                }
                                value={cliente}
                              >
                                {({ selected, active }) => (
                                  <>
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'} ${
                                      active ? 'text-white' : 'text-gray-900 dark:text-white'
                                    }`}>
                                      {cliente.nome}
                                    </span>
                                    {selected ? (
                                      <span
                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                          active ? 'text-white' : 'text-primary-600 dark:text-primary-400'
                                        }`}
                                      >
                                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Combobox.Option>
                            ))
                          )}
                        </Combobox.Options>
                      </Transition>
                    </div>
                  </Combobox>
                </div>

                {/* Seleção de Contrato */}
                {selectedCliente && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Contrato
                    </label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      value={selectedContrato?.id || ''}
                      onChange={(e) => {
                        const contrato = contratos.find(c => c.id === parseInt(e.target.value));
                        handleContratoSelect(contrato || null);
                      }}
                    >
                      <option value="">Selecione um contrato</option>
                      {isLoadingContratos ? (
                        <option value="" disabled>Carregando contratos...</option>
                      ) : contratos.length > 0 ? (
                        contratos.map((contrato) => (
                          <option key={contrato.id} value={contrato.id}>
                            {contrato.numero} - {contrato.pppoe} - {contrato.plano} ({contrato.status})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Nenhum contrato encontrado</option>
                      )}
                    </select>
                  </div>
                )}

                {/* Seleção de Título */}
                {selectedContrato && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Título
                    </label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      value={selectedTitulo?.id || ''}
                      onChange={handleTituloChange}
                    >
                      <option value="">Selecione um título</option>
                      {isLoadingTitulos ? (
                        <option value="" disabled>Carregando títulos...</option>
                      ) : titulos.length > 0 ? (
                        titulos.map((titulo) => (
                          <option key={titulo.id} value={titulo.id}>
                            Venc: {format(new Date(titulo.vencimento), 'dd/MM/yyyy')} - Nº {titulo.nossonumero} - {formatarMoeda(titulo.valor * 100)}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Nenhum título pendente encontrado</option>
                      )}
                    </select>
                  </div>
                )}

                {/* Campos do lançamento */}
                {selectedTitulo && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Descrição
                      </label>
                      <textarea
                        id="descricao"
                        name="descricao"
                        value={formData.descricao}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={2}
                        placeholder="Digite a descrição do lançamento"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Valor
                        </label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                          value={formData.valor}
                          readOnly
                        />
                      </div>
                      {parseMoeda(multa) > 0 && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                              Multa
                            </label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                              value={multa}
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                              Juros
                            </label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                              value={juros}
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                              Total a Pagar
                            </label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-600 font-medium"
                              value={valorTotal}
                              readOnly
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Data Vencimento
                        </label>
                        <input
                          type="date"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                          value={formData.data_vencimento}
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Data Pagamento
                        </label>
                        <input
                          type="date"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                          value={dataPagamento}
                          onChange={handleDataPagamentoChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Formas de Pagamento
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            PIX
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                            value={formasPagamento.pix}
                            onChange={(e) => handleFormaPagamentoChange('pix', e.target.value)}
                            placeholder="R$ 0,00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Crédito
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                            value={formasPagamento.credito}
                            onChange={(e) => handleFormaPagamentoChange('credito', e.target.value)}
                            placeholder="R$ 0,00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Débito
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                            value={formasPagamento.debito}
                            onChange={(e) => handleFormaPagamentoChange('debito', e.target.value)}
                            placeholder="R$ 0,00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Dinheiro
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                            value={formasPagamento.dinheiro}
                            onChange={(e) => handleFormaPagamentoChange('dinheiro', e.target.value)}
                            placeholder="R$ 0,00"
                          />
                        </div>
                        {parseMoeda(troco) > 0 && (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                              Troco
                            </label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-yellow-50 dark:bg-yellow-600 font-medium"
                              value={troco}
                              readOnly
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Desconto
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Tipo de Desconto
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleTipoDescontoChange('valor')}
                              className={`relative inline-flex items-center px-4 py-2 rounded-l-md border text-sm font-medium ${
                                tipoDesconto === 'valor'
                                  ? 'bg-primary-50 border-primary-500 text-primary-600 z-10'
                                  : 'border-gray-300 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500'
                              } focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500`}
                            >
                              Valor (R$)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTipoDescontoChange('percentual')}
                              className={`relative -ml-px inline-flex items-center px-4 py-2 rounded-r-md border text-sm font-medium ${
                                tipoDesconto === 'percentual'
                                  ? 'bg-primary-50 border-primary-500 text-primary-600 z-10'
                                  : 'border-gray-300 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500'
                              } focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500`}
                            >
                              Percentual (%)
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            {tipoDesconto === 'valor' ? 'Valor do Desconto' : 'Percentual de Desconto'}
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                            value={desconto}
                            onChange={(e) => aplicarDesconto(e.target.value)}
                            placeholder={tipoDesconto === 'valor' ? 'R$ 0,00' : '0%'}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Valor com Desconto
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-green-50 dark:bg-green-600 font-medium"
                            value={valorComDesconto}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Campos específicos para DESPESA */}
            {selectedType === 'DESPESA' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Categoria
                  </label>
                  <div className="relative">
                    {!isCreatingCategory ? (
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                        value={categoria}
                        onChange={(e) => {
                          if (e.target.value === 'nova') {
                            setIsCreatingCategory(true);
                          } else {
                            setCategoria(e.target.value);
                          }
                        }}
                      >
                        <option value="">Selecione uma categoria</option>
                        {categorias.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nome}
                          </option>
                        ))}
                        <option value="nova" className="font-medium text-primary-600">+ Nova Categoria</option>
                      </select>
                    ) : (
                      <div className="mt-1 flex space-x-2">
                        <input
                          type="text"
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nome da nova categoria"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateCategory();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={handleCreateCategory}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          onClick={() => {
                            setIsCreatingCategory(false);
                            setNewCategoryName('');
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Descrição
                  </label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder="Digite a descrição do lançamento"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Valor
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      value={valor}
                      onChange={handleValorChange}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Data Pagamento
                    </label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Formas de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        PIX
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                        value={formasPagamento.pix}
                        onChange={(e) => handleFormaPagamentoChange('pix', e.target.value)}
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Crédito
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                        value={formasPagamento.credito}
                        onChange={(e) => handleFormaPagamentoChange('credito', e.target.value)}
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Débito
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                        value={formasPagamento.debito}
                        onChange={(e) => handleFormaPagamentoChange('debito', e.target.value)}
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Dinheiro
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                        value={formasPagamento.dinheiro}
                        onChange={(e) => handleFormaPagamentoChange('dinheiro', e.target.value)}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Tipo de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentType('single')}
                      className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                        paymentType === 'single'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Único
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('installment')}
                      className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                        paymentType === 'installment'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Parcelado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('recurring')}
                      className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                        paymentType === 'recurring'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Recorrente
                    </button>
                  </div>
                </div>

                {paymentType === 'installment' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Número de Parcelas
                    </label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value))}
                    />
                  </div>
                )}

                {paymentType === 'recurring' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Data de Término
                    </label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500"
                onClick={handleClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                onClick={handleSaveInit}
                disabled={loading || (selectedType === 'RECEITA' && !selectedTitulo)}
              >
                Salvar
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
    </Fragment>
  );
}
