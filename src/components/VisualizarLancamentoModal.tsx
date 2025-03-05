import React from 'react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { Lancamento } from '../types/financeiro';
import { gerarReciboTermico } from './ReciboTermico';

interface VisualizarLancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
}

export default function VisualizarLancamentoModal({
  isOpen,
  onClose,
  lancamento
}: VisualizarLancamentoModalProps) {
  if (!lancamento) return null;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string | Date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl mx-4 p-6 shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
              Detalhes do Lançamento
            </Dialog.Title>
            <div className="flex space-x-2">
              <button
                onClick={() => gerarReciboTermico(lancamento)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Imprimir recibo"
              >
                <PrinterIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                Imprimir Recibo
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</h3>
                <p className={`text-lg font-semibold ${lancamento.tipopag === 'RECEITA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {lancamento.tipopag}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Data do Pagamento</h3>
                <p className="text-lg text-gray-900 dark:text-gray-100">
                  {formatDate(lancamento.data_pagamento)}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Descrição</h3>
              <p className="text-lg text-gray-900 dark:text-gray-100">{lancamento.descricao}</p>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(lancamento.total)}
                </p>
              </div>
              {lancamento.tipopag === 'RECEITA' && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Desconto</h3>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(lancamento.desconto)}
                      {lancamento.desconto_porcentagem > 0 && ` (${lancamento.desconto_porcentagem}%)`}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Juros</h3>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(lancamento.juros)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Multa</h3>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(lancamento.multa)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Payment Details for Revenue */}
            {lancamento.tipopag === 'RECEITA' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">PIX</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(lancamento.entrada_pixsicredi)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cartão de Crédito</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(lancamento.entrada_cartaocredito)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cartão de Débito</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(lancamento.entrada_cartaodebito)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dinheiro</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(lancamento.entrada_dinheiro)}
                  </p>
                </div>
                {lancamento.troco > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Troco</h3>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(lancamento.troco)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Registrado por</h3>
                <p className="text-lg text-gray-900 dark:text-gray-100">{lancamento.quemrecebeu}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Data do Registro</h3>
                <p className="text-lg text-gray-900 dark:text-gray-100">
                  {formatDate(lancamento.data_cad_lancamento)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
