import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PAYMENT_GATEWAYS, PaymentGateway } from '../types/financeiro';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { useMoneyInput } from '../hooks/useMoneyInput';

interface ContratoInfo {
  id: number;
  cliente: string;
  plano: string;
}

interface ClienteInfo {
  id: number;
  cpfcnpj: string;
  idasaas: string;
}

interface CriarTituloModalProps {
  isOpen: boolean;
  onClose: () => void;
  pppoe: string;
  onTituloCreated: () => void;
  userName: string;
}

export const CriarTituloModal: React.FC<CriarTituloModalProps> = ({
  isOpen,
  onClose,
  pppoe,
  onTituloCreated,
  userName
}) => {
  const [gateway, setGateway] = useState<PaymentGateway>('sicredi');
  const moneyInput = useMoneyInput();
  const [dataVencimento, setDataVencimento] = useState('');
  const [quantidadeTitulos, setQuantidadeTitulos] = useState('1');
  const [loading, setLoading] = useState(false);
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null);
  const [clienteInfo, setClienteInfo] = useState<ClienteInfo | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        // Buscar informações do contrato
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select('id, cliente, plano')
          .eq('pppoe', pppoe)
          .single();

        if (contratoError) throw contratoError;
        
        if (contratoData) {
          setContratoInfo(contratoData);
          
          // Buscar informações do cliente pelo nome
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('id,cpf_cnpj,idasaas')
            .eq('nome', contratoData.cliente)
            .maybeSingle();

          if (clienteError) {
            console.error('Erro ao buscar cliente:', clienteError);
            throw new Error('Não foi possível carregar as informações do cliente');
          }
          
          if (!clienteData) {
            throw new Error(`Cliente "${contratoData.cliente}" não encontrado`);
          }
          
          setClienteInfo({
            id: clienteData.id,
            cpfcnpj: clienteData.cpf_cnpj,
            idasaas: clienteData.idasaas
          });
        } else {
          throw new Error('Contrato não encontrado');
        }
      } catch (error) {
        console.error('Erro ao buscar informações:', error);
        toast.error('Erro ao carregar informações necessárias');
      }
    };

    if (isOpen) {
      fetchInfo();
    }
  }, [isOpen, pppoe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!contratoInfo || !clienteInfo) {
        throw new Error('Informações do contrato ou cliente não encontradas');
      }

      const quantidade = parseInt(quantidadeTitulos);
      if (quantidade < 1 || quantidade > 36) {
        throw new Error('A quantidade de títulos deve estar entre 1 e 36');
      }

      const valorNumerico = moneyInput.getValue();

      // Preparar payload para o N8N
      const payload = {
        cliente: contratoInfo.cliente,
        cpfcnpj: clienteInfo.cpfcnpj,
        valor: valorNumerico,
        idasaas: clienteInfo.idasaas,
        billingType: "BOLETO",
        nextDueDate: dataVencimento,
        cycle: "MONTHLY",
        maxPayments: quantidade,
        interest: 1.5,
        fine: 2,
        description: contratoInfo.plano,
        externalReference: pppoe,
        idcontrato: contratoInfo.id,
        idcliente: clienteInfo.id,
        metadata: {
          quantidade: quantidade,
          dataGeracao: new Date().toISOString(),
          usuarioGerador: userName,
          pppoe: pppoe,
          formaPagamento: gateway
        }
      };

      // Enviar dados para o N8N
      const response = await fetch('https://workflows.apanet.tec.br/webhook-test/asaasnovo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar dados para processamento. Por favor, tente novamente.');
      }

      toast.success(`${quantidade} título${quantidade > 1 ? 's' : ''} enviado${quantidade > 1 ? 's' : ''} para processamento!`);
      onTituloCreated();
      onClose();
    } catch (error: any) {
      console.error('Erro ao processar títulos:', error);
      toast.error(error.message || 'Erro ao processar títulos');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Criar Títulos
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Gateway de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-4">
              {PAYMENT_GATEWAYS.map((gw) => (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => setGateway(gw.id)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    gateway === gw.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <img
                      src={gw.logo}
                      alt={gw.label}
                      className="h-8 object-contain"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {gw.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Valor
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={moneyInput.value}
              onChange={(e) => moneyInput.onChange(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="R$ 0,00"
              required
            />
          </div>

          {/* Quantidade de Títulos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantidade de Títulos
            </label>
            <input
              type="number"
              min="1"
              max="36"
              value={quantidadeTitulos}
              onChange={(e) => setQuantidadeTitulos(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Máximo de 36 títulos. Cada título terá vencimento 30 dias após o anterior.
            </p>
          </div>

          {/* Data do Primeiro Vencimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data do Primeiro Vencimento
            </label>
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Títulos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
