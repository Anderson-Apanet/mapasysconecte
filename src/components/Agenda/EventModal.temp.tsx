import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { AgendaEvent } from '../../types/agenda';
import { supabase } from '../../lib/supabase';

// Função para buscar o nome do usuário pelo email
const buscarNomeUsuario = async (email: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('nome')
      .eq('email', email)
      .single();
    
    if (error || !data || !data.nome) {
      // Se houver erro ou não encontrar o nome, retorna o email
      return email;
    }
    
    return data.nome;
  } catch (error) {
    console.error('Erro ao buscar nome do usuário:', error);
    // Em caso de erro, retorna o email
    return email;
  }
};

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Partial<AgendaEvent>;
  onEventChange: (event: Partial<AgendaEvent>) => void;
  onSave: () => void;
  users: Array<{ id: number; nome: string }>;
  searchResults: Array<{ id: number; pppoe: string; endereco: string }>;
  isSearching: boolean;
  onSearchPPPoE: (term: string) => void;
  onDelete?: (id: number) => void;
}

export function EventModal({
  isOpen,
  onClose,
  event,
  onEventChange,
  onSave,
  users,
  searchResults,
  isSearching,
  onSearchPPPoE,
  onDelete,
}: EventModalProps) {
  const isEditMode = Boolean(event?.id);
  const [criadorNome, setCriadorNome] = useState<string>('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Buscar o nome do criador quando o evento mudar
  useEffect(() => {
    if (event?.criador) {
      buscarNomeUsuario(event.criador)
        .then(nome => setCriadorNome(nome))
        .catch(error => console.error('Erro ao buscar nome do criador:', error));
    }
  }, [event?.criador]);

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto">
          <Dialog.Panel className="mx-auto max-w-xl w-full rounded bg-white p-6 my-8">
            <Dialog.Title className="text-lg font-medium mb-4">{isEditMode ? 'Editar Evento' : 'Novo Evento'}</Dialog.Title>
            <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tipo de Evento
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={event.tipo_evento || ''}
                    onChange={(e) => {
                      const tipo = e.target.value;
                      onEventChange({ 
                        ...event, 
                        tipo_evento: tipo,
                        pppoe: ['Visita', 'Instalação', 'Retirada'].includes(tipo) ? event.pppoe : ''
                      });
                    }}
                    required
                  >
                    <option value="">Selecione um tipo</option>
                    <option value="Visita">Visita</option>
                    <option value="Instalação">Instalação</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Retirada">Retirada</option>
                    <option value="Viabilidade">Viabilidade</option>
                    <option value="Lembrete">Lembrete</option>
                  </select>
                </div>

                {['Visita', 'Instalação', 'Retirada'].includes(event.tipo_evento || '') && (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Contrato (PPPoE)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={event.pppoe || ''}
                        onChange={(e) => {
                          const pppoe = e.target.value;
                          onEventChange({ 
                            ...event, 
                            pppoe,
                            nome: event.tipo_evento === 'Visita' ? `Visita - ${pppoe}` : event.nome
                          });
                          onSearchPPPoE(pppoe);
                        }}
                        placeholder="Pesquisar por PPPoE..."
                        required
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Campo de endereço somente leitura */}
                    {event.endereco && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Endereço do Contrato
                        </label>
                        <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                          {event.endereco}
                        </div>
                      </div>
                    )}
                    
                    {searchResults.length > 0 && event.pppoe && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                        {searchResults.map((contrato) => (
                          <div
                            key={contrato.id}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                            onClick={() => {
                              const pppoe = contrato.pppoe;
                              onEventChange({ 
                                ...event, 
                                pppoe,
                                endereco: contrato.endereco, // Adiciona o endereço ao evento
                                nome: event.tipo_evento === 'Visita' ? `Visita - ${pppoe}` : event.nome
                              });
                              onSearchPPPoE(''); // Limpa os resultados após selecionar
                            }}
                          >
                            <span className="text-gray-900 dark:text-white">{contrato.pppoe}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome do Evento
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={event.nome || ''}
                    onChange={(e) => onEventChange({ ...event, nome: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Colaboradores Responsáveis
                  </label>
                  <div className="relative mt-1">
                    <select
                      multiple
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={(event.responsaveis || []).map(r => r.id)}
                      onChange={(e) => {
                        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                        const selectedUsers = users
                          .filter(user => selectedIds.includes(user.id.toString()))
                          .map(user => ({ id: user.id.toString(), nome: user.nome }));
                        onEventChange({ ...event, responsaveis: selectedUsers });
                      }}
                      required
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.nome}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      Segure Ctrl (ou Cmd no Mac) para selecionar múltiplos colaboradores
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Data
                    </label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={event.data || ''}
                      onChange={(e) => onEventChange({ ...event, data: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Hora
                    </label>
                    <input
                      type="time"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={event.hora || ''}
                      onChange={(e) => onEventChange({ ...event, hora: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descrição
                  </label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    value={event.descricao || ''}
                    onChange={(e) => onEventChange({ ...event, descricao: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Salvar
                  </button>
                </div>
                
                {/* Botão de exclusão para eventos existentes */}
                {isEditMode && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                      onClick={() => setShowDeleteConfirmation(true)}
                    >
                      Excluir Evento
                    </button>
                  </div>
                )}
                
                {/* Informação do criador do evento */}
                {isEditMode && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {event.criador ? (
                        <>
                          Criado por <span className="font-medium">{criadorNome}</span>
                          {event.data_cad_evento && (
                            <> em <span className="font-medium">
                              {new Date(event.data_cad_evento).toLocaleString('pt-BR')}
                            </span></>
                          )}
                        </>
                      ) : (
                        <>Informações do criador não disponíveis</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Confirmar Exclusão</h3>
            <p className="mb-6">Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                onClick={() => {
                  if (event.id && onDelete) {
                    onDelete(event.id);
                  }
                  setShowDeleteConfirmation(false);
                  onClose();
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
