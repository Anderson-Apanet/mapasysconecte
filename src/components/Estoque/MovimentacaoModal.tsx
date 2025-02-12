import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../utils/supabaseClient';
import { debounce } from 'lodash';

interface Material {
  id: number;
  serialnb: string;
  tipo: string;
  id_modelo: number;
  etiqueta: string;
  observacoes: string;
  modelo?: {
    nome: string;
    marca: string;
  };
}

interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
}

interface Contrato {
  id: number;
  pppoe: string;
}

interface MovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (materialId: number, tipo: string, destinoId?: number) => void;
  material: Material;
}

const MovimentacaoModal: React.FC<MovimentacaoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  material
}) => {
  const [tipoMovimentacao, setTipoMovimentacao] = useState('empresa');
  const [destino, setDestino] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(false);

  // Limpar estados ao mudar tipo de movimentação
  useEffect(() => {
    setDestino('');
    setSearchTerm('');
    setContratos([]);
    setSelectedContrato(null);
  }, [tipoMovimentacao]);

  // Buscar lista de veículos
  useEffect(() => {
    const fetchVeiculos = async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .order('placa');

      if (!error && data) {
        setVeiculos(data);
      }
    };

    if (tipoMovimentacao === 'veiculo') {
      fetchVeiculos();
    }
  }, [tipoMovimentacao]);

  // Função para buscar contratos
  const searchContratos = async (search: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .ilike('pppoe', `%${search}%`)
        .limit(10);

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce para a busca de contratos
  const debouncedSearch = debounce((term: string) => {
    if (term.length >= 3) {
      searchContratos(term);
    } else {
      setContratos([]);
    }
  }, 300);

  // Atualizar busca quando o termo mudar
  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tipoMovimentacao === 'empresa') {
      onSave(material.id, tipoMovimentacao);
      return;
    }

    let selectedId: number | undefined;

    if (tipoMovimentacao === 'veiculo') {
      selectedId = veiculos.find(v => v.placa === destino)?.id;
    } else if (tipoMovimentacao === 'contrato') {
      selectedId = selectedContrato?.id;
    }

    if (selectedId) {
      onSave(material.id, tipoMovimentacao, selectedId);
    } else {
      console.error('ID não encontrado para:', tipoMovimentacao, destino);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Movimentar Material
          </Dialog.Title>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Material: {material.modelo?.marca} {material.modelo?.nome}
            </p>
            <p className="text-sm text-gray-600">
              Serial: {material.serialnb}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Movimentação
              </label>
              <select
                value={tipoMovimentacao}
                onChange={(e) => {
                  setTipoMovimentacao(e.target.value);
                  setDestino('');
                  setSearchTerm('');
                  setContratos([]);
                  setSelectedContrato(null);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="empresa">Empresa</option>
                <option value="veiculo">Veículo</option>
                <option value="contrato">Contrato</option>
              </select>
            </div>

            {tipoMovimentacao === 'veiculo' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Veículo
                </label>
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Selecione um veículo</option>
                  {veiculos.map((veiculo) => (
                    <option key={veiculo.id} value={veiculo.placa}>
                      {veiculo.placa} - {veiculo.modelo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipoMovimentacao === 'contrato' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Buscar Contrato
                </label>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10"
                    placeholder="Digite PPPoE"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                    ) : (
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                {contratos.length > 0 && (
                  <div className="mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-48 overflow-y-auto">
                    {contratos.map((contrato) => (
                      <button
                        key={contrato.id}
                        type="button"
                        onClick={() => {
                          setDestino(contrato.pppoe);
                          setSearchTerm(contrato.pppoe);
                          setSelectedContrato(contrato);
                          setContratos([]);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none"
                      >
                        <div className="font-medium">{contrato.pppoe}</div>
                      </button>
                    ))}
                  </div>
                )}
                {tipoMovimentacao === 'contrato' && (
                  <input
                    type="hidden"
                    name="contrato"
                    value={selectedContrato?.id || ''}
                    required
                  />
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default MovimentacaoModal;
