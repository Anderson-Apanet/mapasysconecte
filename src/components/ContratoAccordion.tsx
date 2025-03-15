import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';

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
  
  // Log para depuração
  useEffect(() => {
    console.log('Contratos recebidos em ContratoAccordion:', JSON.stringify(contratos, null, 2));
  }, [contratos]);

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
      <div className="animate-pulse space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (contratos.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-700 dark:text-yellow-400">
        Este cliente não possui contratos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contratos.map(contrato => (
        <div 
          key={contrato.id} 
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
        >
          {/* Cabeçalho do contrato (sempre visível) */}
          <div 
            onClick={() => toggleContrato(contrato.id)}
            className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contrato.status)}`}>
                  {contrato.status || 'Não definido'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {contrato.pppoe || 'Sem PPPoE'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-[#1092E8]">Plano:</span> {contrato.plano?.nome || 'Não informado'} - {formatCurrency(contrato.plano?.valor || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Instalação: {contrato.data_instalacao ? formatDate(contrato.data_instalacao) : 'Não informado'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Vencimento: Dia {contrato.dia_vencimento || 'Não informado'}
                </p>
              </div>
              {isContratoExpanded(contrato.id) ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>

          {/* Conteúdo expandido do contrato */}
          {isContratoExpanded(contrato.id) && (
            <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
              {/* Detalhes do contrato */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Detalhes do Contrato
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Plano</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {contrato.plano?.nome || 'Não informado'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Valor: {formatCurrency(contrato.plano?.valor || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tipo de Contrato</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {contrato.tipo === 'bonificado' ? 'Cliente Bonificado' : 
                       contrato.tipo === 'anual' ? 'Contrato Anual' : 
                       contrato.tipo === 'anual_aluguel' ? 'Contrato Anual Aluguel' : 
                       'Contrato Padrão'}
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Endereço</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {contrato.endereco || 'Não informado'}
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Bairro</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {contrato.bairro?.nome || 'Não informado'}
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Data de Criação</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {contrato.created_at ? formatDate(contrato.created_at) : 'Não informado'}
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Data de Instalação</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {contrato.data_instalacao ? formatDate(contrato.data_instalacao) : 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Títulos do contrato */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Títulos
                </h4>
                {contrato.titulos && contrato.titulos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Nosso Número
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Vencimento
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Valor
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Pago
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {contrato.titulos
                          .slice()
                          .sort((a, b) => {
                            // Converter strings de data para objetos Date para comparação
                            const dateA = new Date(a.vencimento);
                            const dateB = new Date(b.vencimento);
                            return dateA.getTime() - dateB.getTime(); // Ordem crescente
                          })
                          .map(titulo => (
                          <tr key={titulo.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {titulo.nossonumero || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {titulo.vencimento ? formatDate(titulo.vencimento) : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatCurrency(titulo.valor || 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {titulo.pago ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                  Pago
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                    Este contrato não possui títulos registrados.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ContratoAccordion;
