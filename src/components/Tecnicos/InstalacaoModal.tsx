import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { AgendaEvent } from '../../types/agenda';
import { supabase } from '../../utils/supabaseClient';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';

interface InstalacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AgendaEvent | null;
  onEventUpdated: () => void;
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

export function InstalacaoModal({ isOpen, onClose, event, onEventUpdated }: InstalacaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [acompanhante, setAcompanhante] = useState('');
  const [relato, setRelato] = useState('');
  const [cto, setCto] = useState('');
  const [porta, setPorta] = useState('');
  const [searchOnu, setSearchOnu] = useState('');
  const [selectedOnu, setSelectedOnu] = useState<Material | null>(null);
  const [searchResults, setSearchResults] = useState<Material[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);

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
    if (!event) return;

    try {
      setLoading(true);
      console.log('Iniciando salvamento da instalação...');

      // Buscar o usuário logado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }
      console.log('Usuário autenticado:', session.user.id);

      // Se tiver PPPoE, buscar o id do contrato e o cliente
      let id_contrato = null;
      let id_cliente = null;
      if (event.pppoe) {
        console.log('Buscando contrato para PPPoE:', event.pppoe);
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select(`
            id,
            id_cliente
          `)
          .eq('pppoe', event.pppoe)
          .single();

        if (contratoError) {
          console.error('Erro ao buscar contrato:', contratoError);
          throw contratoError;
        }

        if (contratoData) {
          id_contrato = contratoData.id;
          id_cliente = contratoData.id_cliente;
          console.log('Contrato encontrado:', id_contrato, 'Cliente:', id_cliente);

          // Atualizar o status do cliente para Ativo
          if (id_cliente) {
            console.log('Atualizando status do cliente para Ativo');
            const { error: clienteUpdateError } = await supabase
              .from('clientes')
              .update({ status: 'Ativo' })
              .eq('id', id_cliente);

            if (clienteUpdateError) {
              console.error('Erro ao atualizar status do cliente:', clienteUpdateError);
              throw clienteUpdateError;
            }
            console.log('Status do cliente atualizado com sucesso');
          }

          // Atualizar o id_material no contrato se uma ONU foi selecionada
          if (selectedOnu) {
            console.log('Atualizando material no contrato:', selectedOnu.id);
            const { error: contratoUpdateError } = await supabase
              .from('contratos')
              .update({
                id_material: selectedOnu.id,
                data_instalacao: new Date().toISOString(),
                status: 'Ativo'
              })
              .eq('id', id_contrato);

            if (contratoUpdateError) {
              console.error('Erro ao atualizar material no contrato:', contratoUpdateError);
              throw contratoUpdateError;
            }
            console.log('Material atualizado no contrato com sucesso');
          } else {
            // Se não tiver ONU selecionada, atualiza apenas o status e a data
            console.log('Atualizando status do contrato para Ativo');
            const { error: contratoUpdateError } = await supabase
              .from('contratos')
              .update({
                data_instalacao: new Date().toISOString(),
                status: 'Ativo'
              })
              .eq('id', id_contrato);

            if (contratoUpdateError) {
              console.error('Erro ao atualizar status do contrato:', contratoUpdateError);
              throw contratoUpdateError;
            }
            console.log('Status do contrato atualizado com sucesso');
          }
        } else {
          console.error('Contrato não encontrado para PPPoE:', event.pppoe);
          throw new Error('Contrato não encontrado');
        }
      }

      // Preparar dados para inserção
      const instalacaoData = {
        id_agenda: event.id,
        data_instalacao: new Date().toISOString(),
        id_user: session.user.id,
        acompanhante: acompanhante || null,
        relato: relato || null
      };

      // Adicionar id_contrato apenas se existir
      if (id_contrato) {
        instalacaoData['id_contrato'] = id_contrato;
      }

      console.log('Dados da instalação a serem salvos:', instalacaoData);

      // Inserir na tabela instalacao
      const { data: instalacaoResult, error: instalacaoError } = await supabase
        .from('instalacao')
        .insert([instalacaoData])
        .select()
        .single();

      if (instalacaoError) {
        console.error('Erro ao salvar instalação:', instalacaoError);
        throw instalacaoError;
      }
      console.log('Instalação salva com sucesso:', instalacaoResult);

      // Atualizar o evento na agenda como realizado
      console.log('Atualizando evento na agenda:', event.id);
      const { error: agendaUpdateError } = await supabase
        .from('agenda')
        .update({
          realizada: true,
          parcial: false
        })
        .eq('id', event.id);

      if (agendaUpdateError) {
        console.error('Erro ao atualizar agenda:', agendaUpdateError);
        throw agendaUpdateError;
      }
      console.log('Evento atualizado na agenda com sucesso');

      toast.success('Instalação salva com sucesso!');
      onEventUpdated();
      onClose();
      
      // Limpar os campos
      setAcompanhante('');
      setRelato('');
      setCto('');
      setPorta('');
      setSearchOnu('');
      setSelectedOnu(null);
    } catch (error) {
      console.error('Erro ao salvar instalação:', error);
      if (error instanceof Error) {
        toast.error(`Erro ao salvar instalação: ${error.message}`);
      } else {
        toast.error('Erro ao salvar instalação');
      }
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
                <label className="block text-sm font-medium text-gray-700">
                  Cliente
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  {cliente ? cliente.nome : 'Cliente não encontrado'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PPPoE
                </label>
                <p className="mt-1 text-sm text-gray-500">{event.pppoe || 'Não informado'}</p>
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
                  value={porta}
                  onChange={(e) => setPorta(e.target.value)}
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Acompanhante
                </label>
                <input
                  type="text"
                  value={acompanhante}
                  onChange={(e) => setAcompanhante(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
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
