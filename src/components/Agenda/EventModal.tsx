import React from 'react';
import { Dialog } from '@headlessui/react';
import { AgendaEvent } from '../../types/agenda';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Partial<AgendaEvent>;
  onEventChange: (event: Partial<AgendaEvent>) => void;
  onSave: () => void;
  users: Array<{ id: number; nome: string }>;
  searchResults: Array<{ id: number; pppoe: string }>;
  isSearching: boolean;
  onSearchPPPoE: (term: string) => void;
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
}: EventModalProps) {
  const isEditMode = Boolean(event?.id);
  const modalTitle = isEditMode ? 'Editar Evento' : 'Novo Evento';

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl w-full rounded bg-white p-6">
          <Dialog.Title className="text-lg font-medium mb-4">{modalTitle}</Dialog.Title>
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
                        onEventChange({ ...event, pppoe: e.target.value });
                        onSearchPPPoE(e.target.value);
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
                  
                  {searchResults.length > 0 && event.pppoe && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchResults.map((contrato) => (
                        <div
                          key={contrato.id}
                          className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                          onClick={() => {
                            onEventChange({ ...event, pppoe: contrato.pppoe });
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
                  Colaborador Responsável
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={event.usuario_resp || ''}
                  onChange={(e) => onEventChange({ ...event, usuario_resp: e.target.value })}
                  required
                >
                  <option value="">Selecione um colaborador</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.nome}>
                      {user.nome}
                    </option>
                  ))}
                </select>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data/Hora Início
                  </label>
                  <input
                    type="datetime-local"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={event.datainicio || ''}
                    onChange={(e) => onEventChange({ ...event, datainicio: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data/Hora Fim
                  </label>
                  <input
                    type="datetime-local"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={event.datafinal || ''}
                    onChange={(e) => onEventChange({ ...event, datafinal: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cor
                </label>
                <input
                  type="color"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={event.cor || '#3788d8'}
                  onChange={(e) => onEventChange({ ...event, cor: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      checked={event.horamarcada || false}
                      onChange={(e) => onEventChange({ ...event, horamarcada: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Hora Marcada</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      checked={event.prioritario || false}
                      onChange={(e) => onEventChange({ ...event, prioritario: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Prioritário</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      checked={event.realizada || false}
                      onChange={(e) => onEventChange({ ...event, realizada: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Realizada</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
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
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
