import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-toastify';
import { 
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  QrCodeIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  EyeIcon,
  PrinterIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { 
  findCustomerByCpfCnpj, 
  getCustomerPayments, 
  AsaasPayment, 
  createCustomer, 
  CreateCustomerData, 
  getPaymentIdentificationField, 
  getPaymentPixQrCode 
} from '../services/asaasApi';

interface TitulosContratosModalProps {
  isOpen: boolean;
  onClose: () => void;
  pppoe: string;
  contrato: any;
}

export const TitulosContratosModal: React.FC<TitulosContratosModalProps> = ({ isOpen, onClose, contrato, pppoe }) => {
  const [titulosLocais, setTitulosLocais] = useState<any[]>([]);
  const [loadingTitulosLocais, setLoadingTitulosLocais] = useState(false);
  const [showLinhaDigitavel, setShowLinhaDigitavel] = useState(false);
  const [linhaDigitavel, setLinhaDigitavel] = useState('');
  const [loadingLinhaDigitavel, setLoadingLinhaDigitavel] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [loadingQrCode, setLoadingQrCode] = useState(false);
  const [showCriarTitulosModal, setShowCriarTitulosModal] = useState(false);
  const [dataInicialVencimento, setDataInicialVencimento] = useState('');
  const [quantidadeTitulos, setQuantidadeTitulos] = useState(1);
  const [valorPersonalizado, setValorPersonalizado] = useState<string>('');
  const [cliente, setCliente] = useState<any>(null);
  const [plano, setPlano] = useState<any>(null);
  const [isGerandoCarne, setIsGerandoCarne] = useState(false);
  const [isCriandoTitulos, setIsCriandoTitulos] = useState(false);
  const [tituloParaExcluir, setTituloParaExcluir] = useState<number | null>(null);
  const [showConfirmacaoExclusao, setShowConfirmacaoExclusao] = useState(false);
  const [tituloSelecionadoParaExclusao, setTituloSelecionadoParaExclusao] = useState<any>(null);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState<number | null>(null);

  // Função para formatar a data mínima (hoje) no formato YYYY-MM-DD
  const getDataMinima = () => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  };

  // Função para formatar a data inicial com base no dia de vencimento do contrato
  const getDataInicialPadrao = () => {
    if (!contrato?.dia_vencimento) return '';
    
    const hoje = new Date();
    const dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), contrato.dia_vencimento);
    
    // Se o dia de vencimento já passou este mês, usa o próximo mês
    if (hoje.getDate() > contrato.dia_vencimento) {
      dataInicial.setMonth(dataInicial.getMonth() + 1);
    }
    
    return dataInicial.toISOString().split('T')[0];
  };

  const buscarTitulosLocais = async () => {
    if (!contrato || !contrato.id) {
      console.warn('Contrato não fornecido');
      return;
    }

    setLoadingTitulosLocais(true);
    try {
      const { data: titulos, error } = await supabase
        .from('titulos')
        .select('*')
        .eq('id_contrato', contrato.id)
        .order('vencimento');

      if (error) throw error;
      setTitulosLocais(titulos || []);
    } catch (error) {
      console.error('Erro ao buscar títulos:', error);
      toast.error('Erro ao buscar títulos');
    } finally {
      setLoadingTitulosLocais(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      buscarTitulosLocais();
    }
  }, [isOpen, contrato]);

  useEffect(() => {
    if (showCriarTitulosModal) {
      setDataInicialVencimento(getDataInicialPadrao());
    }
  }, [showCriarTitulosModal, contrato?.dia_vencimento]);

  const handleVerLinhaDigitavel = async (paymentId: string) => {
    try {
      setLoadingLinhaDigitavel(true);
      const linha = await getPaymentIdentificationField(paymentId);
      setLinhaDigitavel(linha);
      setShowLinhaDigitavel(true);
    } catch (error: any) {
      toast.error('Erro ao buscar linha digitável: ' + error.message);
    } finally {
      setLoadingLinhaDigitavel(false);
    }
  };

  const handleCopyLinhaDigitavel = () => {
    navigator.clipboard.writeText(linhaDigitavel);
    toast.success('Linha digitável copiada!');
  };

  const handleVerQrCode = async (paymentId: string) => {
    try {
      setLoadingQrCode(true);
      const qrCode = await getPaymentPixQrCode(paymentId);
      setQrCodeImage(qrCode);
      setShowQrCode(true);
    } catch (error: any) {
      toast.error('Erro ao buscar QR Code PIX: ' + error.message);
    } finally {
      setLoadingQrCode(false);
    }
  };

  const handlePrintTitulo = (invoiceUrl: string | null) => {
    if (!invoiceUrl) {
      toast.error('URL do título não disponível');
      return;
    }
    window.open(invoiceUrl, '_blank');
  };

  // Função para lidar com a exclusão de títulos
  const handleExcluirTitulo = async (titulo: any) => {
    try {
      // Verificar se temos as informações necessárias
      if (!titulo || !titulo.id || !titulo.vencimento || !pppoe) {
        toast.error('Informações do título incompletas');
        return;
      }

      setTituloParaExcluir(titulo.id);
      
      // Preparar os dados para enviar ao webhook
      const webhookData = {
        pppoe: pppoe,
        vencimento: titulo.vencimento
      };
      
      console.log('Enviando dados para webhook de exclusão de título:', webhookData);
      
      // Enviar para o endpoint do n8n
      try {
        const response = await fetch('https://webhooks.apanet.tec.br/webhook/de279cf7-aa2f-49d1-b2aa-eae061ab76a4', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });
        
        if (response.ok) {
          console.log('Solicitação de exclusão de título enviada com sucesso');
          toast.success('Solicitação de exclusão de título enviada com sucesso');
          
          // Atualizar a lista de títulos após a exclusão
          setTimeout(() => {
            buscarTitulosLocais();
          }, 1000);
        } else {
          const errorText = await response.text();
          console.error('Erro ao solicitar exclusão de título:', errorText);
          toast.error('Erro ao solicitar exclusão de título');
        }
      } catch (error) {
        console.error('Erro ao enviar solicitação para webhook:', error);
        toast.error('Erro ao enviar solicitação para webhook');
      } finally {
        setTituloParaExcluir(null);
      }
    } catch (error) {
      console.error('Erro ao processar exclusão de título:', error);
      toast.error('Erro ao processar exclusão de título');
      setTituloParaExcluir(null);
    }
  };

  const handleGerarPDFBoletos = async () => {
    if (isGerandoCarne) return;

    let pdfUrl: string | null = null;
    
    try {
      setIsGerandoCarne(true);
      
      // Primeiro, buscar os parcelamentos_id do contrato
      const { data: parcelamentos, error: parcelamentosError } = await supabase
        .from('parcelamentos_contratos')
        .select('parcelamento_id')
        .eq('contrato_id', contrato.id)
        .not('parcelamento_id', 'is', null);

      if (parcelamentosError) {
        console.error('Erro ao buscar parcelamentos:', parcelamentosError);
        throw parcelamentosError;
      }

      if (!parcelamentos || parcelamentos.length === 0) {
        toast.error('Nenhum parcelamento encontrado para este contrato');
        return;
      }

      const parcelamentosIds = parcelamentos.map(p => p.parcelamento_id);
      console.log('Parcelamentos encontrados:', parcelamentosIds);

      // Enviar os parcelamentos_id para o N8N
      const requestBody = {
        parcelamentos_id: parcelamentosIds
      };
      console.log('Enviando requisição para N8N:', requestBody);

      const response = await fetch('https://webhooks.apanet.tec.br/webhook/e56c98fc-19fc-40c2-9f60-9fa6cffbe032', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta de erro do N8N:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Erro ao gerar o carnê: ${response.status} - ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Resposta do N8N recebida com sucesso');
      
      if (!responseData || !responseData.data) {
        console.error('Resposta inválida do N8N:', responseData);
        throw new Error('Resposta inválida do servidor: dados do PDF não encontrados');
      }

      // Remove o prefixo do data URL se existir
      const base64Data = responseData.data.replace(/^data:application\/pdf;base64,/, '');
      console.log('Dados base64 recebidos, tamanho:', base64Data.length);
      
      if (!base64Data) {
        throw new Error('Dados do PDF estão vazios');
      }

      try {
        // Converte a string base64 em um blob PDF
        const pdfContent = atob(base64Data);
        const byteArray = new Uint8Array(pdfContent.length);
        for (let i = 0; i < pdfContent.length; i++) {
          byteArray[i] = pdfContent.charCodeAt(i);
        }
        const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
        console.log('PDF Blob criado com sucesso. Tamanho:', pdfBlob.size);
        
        if (pdfBlob.size === 0) {
          throw new Error('PDF gerado está vazio');
        }

        // Cria uma URL para o blob
        pdfUrl = URL.createObjectURL(pdfBlob);
        console.log('URL do PDF criada:', pdfUrl);

        // Cria um elemento <a> para abrir o PDF
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Adiciona o link ao documento e simula o clique
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Carnê gerado com sucesso!');
      } catch (error) {
        console.error('Erro ao processar PDF:', error);
        toast.error(`Erro ao processar o PDF do carnê: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao gerar carnê:', error);
      toast.error(error.message || 'Erro ao gerar o carnê');
    } finally {
      // Limpa a URL do objeto após um breve delay
      if (pdfUrl) {
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl as string);
          console.log('URL do PDF liberada');
        }, 1000);
      }
      setIsGerandoCarne(false);
    }
  };

  // Buscar dados do cliente e plano
  useEffect(() => {
    const buscarDados = async () => {
      if (!contrato?.id_cliente || !contrato?.id_plano) return;

      const { data: clienteData } = await supabase
        .from('clientes')
        .select(`
          *,
          bairro:bairros(nome)
        `)
        .eq('id', contrato.id_cliente)
        .single();

      const { data: planoData } = await supabase
        .from('planos')
        .select('*')
        .eq('id', contrato.id_plano)
        .single();

      setCliente(clienteData);
      setPlano(planoData);
    };

    buscarDados();
  }, [contrato]);

  const enviarParaN8N = async () => {
    if (!cliente || !plano || !contrato) {
      toast.error('Dados incompletos para gerar títulos');
      return;
    }

    setIsCriandoTitulos(true);

    const valorFinal = valorPersonalizado ? parseFloat(valorPersonalizado) : plano.valor;

    const payload = {
      nome: cliente.nome,
      cpf_cnpj: cliente.cpf_cnpj,
      valor: valorFinal,
      idasaas: cliente.idasaas,
      billingType: "BOLETO",
      nextDueDate: dataInicialVencimento,
      cycle: "MONTHLY",
      maxPayments: quantidadeTitulos,
      interest: 1.5,
      fine: 2,
      description: plano.nome,
      externalReference: contrato.pppoe,
      idcontrato: contrato.id,
      idcliente: cliente.id,
      logradouro: cliente.logradouro,
      nrlogradouro: cliente.nrlogradouro,
      cep: cliente.cep,
      bairro: cliente.bairro?.nome
    };

    try {
      console.log('Payload completo sendo enviado:', JSON.stringify(payload, null, 2));
      
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/c5834f5d-ba5a-4d05-aa1d-e8e4ef2d6d43', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta de erro do N8N:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Erro ao enviar dados: ${response.status} - ${response.statusText}`);
      }

      toast.success('Títulos gerados com sucesso!');
      setShowCriarTitulosModal(false);
      
      // Aguarda 2 segundos antes de atualizar a lista de títulos
      // para dar tempo do N8N processar e salvar os dados
      setTimeout(() => {
        buscarTitulosLocais();
      }, 2000);

    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      toast.error('Erro ao enviar dados para geração dos títulos');
    } finally {
      setIsCriandoTitulos(false);
    }
  };

  // Função para abrir o modal de confirmação de exclusão
  const abrirConfirmacaoExclusao = (titulo: any) => {
    setTituloSelecionadoParaExclusao(titulo);
    setShowConfirmacaoExclusao(true);
  };

  // Função para fechar o modal de confirmação de exclusão
  const fecharConfirmacaoExclusao = () => {
    setShowConfirmacaoExclusao(false);
    setTituloSelecionadoParaExclusao(null);
  };

  // Função para confirmar a exclusão do título
  const confirmarExclusaoTitulo = () => {
    if (tituloSelecionadoParaExclusao) {
      handleExcluirTitulo(tituloSelecionadoParaExclusao);
      fecharConfirmacaoExclusao();
    }
  };

  // Função para enviar mensagem WhatsApp
  const handleEnviarWhatsApp = async (titulo: any) => {
    if (!cliente || !pppoe) {
      toast.error('Informações do cliente incompletas');
      return;
    }

    setEnviandoWhatsApp(titulo.id);
    
    try {
      // Preparar os dados para enviar ao webhook
      const webhookData = {
        nome: cliente.nome,
        pppoe: pppoe,
        fonewhats: cliente.fonewhats,
        titulo: {
          id: titulo.id,
          valor: titulo.valor,
          vencimento: titulo.vencimento,
          pago: titulo.pago,
          invoiceurl: titulo.invoiceurl
        }
      };
      
      console.log('Enviando dados para webhook de WhatsApp:', webhookData);
      
      // Enviar para o endpoint do n8n
      const response = await fetch('https://webhooksn8nconecte.apanet.info/webhook/d0a98ca5-6889-45e7-a203-5ce7e6154805', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });
      
      if (response.ok) {
        console.log('Mensagem WhatsApp enviada com sucesso');
        toast.success('Mensagem WhatsApp enviada com sucesso');
      } else {
        const errorText = await response.text();
        console.error('Erro ao enviar mensagem WhatsApp:', errorText);
        toast.error('Erro ao enviar mensagem WhatsApp');
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      toast.error(`Erro ao enviar mensagem WhatsApp: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setEnviandoWhatsApp(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl p-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  Títulos do Contrato - {pppoe}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCriarTitulosModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Criar Títulos
                  </button>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none p-2"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="space-y-6 mt-4">
                {/* Loading States */}
                {loadingTitulosLocais && (
                  <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
                    <span className="ml-2 text-gray-600">Carregando títulos...</span>
                  </div>
                )}

                {/* No Titles Message */}
                {!loadingTitulosLocais && titulosLocais.length === 0 && (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Este contrato não possui títulos cadastrados.</p>
                  </div>
                )}

                {/* Lista de Títulos */}
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">Títulos do Contrato</h3>
                  {loadingTitulosLocais ? (
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : titulosLocais.length > 0 ? (
                    <div className="mt-2 max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Data Vencimento
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pago
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Data Pagamento
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quem Recebeu
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {titulosLocais.map((titulo) => (
                            <tr key={titulo.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {titulo.vencimento ? new Date(titulo.vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                }) : ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(titulo.valor)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  titulo.pago 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {titulo.pago ? 'Pago' : 'Em Aberto'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {titulo.data_pgto ? new Date(titulo.data_pgto + 'T00:00:00').toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                }) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {titulo.quemrecebeu || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center space-x-3">
                                  <button
                                    title="Ver detalhes do título"
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <EyeIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    title="Imprimir título"
                                    className="text-gray-600 hover:text-gray-800"
                                    onClick={() => handlePrintTitulo(titulo.invoiceurl)}
                                  >
                                    <PrinterIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    title="Dar baixa no título"
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <CheckCircleIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    title="Gerar Carnê"
                                    className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                                    onClick={handleGerarPDFBoletos}
                                    disabled={isGerandoCarne}
                                  >
                                    {isGerandoCarne ? (
                                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                    ) : (
                                      <DocumentArrowDownIcon className="h-5 w-5" />
                                    )}
                                  </button>
                                  <button
                                    title="Excluir título"
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => abrirConfirmacaoExclusao(titulo)}
                                    disabled={tituloParaExcluir === titulo.id}
                                  >
                                    {tituloParaExcluir === titulo.id ? (
                                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                    ) : (
                                      <TrashIcon className="h-5 w-5" />
                                    )}
                                  </button>
                                  <button
                                    title="Enviar mensagem WhatsApp"
                                    className="text-green-600 hover:text-green-800"
                                    onClick={() => handleEnviarWhatsApp(titulo)}
                                    disabled={enviandoWhatsApp === titulo.id || !cliente?.fonewhats}
                                  >
                                    {enviandoWhatsApp === titulo.id ? (
                                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                    ) : (
                                      <ChatBubbleLeftRightIcon className="h-5 w-5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mt-2">Nenhum título encontrado para este contrato.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Títulos */}
      {showCriarTitulosModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" />
            
            <div 
              className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setShowCriarTitulosModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Criar Títulos
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="dataInicial" className="block text-sm font-medium text-gray-700">
                      Data Inicial de Vencimento
                    </label>
                    <input
                      type="date"
                      id="dataInicial"
                      name="dataInicial"
                      min={getDataMinima()}
                      value={dataInicialVencimento}
                      onChange={(e) => setDataInicialVencimento(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="valor" className="block text-sm font-medium text-gray-700">
                      Valor (opcional)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R$</span>
                      </div>
                      <input
                        type="text"
                        id="valor"
                        name="valor"
                        placeholder={plano?.valor ? `Valor do plano: R$ ${plano.valor.toFixed(2)}` : 'Digite o valor'}
                        value={valorPersonalizado}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.,]/g, '');
                          if (value === '' || /^\d*[.,]?\d{0,2}$/.test(value)) {
                            setValorPersonalizado(value);
                          }
                        }}
                        className="mt-1 block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Se não informado, será usado o valor do plano
                    </p>
                  </div>

                  <div>
                    <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700">
                      Quantidade de Títulos
                    </label>
                    <input
                      type="number"
                      id="quantidade"
                      name="quantidade"
                      min="1"
                      max="12"
                      value={quantidadeTitulos}
                      onChange={(e) => setQuantidadeTitulos(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <p className="mt-1 text-sm text-gray-500">Máximo de 12 títulos por vez</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCriarTitulosModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarParaN8N}
                    disabled={!dataInicialVencimento || quantidadeTitulos < 1 || isCriandoTitulos}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    type="button"
                  >
                    {isCriandoTitulos ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                        Gerando títulos...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Criar Títulos
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" />
            
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">QR Code PIX</h3>
                <button onClick={() => setShowQrCode(false)} className="text-gray-500 hover:text-gray-700">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              {loadingQrCode ? (
                <div className="flex items-center justify-center py-4">
                  <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="text-center">
                  <img src={qrCodeImage} alt="QR Code PIX" className="mx-auto mb-4" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Linha Digitável Modal */}
      {showLinhaDigitavel && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" />
            
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Linha Digitável</h3>
                <button onClick={() => setShowLinhaDigitavel(false)} className="text-gray-500 hover:text-gray-700">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              {loadingLinhaDigitavel ? (
                <div className="flex items-center justify-center py-4">
                  <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Clique para copiar:
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(linhaDigitavel);
                      toast.success('Linha digitável copiada!');
                    }}
                    className="bg-gray-100 p-3 rounded-lg text-sm font-mono w-full text-left hover:bg-gray-200"
                  >
                    {linhaDigitavel}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmacao Exclusao Modal */}
      {showConfirmacaoExclusao && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Overlay para fechar o modal ao clicar fora dele */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => fecharConfirmacaoExclusao()} aria-hidden="true"></div>
            
            {/* Conteúdo do modal */}
            <div className="relative bg-white p-6 rounded-lg max-w-md w-full z-[10000] shadow-xl transform transition-all">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold" id="modal-title">Confirmação de Exclusão</h3>
                <button 
                  onClick={() => fecharConfirmacaoExclusao()} 
                  className="text-gray-500 hover:text-gray-700"
                  type="button"
                  aria-label="Fechar"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Esta ação não pode ser desfeita. O título será excluído permanentemente.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-2">
                  Você tem certeza que deseja excluir o título com as seguintes informações?
                </p>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-700"><span className="font-medium">Vencimento:</span> {tituloSelecionadoParaExclusao?.vencimento ? new Date(tituloSelecionadoParaExclusao.vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }) : ''}</p>
                  <p className="text-sm text-gray-700"><span className="font-medium">Valor:</span> {tituloSelecionadoParaExclusao?.valor ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tituloSelecionadoParaExclusao.valor) : ''}</p>
                  <p className="text-sm text-gray-700"><span className="font-medium">Status:</span> {tituloSelecionadoParaExclusao?.pago ? 'Pago' : 'Em Aberto'}</p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => fecharConfirmacaoExclusao()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmarExclusaoTitulo()}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  type="button"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
