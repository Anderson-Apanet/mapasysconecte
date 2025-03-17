import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { Lancamento } from '../types/financeiro';
import { gerarReciboTermico } from './ReciboTermico';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
  const [lancamentoCompleto, setLancamentoCompleto] = useState<Lancamento | null>(null);

  useEffect(() => {
    if (isOpen && lancamento) {
      // Buscar dados do título associado ao lançamento
      const buscarDadosTitulo = async () => {
        try {
          console.log('Dados do lançamento:', lancamento);
          
          // Se tiver titulo_id, busca pelo id
          if (lancamento.titulo_id) {
            console.log('Buscando dados do título pelo ID:', lancamento.titulo_id);
            
            const { data: titulo, error } = await supabase
              .from('titulos')
              .select('*')
              .eq('id', lancamento.titulo_id)
              .single();
            
            if (error) {
              console.error('Erro ao buscar título pelo ID:', error);
              throw error;
            }
            
            if (titulo) {
              console.log('Título encontrado pelo ID:', titulo);
              // Combinar os dados do título com os dados do lançamento
              setLancamentoCompleto({
                ...lancamento,
                nossonumero: titulo.nossonumero,
                vencimento: titulo.vencimento
              });
              return;
            }
          }
          
          // Se tiver titulobancario mas não encontrou pelo ID, busca pelo nossonumero
          if (lancamento.titulobancario) {
            console.log('Buscando dados do título pelo nossonumero:', lancamento.titulobancario);
            
            const { data: titulo, error } = await supabase
              .from('titulos')
              .select('*')
              .eq('nossonumero', lancamento.titulobancario)
              .single();
            
            if (error) {
              console.error('Erro ao buscar título pelo nossonumero:', error);
            } else if (titulo) {
              console.log('Título encontrado pelo nossonumero:', titulo);
              // Combinar os dados do título com os dados do lançamento
              setLancamentoCompleto({
                ...lancamento,
                nossonumero: titulo.nossonumero,
                vencimento: titulo.vencimento
              });
              return;
            }
          }
          
          // Se não encontrou o título ou não tem informações para buscar,
          // usa o próprio lançamento
          console.log('Usando dados do próprio lançamento');
          setLancamentoCompleto(lancamento);
        } catch (error) {
          console.error('Erro ao buscar título:', error);
          setLancamentoCompleto(lancamento);
        }
      };
      
      buscarDadosTitulo();
    } else {
      setLancamentoCompleto(null);
    }
  }, [isOpen, lancamento]);

  if (!lancamento) return null;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '';
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
                onClick={() => {
                  if (lancamentoCompleto) {
                    console.log('Tentando gerar recibo para:', lancamentoCompleto);
                    gerarReciboTermico(lancamentoCompleto)
                      .then(() => {
                        console.log('Recibo gerado com sucesso');
                      })
                      .catch(error => {
                        console.error('Erro ao gerar recibo:', error);
                      });
                  }
                }}
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
                <p className={`text-lg font-semibold ${lancamentoCompleto?.tipopag === 'RECEITA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {lancamentoCompleto?.tipopag}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Data do Pagamento</h3>
                <p className="text-lg text-gray-900 dark:text-gray-100">
                  {formatDate(lancamentoCompleto?.data_pagamento)}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Descrição</h3>
              <p className="text-lg text-gray-900 dark:text-gray-100">{lancamentoCompleto?.descricao}</p>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(lancamentoCompleto?.total)}
                </p>
              </div>
              {lancamentoCompleto?.tipopag === 'RECEITA' && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Desconto</h3>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(lancamentoCompleto?.desconto)}
                      {lancamentoCompleto?.desconto_porcentagem && lancamentoCompleto.desconto_porcentagem > 0 && ` (${lancamentoCompleto.desconto_porcentagem}%)`}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Juros</h3>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(lancamentoCompleto?.juros)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Multa</h3>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(lancamentoCompleto?.multa)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Payment Details for Revenue */}
            {lancamentoCompleto?.tipopag === 'RECEITA' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">PIX</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(lancamentoCompleto?.entrada_pixsicredi)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cartão de Crédito</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(lancamentoCompleto?.entrada_cartaocredito)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cartão de Débito</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(lancamentoCompleto?.entrada_cartaodebito)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dinheiro</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(lancamentoCompleto?.entrada_dinheiro)}
                  </p>
                </div>
                {lancamentoCompleto?.troco && lancamentoCompleto.troco > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Troco</h3>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(lancamentoCompleto.troco)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Registrado por</h3>
                <p className="text-lg text-gray-900 dark:text-gray-100">{lancamentoCompleto?.quemrecebeu}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Data do Registro</h3>
                <p className="text-lg text-gray-900 dark:text-gray-100">
                  {formatDate(lancamentoCompleto?.data_cad_lancamento)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nº do Título</h3>
                <p className="text-lg text-gray-900 dark:text-gray-100">{lancamentoCompleto?.nossonumero}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Vencimento</h3>
                <p className="text-lg text-gray-900 dark:text-gray-100">
                  {formatDate(lancamentoCompleto?.vencimento)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
