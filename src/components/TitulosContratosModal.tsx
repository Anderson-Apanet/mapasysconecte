import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '../utils/supabaseClient';
import { Titulo } from '../types/financeiro';
import { CriarTituloModal } from './CriarTituloModal';
import { toast } from 'react-toastify';
import Modal from './Modal';
import { Tooltip } from '@material-tailwind/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { XMarkIcon, PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { DetalhesTituloModal } from './DetalhesTituloModal';

interface TitulosContratosModalProps {
  isOpen: boolean;
  onClose: () => void;
  pppoe: string;
}

type FiltroTitulos = 'todos' | 'pagos' | 'pendentes';

export const TitulosContratosModal: React.FC<TitulosContratosModalProps> = ({
  isOpen,
  onClose,
  pppoe
}) => {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCriarTitulo, setShowCriarTitulo] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [tituloSelecionado, setTituloSelecionado] = useState<Titulo | null>(null);
  const [filtroAtual, setFiltroAtual] = useState<FiltroTitulos>('pendentes');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const titulosPorPagina = 6;

  const fetchTitulos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('titulos')
        .select('*')
        .eq('pppoe', pppoe)
        .eq('baixado', false) // Sempre excluir títulos baixados
        .order('vencimento', { ascending: true });

      // Aplicar filtros adicionais
      if (filtroAtual === 'pagos') {
        query = query.eq('pago', true);
      } else if (filtroAtual === 'pendentes') {
        query = query.eq('pago', false);
      }
      // Para 'todos', não precisa de filtro adicional pois já está filtrando baixado = false

      const { data, error } = await query;

      if (error) throw error;
      setTitulos(data || []);
      setPaginaAtual(1); // Reset para primeira página ao mudar filtro
    } catch (error: any) {
      console.error('Erro ao carregar títulos:', error);
      toast.error('Erro ao carregar títulos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de paginação
  const totalPaginas = Math.ceil(titulos.length / titulosPorPagina);
  const indiceInicial = (paginaAtual - 1) * titulosPorPagina;
  const titulosPaginados = titulos.slice(indiceInicial, indiceInicial + titulosPorPagina);

  const proximaPagina = () => {
    if (paginaAtual < totalPaginas) {
      setPaginaAtual(prev => prev + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaAtual > 1) {
      setPaginaAtual(prev => prev - 1);
    }
  };

  const handleDarBaixa = (titulo: Titulo) => {
    setTituloSelecionado(titulo);
    setShowConfirmacao(true);
  };

  const handleVerDetalhes = (titulo: Titulo) => {
    setTituloSelecionado(titulo);
    setShowDetalhes(true);
  };

  const confirmarBaixa = async () => {
    if (!tituloSelecionado) return;

    try {
      const { error } = await supabase
        .from('titulos')
        .update({ baixado: true })
        .eq('id', tituloSelecionado.id);

      if (error) throw error;

      toast.success('Título baixado com sucesso!');
      fetchTitulos();
    } catch (error: any) {
      console.error('Erro ao dar baixa no título:', error);
      toast.error('Erro ao dar baixa no título: ' + error.message);
    } finally {
      setShowConfirmacao(false);
      setTituloSelecionado(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTitulos();
    }
  }, [isOpen, pppoe, filtroAtual]);

  if (!isOpen) return null;

  return (
    <>
      <Transition.Root show={isOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-10" onClose={onClose}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Títulos do Contrato: {pppoe}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Botão Criar Título */}
              <div className="mb-4">
                <button
                  onClick={() => setShowCriarTitulo(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Criar Título
                </button>
              </div>

              {/* Filtro */}
              <div className="mb-4 flex justify-end">
                <select
                  value={filtroAtual}
                  onChange={(e) => setFiltroAtual(e.target.value as FiltroTitulos)}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="pagos">Pagos</option>
                  <option value="pendentes">Pendentes</option>
                </select>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Nosso Número
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Vencimento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Pago
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {titulosPaginados.map((titulo) => (
                        <tr key={titulo.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {titulo.nossonumero || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Date(titulo.vencimento).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(titulo.valor)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {titulo.pago ? 'Sim' : 'Não'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleVerDetalhes(titulo)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Ver detalhes"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              {!titulo.pago && !titulo.baixado && (
                                <button
                                  onClick={() => handleDarBaixa(titulo)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Dar baixa"
                                >
                                  <CheckCircleIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {titulos.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            Nenhum título encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Paginação */}
                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={paginaAnterior}
                        disabled={paginaAtual === 1}
                        className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                          paginaAtual === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        Anterior
                      </button>
                      <button
                        onClick={proximaPagina}
                        disabled={paginaAtual === totalPaginas}
                        className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                          paginaAtual === totalPaginas ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        Próxima
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Mostrando <span className="font-medium">{indiceInicial + 1}</span> até{' '}
                          <span className="font-medium">
                            {Math.min(indiceInicial + titulosPorPagina, titulos.length)}
                          </span>{' '}
                          de <span className="font-medium">{titulos.length}</span> resultados
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={paginaAnterior}
                            disabled={paginaAtual === 1}
                            className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                              paginaAtual === 1 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <span className="sr-only">Anterior</span>
                            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            onClick={proximaPagina}
                            disabled={paginaAtual === totalPaginas}
                            className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                              paginaAtual === totalPaginas ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <span className="sr-only">Próxima</span>
                            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal de Criar Título */}
            {showCriarTitulo && (
              <CriarTituloModal
                isOpen={showCriarTitulo}
                onClose={() => setShowCriarTitulo(false)}
                pppoe={pppoe}
                onTituloCreated={fetchTitulos}
              />
            )}

            {/* Modal de Detalhes */}
            <DetalhesTituloModal
              isOpen={showDetalhes}
              onClose={() => setShowDetalhes(false)}
              titulo={tituloSelecionado}
            />

            {/* Modal de Confirmação */}
            <Modal
              isOpen={showConfirmacao}
              onClose={() => setShowConfirmacao(false)}
              title="Confirmar Baixa"
            >
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tem certeza que deseja dar baixa neste título? Esta ação não poderá ser desfeita.
                </p>
              </div>

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    setShowConfirmacao(false);
                    setTituloSelecionado(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  onClick={confirmarBaixa}
                >
                  Confirmar
                </button>
              </div>
            </Modal>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};
