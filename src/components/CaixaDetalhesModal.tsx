import React from 'react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Caixa } from '../types/caixa';
import { Lancamento } from '../types/lancamento';

interface CaixaDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  caixa: {
    id: number;
    horario_abertura: string;
    horario_fechamento: string | null;
    users: {
      nome: string;
    };
    lancamentos: Lancamento[];
    saldo: {
      receitas: number;
      despesas: number;
    }[];
  } | null;
}

const CaixaDetalhesModal: React.FC<CaixaDetalhesModalProps> = ({ isOpen, onClose, caixa }) => {
  if (!caixa) return null;

  const formatDateTime = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const saldoTotal = caixa.saldo?.[0]?.receitas - caixa.saldo?.[0]?.despesas;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full rounded-xl bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Detalhes do Caixa
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Informações do Caixa */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Operador
                </h3>
                <p className="text-base text-gray-900 dark:text-white">
                  {caixa.users?.nome || 'Não informado'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </h3>
                <p className={`text-base font-medium ${
                  caixa.horario_fechamento 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {caixa.horario_fechamento ? 'Fechado' : 'Aberto'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Abertura
                </h3>
                <p className="text-base text-gray-900 dark:text-white">
                  {formatDateTime(caixa.horario_abertura)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Fechamento
                </h3>
                <p className="text-base text-gray-900 dark:text-white">
                  {caixa.horario_fechamento 
                    ? formatDateTime(caixa.horario_fechamento)
                    : '-'}
                </p>
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                  Total Receitas
                </h4>
                <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {formatMoney(caixa.saldo?.[0]?.receitas || 0)}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                  Total Despesas
                </h4>
                <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                  {formatMoney(caixa.saldo?.[0]?.despesas || 0)}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                  Saldo Final
                </h4>
                <p className={`text-lg font-semibold ${
                  saldoTotal >= 0 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {formatMoney(saldoTotal || 0)}
                </p>
              </div>
            </div>

            {/* Lista de Lançamentos */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Lançamentos
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Forma Pagto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {caixa.lancamentos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Nenhum lançamento encontrado
                        </td>
                      </tr>
                    ) : (
                      caixa.lancamentos.map((lancamento) => (
                        <tr key={lancamento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatDateTime(lancamento.data_cad_lancamento)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              lancamento.tipopag === 'RECEITA'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {lancamento.tipopag}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                            {lancamento.descricao}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {lancamento.cliente?.nome || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {lancamento.forma_pagamento}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={
                              lancamento.tipopag === 'RECEITA'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }>
                              {formatMoney(lancamento.total)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CaixaDetalhesModal;
