import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabaseClient';
import { saveEvent } from '../../services/agenda';
import { format } from 'date-fns';
import Modal from '../Modal';
import { Dialog } from '@headlessui/react';
import { debounce } from 'lodash';

interface InstalacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AgendaEvent;
}

interface Material {
  id: number;
  serialnb: string;
  tipo: string;
}

interface Cliente {
  id: number;
  nome: string;
}

export default function InstalacaoModal({ isOpen, onClose, event }: InstalacaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [acompanhante, setAcompanhante] = useState('');
  const [relato, setRelato] = useState('');
  const [cto, setCto] = useState('');
  const [portaCto, setPortaCto] = useState('');
  const [searchOnu, setSearchOnu] = useState('');
  const [selectedOnu, setSelectedOnu] = useState<Material | null>(null);
  const [searchResults, setSearchResults] = useState<Material[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contratoAssinado, setContratoAssinado] = useState<boolean>(false);

  useEffect(() => {
    const fetchCliente = async () => {
      if (!event?.pppoe) {
        setCliente(null);
        return;
      }

      try {
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select('id_cliente')
          .eq('pppoe', event.pppoe)
          .single();

        if (contratoError) throw contratoError;

        if (contratoData?.id_cliente) {
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('id, nome')
            .eq('id', contratoData.id_cliente)
            .single();

          if (clienteError) throw clienteError;
          setCliente(clienteData);
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        toast.error('Erro ao buscar dados do cliente');
      }
    };

    fetchCliente();
  }, [event?.pppoe]);

  const searchMaterials = async (term: string) => {
    if (!term) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Buscando ONUs com termo:', term);
      
      const { data, error } = await supabase
        .from('materiais')
        .select('id, serialnb')
        .eq('tipo', 'Onu') 
        .ilike('serialnb', `%${term}%`)
        .order('serialnb');

      if (error) {
        console.error('Erro na query:', error);
        throw error;
      }

      console.log('Resultados encontrados:', data);
      setSearchResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      toast.error('Erro ao buscar materiais');
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = debounce(searchMaterials, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Valor digitado:', value);
    setSearchOnu(value);
    debouncedSearch(value);
  };

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Atualiza o evento como realizado
      await saveEvent({
        ...event,
        realizada: true
      });

      // Busca o ID do contrato e informações do plano pelo PPPoE
      let id_contrato = null;
      let plano_radius = null;
      let id_cliente = null;
      
      if (event.pppoe) {
        // Busca contrato e plano
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select(`
            id,
            id_cliente,
            planos (
              radius
            )
          `)
          .eq('pppoe', event.pppoe)
          .single();

        if (contratoError) {
          console.error('Erro ao buscar contrato:', contratoError);
        } else if (contratoData) {
          id_contrato = contratoData.id;
          id_cliente = contratoData.id_cliente;
          plano_radius = contratoData.planos?.radius;

          // Atualiza os campos do contrato
          const { error: updateError } = await supabase
            .from('contratos')
            .update({
              status: 'Ativo',
              data_instalacao: event.datainicio,
              contratoassinado: contratoAssinado
            })
            .eq('id', contratoData.id);

          if (updateError) {
            console.error('Erro ao atualizar contrato:', updateError);
            throw updateError;
          }

          // Atualiza o status do cliente para Ativo
          if (id_cliente) {
            const { error: clienteError } = await supabase
              .from('clientes')
              .update({ status: 'Ativo' })
              .eq('id', id_cliente);

            if (clienteError) {
              console.error('Erro ao atualizar status do cliente:', clienteError);
              throw clienteError;
            }
          }
        }
      }

      // Registra a instalação
      const { data: instalacao, error: instalacaoError } = await supabase
        .from('instalacao')
        .insert({
          id_agenda: event.id,
          data_instalacao: event.datainicio,
          relato: observacao,
          acompanhante: acompanhante || null,
          id_contrato: id_contrato
        })
        .select()
        .single();

      if (instalacaoError) throw instalacaoError;

      // Registra os técnicos responsáveis
      if (event.responsaveis && event.responsaveis.length > 0) {
        const tecnicosInsert = event.responsaveis.map(resp => ({
          instalacao_id: instalacao.id,
          tecnico_id: resp.id
        }));

        const { error: tecnicosError } = await supabase
          .from('instalacao_tecnicos')
          .insert(tecnicosInsert);

        if (tecnicosError) throw tecnicosError;
      }

      // Envia dados para o webhook do N8N
      if (event.pppoe && plano_radius) {
        try {
          // Extrai apenas os números do PPPoE e inverte para gerar a senha
          const numeros = event.pppoe.replace(/\D/g, ''); // Remove não-dígitos
          const senha = numeros.split('').reverse().join(''); // Inverte os números

          const response = await fetch('https://webhooks.apanet.tec.br/webhook/registrapppoeradius', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pppoe: event.pppoe,
              radius: plano_radius,
              senha: senha
            })
          });

          if (!response.ok) {
            throw new Error('Erro ao registrar PPPoE no Radius');
          }

          console.log('PPPoE registrado no Radius com sucesso');
        } catch (error) {
          console.error('Erro ao enviar dados para o webhook:', error);
          toast.error('Erro ao registrar PPPoE no Radius');
        }
      }

      toast.success('Instalação registrada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao registrar instalação:', error);
      toast.error('Erro ao registrar instalação');
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
            Registrar Instalação
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Nome:</strong> {event.nome}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Data:</strong> {event.datainicio}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Responsáveis:</strong>{' '}
                  {event.responsaveis?.map(resp => resp.nome).join(', ') || 'Nenhum responsável definido'}
                </p>
                {event.descricao && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Descrição:</strong> {event.descricao}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observações
                </label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={4}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  CTO
                </label>
                <input
                  type="text"
                  value={cto}
                  onChange={(e) => setCto(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Porta da CTO
                </label>
                <input
                  type="text"
                  value={portaCto}
                  onChange={(e) => setPortaCto(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                />
              </div>

              <div className="relative">
                <label htmlFor="onu" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ONU (Serial)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="onu"
                    value={searchOnu}
                    onChange={handleSearchChange}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Digite o serial da ONU"
                  />
                  {isSearching && (
                    <div className="absolute right-2 top-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  )}
                  {searchResults.length > 0 && !selectedOnu && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg">
                      <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
                        {searchResults.map((material) => (
                          <li
                            key={material.id}
                            onClick={() => {
                              setSelectedOnu(material);
                              setSearchOnu(material.serialnb);
                              setSearchResults([]);
                            }}
                            className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {material.serialnb}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {selectedOnu && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      ONU selecionada: {selectedOnu.serialnb}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOnu(null);
                        setSearchOnu('');
                      }}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="acompanhante" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Acompanhante
                </label>
                <input
                  type="text"
                  id="acompanhante"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={acompanhante}
                  onChange={(e) => setAcompanhante(e.target.value)}
                  placeholder="Nome de quem acompanhou a instalação"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contrato Assinado
                </label>
                <div className="mt-1">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={contratoAssinado}
                      onChange={(e) => setContratoAssinado(e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                      Sim, o contrato foi assinado
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Relato
                </label>
                <textarea
                  value={relato}
                  onChange={(e) => setRelato(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
