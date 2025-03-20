import React, { useState, useEffect } from 'react';
import { fetchTodasMensagensEnviadas, fetchTiposMensagem, MensagemEnviada, TipoMensagem } from '../../services/messages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const MessageHistory: React.FC = () => {
  const [todasMensagens, setTodasMensagens] = useState<MensagemEnviada[]>([]);
  const [tiposMensagem, setTiposMensagem] = useState<TipoMensagem[]>([]);
  const [loadingTodas, setLoadingTodas] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMensagens, setTotalMensagens] = useState(0);
  const [tipoMensagemFiltro, setTipoMensagemFiltro] = useState<number | undefined>(undefined);
  const [nomeClienteFiltro, setNomeClienteFiltro] = useState<string>('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const pageSize = 10;
  const navigate = useNavigate();

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast(message);
    }
  };

  // Efeito para buscar tipos de mensagem ao carregar a página
  useEffect(() => {
    const carregarTiposMensagem = async () => {
      try {
        const tipos = await fetchTiposMensagem();
        setTiposMensagem(tipos);
      } catch (error) {
        console.error('Erro ao carregar tipos de mensagem:', error);
        showToast('Erro ao carregar tipos de mensagem', 'error');
      }
    };

    carregarTiposMensagem();
  }, []);

  // Efeito para buscar todas as mensagens quando a página ou os filtros mudarem
  useEffect(() => {
    buscarTodasMensagens();
  }, [currentPage, tipoMensagemFiltro, nomeClienteFiltro]);

  const buscarTodasMensagens = async () => {
    setLoadingTodas(true);
    try {
      const { mensagens, total } = await fetchTodasMensagensEnviadas(
        currentPage,
        pageSize,
        {
          tipoMensagem: tipoMensagemFiltro,
          nomeCliente: nomeClienteFiltro
        }
      );
      
      setTodasMensagens(mensagens);
      setTotalMensagens(total);
      setTotalPages(Math.ceil(total / pageSize));
      
    } catch (error) {
      console.error('Erro ao buscar todas as mensagens:', error);
      showToast('Erro ao buscar histórico de mensagens', 'error');
    } finally {
      setLoadingTodas(false);
    }
  };

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return format(data, "dd/MM HH:mm", { locale: ptBR });
    } catch (error) {
      return dataString;
    }
  };

  const handleVoltar = () => {
    navigate(ROUTES.ADM_MESSAGES);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleTipoMensagemFiltroChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value;
    setTipoMensagemFiltro(valor ? parseInt(valor) : undefined);
    setCurrentPage(1);
  };

  const handleNomeClienteFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNomeClienteFiltro(e.target.value);
    setCurrentPage(1);
  };

  const limparFiltros = () => {
    setTipoMensagemFiltro(undefined);
    setNomeClienteFiltro('');
    setCurrentPage(1);
  };

  const toggleFiltros = () => {
    setFiltrosAbertos(!filtrosAbertos);
  };

  const renderPaginacao = () => {
    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            Anterior
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            Próximo
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{todasMensagens.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> a <span className="font-medium">{Math.min(currentPage * pageSize, totalMensagens)}</span> de{' '}
              <span className="font-medium">{totalMensagens}</span> resultados
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              >
                <span className="sr-only">Anterior</span>
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Lógica para mostrar páginas ao redor da página atual
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNum ? 'bg-indigo-600 text-white' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              >
                <span className="sr-only">Próximo</span>
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Histórico de Mensagens Enviadas</h1>
        <button
          onClick={handleVoltar}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Voltar
        </button>
      </div>

      {/* Lista de todas as mensagens enviadas */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Histórico Geral de Mensagens</h2>
            <button
              onClick={toggleFiltros}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FunnelIcon className="h-4 w-4 mr-1" />
              Filtros
            </button>
          </div>
          
          {filtrosAbertos && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tipoMensagemFiltro" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Mensagem
                </label>
                <select
                  id="tipoMensagemFiltro"
                  value={tipoMensagemFiltro || ''}
                  onChange={handleTipoMensagemFiltroChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Todos os tipos</option>
                  {tiposMensagem.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="nomeClienteFiltro" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="nomeClienteFiltro"
                    value={nomeClienteFiltro}
                    onChange={handleNomeClienteFiltroChange}
                    placeholder="Buscar por nome do cliente"
                    className="pl-10 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={limparFiltros}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}
        </div>
        
        {loadingTodas ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Carregando mensagens...</p>
          </div>
        ) : todasMensagens.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Envio
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Mensagem
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mensagem
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {todasMensagens.map((mensagem) => (
                  <tr key={mensagem.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mensagem.data_envio ? formatarData(mensagem.data_envio) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {mensagem.nome_cliente}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mensagem.telefone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mensagem.tipos_mensagem?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div 
                        className="truncate cursor-help" 
                        title={mensagem.mensagem_enviada}
                      >
                        {mensagem.mensagem_enviada.length > 50 
                          ? `${mensagem.mensagem_enviada.substring(0, 50)}...` 
                          : mensagem.mensagem_enviada}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPaginacao()}
          </>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">Nenhuma mensagem encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageHistory;
