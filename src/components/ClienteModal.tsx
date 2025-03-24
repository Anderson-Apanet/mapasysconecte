import React, { useState, useEffect } from 'react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { XMarkIcon, DocumentTextIcon, ChevronUpDownIcon, PlusIcon, LinkIcon } from '@heroicons/react/24/outline';
import { Cliente } from '../types/cliente';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import ContratoModal from './ContratoModal';
import NovoContratoModal from './NovoContratoModal';
import useAuth from '../hooks/useAuth';
import {
  formatPhone,
  isValidEmail,
  formatCEP,
  formatCPFCNPJ,
  isValidCPFCNPJ,
  formatRG
} from '../utils/formatters';

interface Contrato {
  id: number;
  pppoe: string;
  id_cliente: number;
  created_at: string;
  bairro: string | null;
  cliente: string | null;
  complemento: string | null;
  contratoassinado: boolean | null;
  data_instalacao: string | null;
  dia_vencimento: number | null;
  id_empresa: number | null;
  endereco: string | null;
  liberado48: string | null;
  locallat: string | null;
  locallon: string | null;
  plano: string | null;
  senha: string | null;
  status: string | null;
  tipo: string | null;
  ultparcela: string | null;
  vendedor: string | null;
  data_cad_contrato: string | null;
  planos: {
    id: number;
    nome: string;
    valor: number;
  } | null;
  bairros: {
    id: number;
    nome: string;
    cidade: string;
  } | null;
}

interface Bairro {
  id: number;
  nome: string;
  cidade: string;
}

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onSave: () => void;
}

const ClienteModal: React.FC<ClienteModalProps> = ({ isOpen, onClose, cliente, onSave }) => {
  const { userData } = useAuth();
  const empresaId = userData?.empresa_id;
  
  const [formData, setFormData] = useState<Omit<Cliente, 'id' | 'created_at' | 'bairro' | 'cidade'>>({
    nome: '',
    email: '',
    fonewhats: '',
    logradouro: '',
    nrlogradouro: '',
    complemento: '',
    uf: '',
    cep: '',
    rg: '',
    cpf_cnpj: '',
    datanas: '',
    id_bairro: null,
    status: 'Pendente'
  });

  const [errors, setErrors] = useState({
    email: false,
    cpf_cnpj: false
  });

  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [selectedBairro, setSelectedBairro] = useState<Bairro | null>(null);
  const [loading, setLoading] = useState(false);
  const [showContratos, setShowContratos] = useState(false);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [showNovoContrato, setShowNovoContrato] = useState(false);

  useEffect(() => {
    const fetchBairros = async () => {
      const { data, error } = await supabase
        .from('bairros')
        .select('id, nome, cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar bairros:', error);
        toast.error('Erro ao carregar bairros');
        return;
      }

      setBairros(data || []);
    };

    fetchBairros();
  }, []);

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome || '',
        email: cliente.email || '',
        fonewhats: cliente.fonewhats || '',
        logradouro: cliente.logradouro || '',
        nrlogradouro: cliente.nrlogradouro || '',
        complemento: cliente.complemento || '',
        uf: cliente.uf || '',
        cep: cliente.cep || '',
        rg: cliente.rg || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        datanas: cliente.datanas || '',
        id_bairro: cliente.id_bairro || null,
        status: cliente.status || 'Pendente'
      });

      if (cliente.id_bairro) {
        const bairro = bairros.find(b => b.id === cliente.id_bairro);
        setSelectedBairro(bairro || null);
      }
    } else {
      // Limpar o formulário quando for um novo cliente
      setFormData({
        nome: '',
        email: '',
        fonewhats: '',
        logradouro: '',
        nrlogradouro: '',
        complemento: '',
        uf: '',
        cep: '',
        rg: '',
        cpf_cnpj: '',
        datanas: '',
        id_bairro: null,
        status: 'Pendente'
      });
      setSelectedBairro(null);
    }
  }, [cliente, bairros]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Aplicar formatações específicas para cada campo
    switch (name) {
      case 'fonewhats':
        formattedValue = formatPhone(value);
        break;
      case 'email':
        setErrors(prev => ({ ...prev, email: !isValidEmail(value) }));
        break;
      case 'cep':
        formattedValue = formatCEP(value);
        break;
      case 'cpf_cnpj':
        formattedValue = formatCPFCNPJ(value);
        setErrors(prev => ({ ...prev, cpf_cnpj: !isValidCPFCNPJ(value) }));
        break;
      case 'rg':
        formattedValue = formatRG(value);
        break;
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const validateForm = () => {
    const validations = {
      email: isValidEmail(formData.email),
      cpf_cnpj: isValidCPFCNPJ(formData.cpf_cnpj)
    };

    setErrors(prev => ({
      ...prev,
      email: !validations.email,
      cpf_cnpj: !validations.cpf_cnpj
    }));

    return Object.values(validations).every(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário antes de continuar.');
      return;
    }

    if (!selectedBairro?.id) {
      toast.error('Por favor, selecione um bairro');
      return;
    }

    setLoading(true);
    try {
      // Preparar os dados para envio
      const currentDate = new Date().toISOString().split('T')[0];
      const clienteData = {
        nome: formData.nome,
        email: formData.email || null,
        fonewhats: formData.fonewhats || null,
        logradouro: formData.logradouro || null,
        nrlogradouro: formData.nrlogradouro || null,
        complemento: formData.complemento || null,
        uf: formData.uf || null,
        cep: formData.cep || null,
        rg: formData.rg || null,
        cpf_cnpj: formData.cpf_cnpj || null,
        datanas: formData.datanas || null,
        id_bairro: selectedBairro.id,
        status: formData.status || 'Pendente',
        data_cad_cliente: cliente ? undefined : currentDate, // Adiciona a data apenas para novos registros
        empresa_id: empresaId // Adiciona o ID da empresa atual
      };

      if (cliente) {
        // Atualização
        const { error } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', cliente.id);

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Inserção
        const { error } = await supabase
          .from('clientes')
          .insert([clienteData]);

        if (error) throw error;
        toast.success('Cliente cadastrado com sucesso!');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao salvar cliente: ' + (error.message || error.details || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleBairroChange = (bairro: Bairro | null) => {
    setSelectedBairro(bairro);
    if (bairro) {
      setFormData(prev => ({
        ...prev,
        id_bairro: bairro.id
      }));
    }
  };

  const loadContratos = async () => {
    if (!cliente) return;
    
    setLoadingContratos(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          id,
          pppoe,
          status,
          tipo,
          data_instalacao,
          dia_vencimento,
          created_at,
          complemento,
          contratoassinado,
          endereco,
          liberado48,
          locallat,
          locallon,
          senha,
          ultparcela,
          vendedor,
          data_cad_contrato,
          planos (
            id,
            nome,
            valor
          ),
          bairros (
            id,
            nome,
            cidade
          )
        `)
        .eq('id_cliente', cliente.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setContratos(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar contratos');
      console.error('Erro ao carregar contratos:', error);
    } finally {
      setLoadingContratos(false);
    }
  };

  useEffect(() => {
    if (showContratos && cliente) {
      loadContratos();
    }
  }, [showContratos, cliente]);

  const toggleContratos = async () => {
    setShowContratos(!showContratos);
    if (!showContratos && cliente) {
      await loadContratos();
    }
  };

  const handleCloseModal = () => {
    setShowContratos(false);
    setContratos([]);
    setSelectedContrato(null);
    onClose();
  };

  useEffect(() => {
    setShowContratos(false);
    setContratos([]);
    setSelectedContrato(null);
  }, [cliente?.id]);

  const handleContratoClick = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setIsContratoModalOpen(true);
  };

  const handleContratoModalClose = () => {
    setIsContratoModalOpen(false);
    setSelectedContrato(null);
  };

  const handleNovoContratoClick = () => {
    setShowNovoContrato(true);
  };

  const handleNovoContratoClose = () => {
    setShowNovoContrato(false);
  };

  const handleNovoContratoSuccess = async () => {
    await loadContratos();
    setShowNovoContrato(false);
    toast.success('Contrato criado com sucesso!');
  };

  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-50 overflow-y-auto"
      onClose={onClose}
      open={isOpen}
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
          <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
                <div className="flex items-center space-x-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                    {cliente ? 'Editar Cliente' : 'Novo Cliente'}
                  </Dialog.Title>
                  {cliente && (
                    <button
                      onClick={toggleContratos}
                      className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      title="Ver contratos"
                    >
                      <DocumentTextIcon className="h-5 w-5" />
                      <span>Contratos</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {showContratos && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Contratos do Cliente</h3>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleNovoContratoClick}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Novo Contrato
                      </button>
                      <button
                        type="button"
                        onClick={() => {/* TODO: Implementar associação de contrato */}}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Associar Contrato
                      </button>
                    </div>
                  </div>
                  {loadingContratos ? (
                    <div className="text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                      <span className="ml-2">Carregando contratos...</span>
                    </div>
                  ) : contratos.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhum contrato encontrado
                    </div>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                      {contratos.map((contrato) => (
                        <div
                          key={contrato.id}
                          onClick={() => handleContratoClick(contrato)}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              {contrato.pppoe} / {contrato.senha} - {contrato.planos?.nome || 'Sem plano'}
                            </h4>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-300">
                              <span>Status: {contrato.status || 'Não definido'}</span>
                              <span>•</span>
                              <span>Vencimento: {contrato.dia_vencimento || '-'}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full 
                            ${contrato.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                            contrato.status === 'Inativo' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                            contrato.status === 'Cancelado' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}
                          >
                            {contrato.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome
                    </label>
                    <input
                      type="text"
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">
                        Por favor, insira um email válido
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="fonewhats" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Telefone/WhatsApp
                    </label>
                    <input
                      type="text"
                      id="fonewhats"
                      name="fonewhats"
                      value={formData.fonewhats || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      maxLength={15}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="cpf_cnpj" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      CPF/CNPJ
                    </label>
                    <input
                      type="text"
                      id="cpf_cnpj"
                      name="cpf_cnpj"
                      value={formData.cpf_cnpj || ''}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        errors.cpf_cnpj ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.cpf_cnpj && (
                      <p className="mt-1 text-sm text-red-500">
                        Por favor, insira um CPF ou CNPJ válido
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="rg" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      RG
                    </label>
                    <input
                      type="text"
                      id="rg"
                      name="rg"
                      value={formData.rg || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="datanas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      id="datanas"
                      name="datanas"
                      value={formData.datanas || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="cep" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      CEP
                    </label>
                    <input
                      type="text"
                      id="cep"
                      name="cep"
                      value={formData.cep || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      maxLength={9}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="logradouro" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Logradouro
                    </label>
                    <input
                      type="text"
                      id="logradouro"
                      name="logradouro"
                      value={formData.logradouro || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="nrlogradouro" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Número
                    </label>
                    <input
                      type="text"
                      id="nrlogradouro"
                      name="nrlogradouro"
                      value={formData.nrlogradouro || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Complemento
                    </label>
                    <input
                      type="text"
                      id="complemento"
                      name="complemento"
                      value={formData.complemento || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bairro
                    </label>
                    <Listbox value={selectedBairro} onChange={handleBairroChange}>
                      <div className="relative mt-1">
                        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white dark:bg-gray-700 py-2 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-300 sm:text-sm">
                          <span className="block truncate">
                            {selectedBairro ? selectedBairro.nome : 'Selecione um bairro'}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={React.Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                            {bairros.map((bairro) => (
                              <Listbox.Option
                                key={bairro.id}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                    active
                                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                                      : 'text-gray-900 dark:text-white'
                                  }`
                                }
                                value={bairro}
                              >
                                {({ selected }) => (
                                  <>
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {bairro.nome}
                                    </span>
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>

                  <div>
                    <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={selectedBairro?.cidade || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:text-white cursor-not-allowed"
                      readOnly
                    />
                  </div>

                  <div>
                    <label htmlFor="uf" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      UF
                    </label>
                    <input
                      type="text"
                      id="uf"
                      name="uf"
                      value={formData.uf || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status || 'Pendente'}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Cliente['status'] }))}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 dark:bg-primary-500 text-sm font-medium text-white hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : cliente ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>

              {/* Modal de Contrato */}
              {selectedContrato && (
                <ContratoModal
                  isOpen={isContratoModalOpen}
                  onClose={handleContratoModalClose}
                  contrato={selectedContrato}
                  cliente={cliente}
                />
              )}

              {/* Modal de Novo Contrato */}
              {cliente && (
                <NovoContratoModal
                  isOpen={showNovoContrato}
                  onClose={handleNovoContratoClose}
                  clienteData={{
                    id: cliente.id,
                    nome: cliente.nome
                  }}
                  onSuccess={handleNovoContratoSuccess}
                />
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ClienteModal;
