import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, LockOpenIcon, ClockIcon, NoSymbolIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

interface Titulo {
  id: number;
  valor: number;
  vencimento: string;
  status: string;
  data_pag?: string;
  valorpago?: number;
  nrdocumento?: string;
  formapgto?: string;
  nossonumero?: string;
  pago?: boolean;
}

interface Contrato {
  id: number;
  pppoe: string;
  plano?: {
    id: number;
    nome: string;
    valor: number;
    radius?: string;
    ativo?: boolean;
  };
  id_plano?: number;
  status: string;
  created_at: string;
  data_instalacao?: string;
  dia_vencimento?: number;
  endereco?: string;
  bairro?: {
    id: number;
    nome: string;
  };
  tipo?: string;
  titulos?: Titulo[];
}

interface ContratoAccordionProps {
  contratos: Contrato[];
  isLoading: boolean;
}

const ContratoAccordion: React.FC<ContratoAccordionProps> = ({ contratos, isLoading }) => {
  const [expandedContratos, setExpandedContratos] = useState<number[]>([]);
  
  // Estados para os modais de ação
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [showLiberarModal, setShowLiberarModal] = useState(false);
  const [showLiberar48Modal, setShowLiberar48Modal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [showBloquearModal, setShowBloquearModal] = useState(false);
  const [showEditarDiaVencimentoModal, setShowEditarDiaVencimentoModal] = useState(false);
  const [diaVencimentoEditar, setDiaVencimentoEditar] = useState<number | null>(null);

  // Estados para controlar o loading das ações
  const [isLiberando, setIsLiberando] = useState(false);
  const [isLiberando48, setIsLiberando48] = useState(false);
  const [isCancelando, setIsCancelando] = useState(false);
  const [isBloqueando, setIsBloqueando] = useState(false);
  const [isEditandoDiaVencimento, setIsEditandoDiaVencimento] = useState(false);
  
  // Log para depuração
  useEffect(() => {
    console.log('Contratos recebidos em ContratoAccordion:', contratos);
    // Verificar a estrutura do plano em cada contrato
    contratos.forEach(contrato => {
      console.log(`Contrato ${contrato.id} - PPPoE: ${contrato.pppoe}`);
      console.log('Plano:', contrato.plano);
      console.log('ID Plano:', contrato.id_plano);
    });
  }, [contratos]);

  // Handlers para abrir modais
  const handleOpenLiberarModal = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowLiberarModal(true);
  };

  const handleOpenLiberar48Modal = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowLiberar48Modal(true);
  };

  const handleOpenCancelarModal = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowCancelarModal(true);
  };

  const handleOpenBloquearModal = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowBloquearModal(true);
  };

  const handleOpenEditarDiaVencimentoModal = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setDiaVencimentoEditar(contrato.dia_vencimento || null);
    setShowEditarDiaVencimentoModal(true);
  };

  // Handlers para ações
  const handleConfirmarLiberacao = async () => {
    if (!selectedContrato) return;
    
    let radius = selectedContrato.plano?.radius;
    
    if (!radius && selectedContrato.id_plano) {
      try {
        const { data: planoData } = await supabase
          .from('planos')
          .select('radius')
          .eq('id', selectedContrato.id_plano)
          .single();
          
        if (planoData) {
          radius = planoData.radius;
        }
      } catch (error) {
        console.error('Erro ao buscar radius do plano:', error);
      }
    }
    
    setIsLiberando(true);
    try {
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pppoe: selectedContrato.pppoe,
          radius,
          acao: 'liberar'
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao liberar contrato');
      }

      // Atualizar o status do contrato no banco de dados
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ status: 'Ativo' })
        .eq('id', selectedContrato.id);

      if (updateError) {
        console.error('Erro ao atualizar status do contrato:', updateError);
        throw new Error('Erro ao atualizar status do contrato');
      }

      toast.success('Contrato liberado com sucesso!');
      setShowLiberarModal(false);
      
      // Atualizar a lista de contratos (você pode implementar uma função de refresh aqui)
      // Por exemplo, emitir um evento ou chamar uma função de callback
    } catch (error) {
      console.error('Erro ao liberar contrato:', error);
      toast.error('Erro ao liberar contrato');
    } finally {
      setIsLiberando(false);
      setSelectedContrato(null);
    }
  };

  const handleConfirmarLiberacao48 = async () => {
    if (!selectedContrato) return;
    
    let radius = selectedContrato.plano?.radius;
    
    if (!radius && selectedContrato.id_plano) {
      try {
        const { data: planoData } = await supabase
          .from('planos')
          .select('radius')
          .eq('id', selectedContrato.id_plano)
          .single();
          
        if (planoData) {
          radius = planoData.radius;
        }
      } catch (error) {
        console.error('Erro ao buscar radius do plano:', error);
      }
    }
    
    setIsLiberando48(true);
    try {
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pppoe: selectedContrato.pppoe,
          radius,
          acao: 'liberar48h'
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao liberar cliente por 48 horas');
      }

      toast.success('Cliente liberado por 48 horas com sucesso!');
      setShowLiberar48Modal(false);
      
      // Atualizar a lista de contratos
    } catch (error) {
      console.error('Erro ao liberar cliente por 48 horas:', error);
      toast.error('Erro ao liberar cliente por 48 horas');
    } finally {
      setIsLiberando48(false);
      setSelectedContrato(null);
    }
  };

  const handleConfirmarCancelamento = async () => {
    if (!selectedContrato) return;
    
    let radius = selectedContrato.plano?.radius;
    
    if (!radius && selectedContrato.id_plano) {
      try {
        const { data: planoData } = await supabase
          .from('planos')
          .select('radius')
          .eq('id', selectedContrato.id_plano)
          .single();
          
        if (planoData) {
          radius = planoData.radius;
        }
      } catch (error) {
        console.error('Erro ao buscar radius do plano:', error);
      }
    }
    
    setIsCancelando(true);
    try {
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pppoe: selectedContrato.pppoe,
          radius,
          acao: 'cancelar'
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao cancelar contrato');
      }

      // Atualizar o status do contrato no banco de dados
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ status: 'Cancelado' })
        .eq('id', selectedContrato.id);

      if (updateError) {
        console.error('Erro ao atualizar status do contrato:', updateError);
        throw new Error('Erro ao atualizar status do contrato');
      }

      toast.success('Contrato cancelado com sucesso!');
      setShowCancelarModal(false);
      
      // Atualizar a lista de contratos
    } catch (error) {
      console.error('Erro ao cancelar contrato:', error);
      toast.error('Erro ao cancelar contrato');
    } finally {
      setIsCancelando(false);
      setSelectedContrato(null);
    }
  };

  const handleConfirmarBloqueio = async () => {
    if (!selectedContrato) return;
    
    let radius = selectedContrato.plano?.radius;
    
    if (!radius && selectedContrato.id_plano) {
      try {
        const { data: planoData } = await supabase
          .from('planos')
          .select('radius')
          .eq('id', selectedContrato.id_plano)
          .single();
          
        if (planoData) {
          radius = planoData.radius;
        }
      } catch (error) {
        console.error('Erro ao buscar radius do plano:', error);
      }
    }
    
    setIsBloqueando(true);
    try {
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/4a6e5ee5-fc47-4d97-b503-9a6fab1bbb4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pppoe: selectedContrato.pppoe,
          radius,
          acao: 'Bloquear'
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao bloquear contrato');
      }

      // Atualizar o status do contrato no banco de dados
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ status: 'Bloqueado' })
        .eq('id', selectedContrato.id);

      if (updateError) {
        console.error('Erro ao atualizar status do contrato:', updateError);
        throw new Error('Erro ao atualizar status do contrato');
      }

      toast.success('Contrato bloqueado com sucesso!');
      setShowBloquearModal(false);
      
      // Atualizar a lista de contratos
    } catch (error) {
      console.error('Erro ao bloquear contrato:', error);
      toast.error('Erro ao bloquear contrato');
    } finally {
      setIsBloqueando(false);
      setSelectedContrato(null);
    }
  };

  const handleConfirmarEdicaoDiaVencimento = async () => {
    if (!selectedContrato || diaVencimentoEditar === null) return;
    
    setIsEditandoDiaVencimento(true);
    try {
      // 1. Buscar os títulos não pagos do cliente para obter os nossonumero
      const { data: titulos, error: fetchError } = await supabase
        .from('titulos')
        .select('nossonumero')
        .eq('id_contrato', selectedContrato.id)
        .neq('pago', true);

      if (fetchError) {
        console.error('Erro ao buscar títulos não pagos:', fetchError);
        throw new Error('Erro ao buscar títulos não pagos');
      }

      // 2. Enviar os nossonumero para o webhook do n8n
      if (titulos && titulos.length > 0) {
        const nossonumeros = titulos.map(titulo => titulo.nossonumero).filter(Boolean);
        
        if (nossonumeros.length > 0) {
          try {
            const response = await fetch('https://webhooks.apanet.tec.br/webhook/c080be25-774a-4d74-836b-48c4753538a9', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                nossonumeros,
                contrato_id: selectedContrato.id,
                pppoe: selectedContrato.pppoe,
                dia_vencimento_antigo: selectedContrato.dia_vencimento,
                dia_vencimento_novo: diaVencimentoEditar
              }),
            });
            
            if (!response.ok) {
              console.warn('Aviso: Webhook retornou status não-OK:', response.status);
            }
          } catch (webhookError) {
            console.warn('Aviso: Erro ao enviar dados para webhook:', webhookError);
            // Continuamos o processo mesmo se o webhook falhar
          }
        }
      }

      // 3. Excluir os títulos não pagos do cliente
      const { error: deleteError } = await supabase
        .from('titulos')
        .delete()
        .eq('id_contrato', selectedContrato.id)
        .neq('pago', true);

      if (deleteError) {
        console.error('Erro ao excluir títulos não pagos:', deleteError);
        throw new Error('Erro ao excluir títulos não pagos');
      }

      // 4. Atualizar o dia de vencimento do contrato
      const { error: updateError } = await supabase
        .from('contratos')
        .update({ dia_vencimento: diaVencimentoEditar })
        .eq('id', selectedContrato.id);

      if (updateError) {
        console.error('Erro ao atualizar dia de vencimento do contrato:', updateError);
        throw new Error('Erro ao atualizar dia de vencimento do contrato');
      }

      toast.success('Dia de vencimento do contrato atualizado com sucesso!');
      setShowEditarDiaVencimentoModal(false);
      
      // Atualizar a lista de contratos (recarregar a página)
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar dia de vencimento do contrato:', error);
      toast.error('Erro ao atualizar dia de vencimento do contrato');
    } finally {
      setIsEditandoDiaVencimento(false);
      setSelectedContrato(null);
    }
  };

  const toggleContrato = (contratoId: number) => {
    setExpandedContratos(prev => 
      prev.includes(contratoId)
        ? prev.filter(id => id !== contratoId)
        : [...prev, contratoId]
    );
  };

  const isContratoExpanded = (contratoId: number) => {
    return expandedContratos.includes(contratoId);
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'bloqueado':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'agendado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'cancelado':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'liberado48':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (contratos.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">Nenhum contrato encontrado</div>
    );
  }

  return (
    <div className="w-full">
      {contratos.map((contrato) => (
        <div key={contrato.id} className="border rounded-lg overflow-hidden">
          <div
            className="flex justify-between items-center p-4 bg-white cursor-pointer"
            onClick={() => toggleContrato(contrato.id)}
          >
            <div className="flex-1">
              <h3 className="font-medium">{contrato.pppoe || 'Cliente não encontrado'}</h3>
              <div className="text-sm text-gray-500">
                <span>PPPoE: {contrato.pppoe || 'N/A'}</span>
                <span className="mx-2">•</span>
                <span>Plano: {contrato.plano?.nome || (contrato.id_plano ? 'Carregando...' : 'N/A')}</span>
                <span className="mx-2">•</span>
                <span>Status: <span className={`font-semibold ${getStatusColor(contrato.status || '')}`}>{contrato.status || 'N/A'}</span></span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Botões de ação - sempre exibir os 4 botões */}
              {contrato.tipo !== 'Bonificado' && contrato.status !== 'Cancelado' && (
                <div className="flex space-x-2">
                  {/* Botão Liberar Contrato */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenLiberarModal(contrato);
                    }}
                    className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                  >
                    <LockOpenIcon className="h-3 w-3 mr-1" />
                    Liberar
                  </button>
                  
                  {/* Botão Liberar Contrato por 48h */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenLiberar48Modal(contrato);
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                  >
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Liberar 48h
                  </button>
                  
                  {/* Botão Cancelar Contrato */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCancelarModal(contrato);
                    }}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                  >
                    <NoSymbolIcon className="h-3 w-3 mr-1" />
                    Cancelar
                  </button>
                  
                  {/* Botão Bloquear Contrato */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBloquearModal(contrato);
                    }}
                    className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center"
                  >
                    <DocumentTextIcon className="h-3 w-3 mr-1" />
                    Bloquear
                  </button>
                </div>
              )}
              <div className="text-gray-400">
                {isContratoExpanded(contrato.id) ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </div>
            </div>
          </div>
          
          {isContratoExpanded(contrato.id) && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Detalhes do Contrato</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">ID:</span> {contrato.id}</p>
                    <p><span className="font-medium">Data de Início:</span> {formatDate(contrato.created_at)}</p>
                    <p className="flex items-center">
                      <span className="font-medium">Dia de Vencimento:</span>
                      <span 
                        className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditarDiaVencimentoModal(contrato);
                        }}
                      >
                        {contrato.dia_vencimento || 'Não definido'} (Editar)
                      </span>
                    </p>
                    <p><span className="font-medium">Valor:</span> {formatCurrency(contrato.plano?.valor || 0)}</p>
                    <p><span className="font-medium">Status:</span> <span className={getStatusColor(contrato.status || '')}>{contrato.status}</span></p>
                    <p><span className="font-medium">Tipo:</span> {contrato.tipo || 'Normal'}</p>
                  </div>
                </div>
              </div>
              
              {contrato.titulos && contrato.titulos.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Títulos</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[...contrato.titulos]
                          .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
                          .map((titulo) => (
                          <tr key={titulo.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{titulo.id}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDate(titulo.vencimento)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{formatCurrency(titulo.valor)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              <span className={getStatusColor(titulo.status)}>{titulo.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {/* Modal de Liberação de Contrato */}
      {showLiberarModal && selectedContrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Liberar Contrato</h3>
            <p className="mb-4">
              Tem certeza que deseja liberar o contrato de <strong>{selectedContrato.pppoe}</strong>?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowLiberarModal(false);
                  setSelectedContrato(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarLiberacao}
                disabled={isLiberando}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center"
              >
                {isLiberando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Liberando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Liberação de Contrato por 48h */}
      {showLiberar48Modal && selectedContrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Liberar Contrato por 48h</h3>
            <p className="mb-4">
              Tem certeza que deseja liberar o contrato de <strong>{selectedContrato.pppoe}</strong> por 48 horas?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowLiberar48Modal(false);
                  setSelectedContrato(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarLiberacao48}
                disabled={isLiberando48}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
              >
                {isLiberando48 ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Liberando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Cancelamento de Contrato */}
      {showCancelarModal && selectedContrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Cancelar Contrato</h3>
            <p className="mb-4">
              Tem certeza que deseja cancelar o contrato de <strong>{selectedContrato.pppoe}</strong>?
              <br />
              <span className="text-red-500 text-sm">Esta ação não pode ser desfeita.</span>
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCancelarModal(false);
                  setSelectedContrato(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmarCancelamento}
                disabled={isCancelando}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 flex items-center"
              >
                {isCancelando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cancelando...
                  </>
                ) : (
                  'Confirmar Cancelamento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Bloqueio de Contrato */}
      {showBloquearModal && selectedContrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Bloquear Contrato</h3>
            <p className="mb-4">
              Tem certeza que deseja bloquear o contrato de <strong>{selectedContrato.pppoe}</strong>?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowBloquearModal(false);
                  setSelectedContrato(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarBloqueio}
                disabled={isBloqueando}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 flex items-center"
              >
                {isBloqueando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Bloqueando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Edição de Dia de Vencimento */}
      {showEditarDiaVencimentoModal && selectedContrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Editar Dia de Vencimento</h3>
            <div className="mb-6 text-red-600 bg-red-50 p-3 rounded border border-red-200">
              <p className="font-bold mb-2">Atenção!</p>
              <p>
                Ao alterar o dia de vencimento, todos os títulos não pagos deste cliente serão 
                excluídos do sistema e do banco de dados. Você deverá gerar novos boletos na 
                página Financeiro.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecione o novo dia de vencimento:
              </label>
              <select
                value={diaVencimentoEditar || ''}
                onChange={(e) => setDiaVencimentoEditar(Number(e.target.value))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="" disabled>Selecione um dia</option>
                <option value="10">Dia 10</option>
                <option value="25">Dia 25</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowEditarDiaVencimentoModal(false);
                  setSelectedContrato(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEdicaoDiaVencimento}
                disabled={isEditandoDiaVencimento || diaVencimentoEditar === null}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 flex items-center"
              >
                {isEditandoDiaVencimento ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Editando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContratoAccordion;
