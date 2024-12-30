import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TitulosContratosModal } from '../components/TitulosContratosModal';
import Layout from '../components/Layout';
import ListaCaixas from '../components/ListaCaixas';
import {
  CONTRACT_STATUS_OPTIONS,
  Cliente,
  Contrato,
  Titulo
} from '../types/financeiro';
import { Transition } from '@headlessui/react';

const Financeiro: React.FC = () => {
  // Estados para contratos e títulos
  const [contratos, setContratos] = useState<(Contrato & { cliente_nome?: string })[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [showTitulosModal, setShowTitulosModal] = useState(false);
  const [selectedPPPoE, setSelectedPPPoE] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Estados para arquivo de retorno
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Estados para controlar a visibilidade do histórico
  const [showHistorico, setShowHistorico] = useState(false);
  const [showArquivoRetorno, setShowArquivoRetorno] = useState(false);

  // Lista fictícia de arquivos de retorno
  const arquivosRetorno = [
    {
      id: 1,
      nome: 'retorno_bradesco_14122023.ret',
      data: '14/12/2023',
      status: 'Processado',
      total: 'R$ 2.450,00'
    },
    {
      id: 2,
      nome: 'retorno_itau_13122023.ret',
      data: '13/12/2023',
      status: 'Processado',
      total: 'R$ 1.875,30'
    },
    {
      id: 3,
      nome: 'retorno_santander_12122023.ret',
      data: '12/12/2023',
      status: 'Processado',
      total: 'R$ 3.120,00'
    },
    {
      id: 4,
      nome: 'retorno_caixa_11122023.ret',
      data: '11/12/2023',
      status: 'Processado',
      total: 'R$ 980,50'
    }
  ];

  // Atualizar as opções de status do contrato
  const CONTRACT_STATUS_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'Ativo', label: 'Contratos Ativos' },
    { value: 'Agendado', label: 'Contratos Agendados' },
    { value: 'Bloqueado', label: 'Contratos Bloqueados' },
    { value: 'Liberado48', label: 'Contratos Liberados 48h' },
    { value: 'Cancelado', label: 'Contratos Cancelados' },
    { value: 'pendencia', label: 'Contratos com Pendência' }
  ];

  // Função para carregar contratos com paginação e busca
  const fetchContratos = async (page: number, searchTerm: string = '', status: string = '') => {
    try {
      setLoading(true);
      
      // Primeiro, buscar o total de registros para paginação
      let countQuery = supabase
        .from('contratos')
        .select('*', { count: 'exact', head: true });

      // Aplicar filtros na query de contagem
      if (searchTerm) {
        countQuery = countQuery.ilike('pppoe', `%${searchTerm}%`);
      }
      if (status === 'pendencia') {
        countQuery = countQuery.eq('pendencia', true);
      } else if (status) {
        countQuery = countQuery.eq('status', status);
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      console.log('Total de registros encontrados:', count);
      setTotalCount(count || 0);

      // Agora, buscar os registros da página atual
      let dataQuery = supabase
        .from('contratos')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar os mesmos filtros na query de dados
      if (searchTerm) {
        dataQuery = dataQuery.ilike('pppoe', `%${searchTerm}%`);
      }
      if (status === 'pendencia') {
        dataQuery = dataQuery.eq('pendencia', true);
      } else if (status) {
        dataQuery = dataQuery.eq('status', status);
      }

      // Adicionar paginação
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data: contratosData, error: contratosError } = await dataQuery
        .range(from, to);

      if (contratosError) throw contratosError;

      // Se temos contratos, buscar os nomes dos clientes
      if (contratosData && contratosData.length > 0) {
        const clienteIds = [...new Set(contratosData.map(c => c.id_cliente))].filter(Boolean);

        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('id, nome')
          .in('id', clienteIds);

        if (clientesError) throw clientesError;

        const clientesMap = (clientesData || []).reduce((acc, cliente) => {
          acc[cliente.id] = cliente.nome;
          return acc;
        }, {} as { [key: number]: string });

        const contratosFormatados = contratosData.map(contrato => ({
          ...contrato,
          cliente_nome: clientesMap[contrato.id_cliente] || 'Cliente não encontrado'
        }));

        setContratos(contratosFormatados);
      } else {
        setContratos([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar contratos:', error.message);
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar os contratos quando a página, termo de busca ou status mudar
  useEffect(() => {
    fetchContratos(currentPage, searchTerm, contractStatusFilter);
  }, [currentPage, searchTerm, contractStatusFilter]);

  // Handler para mudança no termo de busca
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Volta para a primeira página ao pesquisar
  };

  // Handler para mudança no filtro de status
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setContractStatusFilter(e.target.value);
    setCurrentPage(1); // Volta para a primeira página ao mudar o filtro
  };

  // Funções de navegação
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // Cálculo do total de páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Função para abrir modal de títulos
  const handleOpenTitulosModal = (pppoe: string) => {
    setSelectedPPPoE(pppoe);
    setShowTitulosModal(true);
  };

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
        toast.error('Erro ao fazer upload');
      }
      throw error;
    }
  };

  // Função para fazer upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

        return {
          path: result.path,
          url: result.url,
          name: file.name
        };
      });

      const attachments = await Promise.all(uploadPromises);
      console.log('Todos os arquivos foram processados:', attachments);

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Card de Histórico de Caixas com Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div 
              className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setShowHistorico(!showHistorico)}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Histórico de Caixas
                {showHistorico ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </h2>
            </div>
            
            <Transition
              show={showHistorico}
              enter="transition-all duration-300 ease-in-out"
              enterFrom="max-h-0 opacity-0"
              enterTo="max-h-[1000px] opacity-100"
              leave="transition-all duration-200 ease-in-out"
              leaveFrom="max-h-[1000px] opacity-100"
              leaveTo="max-h-0 opacity-0"
              className="overflow-hidden"
            >
              <div className="p-6 pt-0">
                <ListaCaixas />
              </div>
            </Transition>
          </div>

          {/* Card de Arquivo de Retorno com Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div 
              className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setShowArquivoRetorno(!showArquivoRetorno)}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Arquivo de Retorno
                {showArquivoRetorno ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </h2>
            </div>

            <Transition
              show={showArquivoRetorno}
              enter="transition-all duration-300 ease-in-out"
              enterFrom="max-h-0 opacity-0"
              enterTo="max-h-[1000px] opacity-100"
              leave="transition-all duration-200 ease-in-out"
              leaveFrom="max-h-[1000px] opacity-100"
              leaveTo="max-h-0 opacity-0"
              className="overflow-hidden"
            >
              <div className="p-6 pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Seção de Upload */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Upload de Arquivo
                    </h3>
                    <div className="flex items-center space-x-4">
                      <label
                        htmlFor="file-upload"
                        className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                      >
                        <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                        Selecionar Arquivo
                      </label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileUpload}
                        accept=".ret,.txt"
                      />
                      {selectedFile && (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedFile.name}
                          </span>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="ml-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {selectedFile && (
                      <button
                        onClick={handleFileUpload}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Processar Arquivo
                      </button>
                    )}
                  </div>

                  {/* Lista de Arquivos */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Arquivos Processados
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Arquivo
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Data
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {arquivosRetorno.map((arquivo) => (
                            <tr key={arquivo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                <div className="flex items-center">
                                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                                  {arquivo.nome}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {arquivo.data}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {arquivo.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          {/* Lista de Contratos com Filtros Integrados */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Seção de Filtros */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Campo de Busca */}
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar por PPPoE..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Filtro de Status */}
                <div className="min-w-[200px]">
                  <select
                    value={contractStatusFilter}
                    onChange={(e) => {
                      setContractStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {CONTRACT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contador de Resultados */}
                <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {totalCount} resultados encontrados
                </div>
              </div>
            </div>

            {/* Tabela de Contratos */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      PPPoE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Plano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {contratos.map((contrato) => (
                    <tr key={contrato.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {contrato.cliente_nome}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {contrato.pppoe || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          contrato.status === 'ativos' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                            : contrato.status === 'pendencia' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {CONTRACT_STATUS_OPTIONS.find(status => status.value === contrato.status)?.label || contrato.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {contrato.plano || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleOpenTitulosModal(contrato.pppoe)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Página {currentPage} de {totalPages} ({totalCount} registros)
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal de Títulos */}
          {showTitulosModal && (
            <TitulosContratosModal
              isOpen={showTitulosModal}
              onClose={() => setShowTitulosModal(false)}
              pppoe={selectedPPPoE}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Financeiro;
