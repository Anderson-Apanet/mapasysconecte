import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-toastify';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { findCustomerByCpfCnpj, getCustomerPayments, AsaasPayment } from '../services/asaasApi';

interface TitulosContratosModalProps {
  isOpen: boolean;
  onClose: () => void;
  pppoe: string;
  contrato: any;
}

export const TitulosContratosModal: React.FC<TitulosContratosModalProps> = ({
  isOpen,
  onClose,
  pppoe,
  contrato
}) => {
  const [asaasTitulos, setAsaasTitulos] = useState<AsaasPayment[]>([]);
  const [loadingAsaas, setLoadingAsaas] = useState(false);

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
        .select('cpf_cnpj, nome, idasaas')
        .eq('id', contrato.id_cliente)
        .single();

      if (clienteError) {
        console.error('Erro ao buscar dados do cliente:', clienteError);
        toast.error('Erro ao buscar dados do cliente no banco');
        return;
      }

      if (!cliente || !cliente.cpf_cnpj) {
        toast.warning('O cliente não possui um CPF/CNPJ cadastrado');
        return;
      }

      let asaasId = cliente.idasaas;

      // Se não tem ID do Asaas, tenta buscar pelo CPF/CNPJ
      if (!asaasId) {
        // Remover caracteres especiais do CPF/CNPJ
        const cpfCnpjLimpo = cliente.cpf_cnpj.replace(/[^\d]/g, '');
        console.log('CPF/CNPJ limpo:', cpfCnpjLimpo);
        
        // Buscar cliente no Asaas
        const clienteAsaas = await findCustomerByCpfCnpj(cpfCnpjLimpo);
        
        if (!clienteAsaas) {
          toast.warning(`Cliente ${cliente.nome} não está cadastrado no Asaas`);
          setAsaasTitulos([]);
          return;
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

        toast.success(`Cliente encontrado no Asaas: ${clienteAsaas.name}`);
      }

      // Buscar cobranças usando o ID do Asaas
      console.log('Buscando cobranças para o cliente Asaas:', asaasId);
      const pagamentos = await getCustomerPayments(asaasId);
      setAsaasTitulos(pagamentos);
      
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

  if (!isOpen) return null;

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: { text: string; color: string } } = {
      PENDING: { text: 'Pendente', color: 'yellow' },
      RECEIVED: { text: 'Recebido', color: 'green' },
      CONFIRMED: { text: 'Confirmado', color: 'green' },
      OVERDUE: { text: 'Vencido', color: 'red' },
      REFUNDED: { text: 'Reembolsado', color: 'gray' },
      RECEIVED_IN_CASH: { text: 'Recebido em Dinheiro', color: 'green' },
      REFUND_REQUESTED: { text: 'Reembolso Solicitado', color: 'orange' },
      CHARGEBACK_REQUESTED: { text: 'Chargeback Solicitado', color: 'red' },
      CHARGEBACK_DISPUTE: { text: 'Em Disputa de Chargeback', color: 'orange' },
      AWAITING_CHARGEBACK_REVERSAL: { text: 'Aguardando Reversão de Chargeback', color: 'orange' },
      DUNNING_REQUESTED: { text: 'Em Processo de Dunning', color: 'orange' },
      DUNNING_RECEIVED: { text: 'Recuperado por Dunning', color: 'green' },
      AWAITING_RISK_ANALYSIS: { text: 'Em Análise de Risco', color: 'yellow' }
    };

    return statusMap[status] || { text: status, color: 'gray' };
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg w-full max-w-4xl mx-4 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Títulos do Cliente</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Títulos do Asaas */}
          <div>
            {loadingAsaas ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Carregando títulos...</span>
              </div>
            ) : (
              <div>
                {asaasTitulos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
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
                            Descrição
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {asaasTitulos.map((titulo) => (
                          <tr key={titulo.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatarData(titulo.dateCreated)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatarData(titulo.dueDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatarValor(titulo.value)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${formatStatus(titulo.status).color}-100 text-${formatStatus(titulo.status).color}-800`}
                              >
                                {formatStatus(titulo.status).text}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {titulo.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum título encontrado para este cliente.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
