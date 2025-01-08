import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-toastify';
import { 
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  QrCodeIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon
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
  const [asaasTitulos, setAsaasTitulos] = useState<AsaasPayment[]>([]);
  const [loadingAsaas, setLoadingAsaas] = useState(false);
  const [showLinhaDigitavel, setShowLinhaDigitavel] = useState(false);
  const [linhaDigitavel, setLinhaDigitavel] = useState('');
  const [loadingLinhaDigitavel, setLoadingLinhaDigitavel] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [loadingQrCode, setLoadingQrCode] = useState(false);

  const buscarTitulosAsaas = async () => {
    if (!contrato || !contrato.id_cliente) {
      console.warn('Contrato ou ID do cliente não fornecido');
      return;
    }

    try {
      setLoadingAsaas(true);
      console.log('Buscando títulos do Asaas para o cliente:', contrato.id_cliente);
      
      // Buscar dados do cliente no banco local
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', contrato.id_cliente)
        .single();

      if (clienteError) {
        console.error('Erro ao buscar dados do cliente:', clienteError);
        toast.error('Erro ao buscar dados do cliente no banco');
        return;
      }

      let asaasId = cliente?.idasaas;
      let clienteAsaas;

      if (!asaasId) {
        // Remover caracteres especiais do CPF/CNPJ
        const cpfCnpjLimpo = cliente.cpf_cnpj.replace(/[^\d]/g, '');
        console.log('CPF/CNPJ limpo:', cpfCnpjLimpo);
        
        // Buscar cliente no Asaas
        clienteAsaas = await findCustomerByCpfCnpj(cpfCnpjLimpo);
        
        // Se o cliente não existe no Asaas, criar
        if (!clienteAsaas) {
          try {
            const customerData: CreateCustomerData = {
              name: cliente.nome,
              cpfCnpj: cpfCnpjLimpo,
              email: cliente.email || `${cpfCnpjLimpo}@email.com`,
              phone: cliente.telefone || undefined,
              mobilePhone: cliente.celular || undefined,
              address: cliente.endereco || undefined,
              addressNumber: cliente.numero || undefined,
              complement: cliente.complemento || undefined,
              province: cliente.bairro || undefined,
              postalCode: cliente.cep ? cliente.cep.replace(/[^\d]/g, '') : undefined,
              city: cliente.cidade || undefined,
              state: cliente.estado || undefined
            };

            clienteAsaas = await createCustomer(customerData);
            toast.success(`Cliente ${cliente.nome} criado no Asaas com sucesso!`);
          } catch (error: any) {
            console.error('Erro ao criar cliente no Asaas:', error);
            toast.error('Erro ao criar cliente no Asaas: ' + error.message);
            return;
          }
        }

        // Salvar o ID do Asaas no banco local
        asaasId = clienteAsaas.id;
        const { error: updateError } = await supabase
          .from('clientes')
          .update({ idasaas: asaasId })
          .eq('id', contrato.id_cliente);

        if (updateError) {
          console.error('Erro ao atualizar ID do Asaas:', updateError);
          toast.error('Erro ao atualizar ID do Asaas no banco');
          return;
        }

        toast.success(`Cliente vinculado ao Asaas: ${clienteAsaas.name}`);
      }

      // Buscar cobranças usando o ID do Asaas
      console.log('Buscando cobranças para o cliente Asaas:', asaasId);
      const pagamentos = await getCustomerPayments(asaasId);
      
      // Ordenar pagamentos por data de vencimento (ascendente)
      const pagamentosOrdenados = pagamentos.sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      setAsaasTitulos(pagamentosOrdenados);
      
    } catch (error: any) {
      console.error('Erro ao buscar títulos no Asaas:', error);
      toast.error(error.message || 'Erro ao buscar títulos no Asaas');
      setAsaasTitulos([]);
    } finally {
      setLoadingAsaas(false);
    }
  };

  useEffect(() => {
    if (isOpen && contrato) {
      console.log('Modal aberto com contrato:', contrato);
      buscarTitulosAsaas();
    }
  }, [isOpen, contrato]);

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

  if (!isOpen) return null;

  return (
    <>
      <Dialog 
        open={isOpen} 
        onClose={onClose}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg w-full max-w-4xl mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-medium">
                Títulos do Contrato {pppoe}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {loadingAsaas ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vencimento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {asaasTitulos.map((titulo) => (
                      <tr key={titulo.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(titulo.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(titulo.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            titulo.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                            titulo.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            titulo.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {titulo.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              title="Editar"
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              title="Excluir"
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                            <button
                              title="Estornar"
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </button>
                            <button
                              title="Ver linha digitável"
                              className="text-gray-600 hover:text-gray-900"
                              onClick={() => handleVerLinhaDigitavel(titulo.id)}
                              disabled={loadingLinhaDigitavel}
                            >
                              <DocumentTextIcon className="h-5 w-5" />
                            </button>
                            <button
                              title="Ver QR Code PIX"
                              className="text-green-600 hover:text-green-900"
                              onClick={() => handleVerQrCode(titulo.id)}
                              disabled={loadingQrCode}
                            >
                              <QrCodeIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Modal da Linha Digitável */}
      <Dialog
        open={showLinhaDigitavel}
        onClose={() => setShowLinhaDigitavel(false)}
        className="fixed inset-0 z-20 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-medium">
                Linha Digitável
              </Dialog.Title>
              <button
                onClick={() => setShowLinhaDigitavel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-mono break-all">{linhaDigitavel}</p>
                <button
                  onClick={handleCopyLinhaDigitavel}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  title="Copiar"
                >
                  <ClipboardDocumentIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowLinhaDigitavel(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Modal do QR Code PIX */}
      <Dialog
        open={showQrCode}
        onClose={() => setShowQrCode(false)}
        className="fixed inset-0 z-20 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-medium">
                QR Code PIX
              </Dialog.Title>
              <button
                onClick={() => setShowQrCode(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                {qrCodeImage && (
                  <img 
                    src={`data:image/png;base64,${qrCodeImage}`} 
                    alt="QR Code PIX" 
                    className="w-64 h-64"
                  />
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowQrCode(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};
