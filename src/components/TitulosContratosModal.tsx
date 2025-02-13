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
  CheckCircleIcon
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
      const response = await fetch('https://webhooks.apanet.tec.br/webhook/e4e61c7f-76a5-4d98-b725-d4fac879850b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar dados');
      }

      toast.success('Títulos enviados para geração');
      setShowCriarTitulosModal(false);
    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      toast.error('Erro ao enviar dados para geração dos títulos');
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
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {titulosLocais.map((titulo) => (
                            <tr key={titulo.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {titulo.vencimento ? new Date(titulo.vencimento + 'T00:00:00').toLocaleDateString() : ''}
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
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarParaN8N}
                    disabled={!dataInicialVencimento || quantidadeTitulos < 1}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Gerar Títulos
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
                  <p className="text-sm text-gray-600 mb-2">Clique para copiar:</p>
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
    </>
  );
};
