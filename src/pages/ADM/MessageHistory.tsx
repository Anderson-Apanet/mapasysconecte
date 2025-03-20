import React, { useState, useEffect } from 'react';
import { fetchMensagensEnviadasPorPPPoE, MensagemEnviada } from '../../services/messages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';

const MessageHistory: React.FC = () => {
  const [mensagens, setMensagens] = useState<MensagemEnviada[]>([]);
  const [loading, setLoading] = useState(false);
  const [pppoe, setPPPoE] = useState<string>('');
  const debouncedPPPoE = useDebounce(pppoe, 500);
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

  // Efeito para buscar mensagens quando o PPPoE mudar (com debounce)
  useEffect(() => {
    if (debouncedPPPoE.trim()) {
      buscarMensagens(debouncedPPPoE);
    } else {
      setMensagens([]);
    }
  }, [debouncedPPPoE]);

  const buscarMensagens = async (pppoeBusca: string) => {
    if (!pppoeBusca.trim()) {
      return;
    }

    setLoading(true);
    try {
      const mensagensEnviadas = await fetchMensagensEnviadasPorPPPoE(pppoeBusca);
      setMensagens(mensagensEnviadas);
      
      if (mensagensEnviadas.length === 0) {
        showToast('Nenhuma mensagem encontrada para este PPPoE', 'info');
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      showToast('Erro ao buscar mensagens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return format(data, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return dataString;
    }
  };

  const handleVoltar = () => {
    navigate(ROUTES.ADM_MESSAGES);
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
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="w-full">
          <label htmlFor="pppoe" className="block text-sm font-medium text-gray-700 mb-1">
            PPPoE do Contrato
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="pppoe"
              value={pppoe}
              onChange={(e) => setPPPoE(e.target.value)}
              className="pl-10 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Digite o PPPoE do contrato para buscar mensagens"
              autoComplete="off"
            />
          </div>
          {loading && (
            <div className="mt-2 text-sm text-gray-500">
              Buscando mensagens...
            </div>
          )}
        </div>
      </div>

      {mensagens.length > 0 ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                  Mensagem
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mensagens.map((mensagem) => (
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
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                    <div className="tooltip" title={mensagem.mensagem_enviada}>
                      {mensagem.mensagem_enviada}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        pppoe && !loading && (
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <p className="text-gray-500">Nenhuma mensagem encontrada para este PPPoE.</p>
          </div>
        )
      )}
    </div>
  );
};

export default MessageHistory;
