import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import Layout from '../components/Layout';
import { supabase } from '../utils/supabaseClient';

interface AgendaEvent {
  id: number;
  nome: string;
  descricao: string;
  datainicio: string;
  datafinal: string;
  cor: string;
  tipo_evento: string;
  usuario_resp: string;
  horamarcada: boolean;
  prioritario: boolean;
  realizada: boolean;
  parcial: boolean;
  cancelado: boolean;
  pppoe: string;
  data_cad_evento: string;
  criador: string;
}

export default function Agenda() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<AgendaEvent>>({
    nome: '',
    descricao: '',
    horamarcada: false,
    prioritario: false,
    cor: '#3788d8'
  });
  const [selectedMoreEvents, setSelectedMoreEvents] = useState<{
    events: any[];
    position: { top: number; left: number };
  } | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ id: number; pppoe: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; nome: string }>>([]);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const fetchEvents = async (start: Date, end: Date) => {
    try {
      console.log('Buscando eventos para o período:', { start, end });
      
      const { data, error } = await supabase
        .from('agenda')
        .select('*')
        .gte('datainicio', start.toISOString())
        .lte('datafinal', end.toISOString())
        .order('datainicio', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
        throw error;
      }

      // Log para debug - verificar tipos de eventos retornados
      const tiposDeEventos = [...new Set(data?.map(event => event.tipo_evento))];
      console.log('Tipos de eventos encontrados:', tiposDeEventos);
      console.log('Total de eventos por tipo:', data?.reduce((acc, event) => {
        acc[event.tipo_evento] = (acc[event.tipo_evento] || 0) + 1;
        return acc;
      }, {}));

      return data || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar eventos';
      toast.error(message);
      console.error('Erro ao carregar eventos:', error);
      return [];
    }
  };

  const transformEvents = (events: AgendaEvent[]) => {
    console.log('Transformando eventos - Total:', events.length);
    return events.map(event => {
      try {
        const startDate = new Date(event.datainicio);
        const endDate = new Date(event.datafinal);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.log('Data inválida para o evento:', event);
          return null;
        }

        // Define a cor de fundo com base no status e na cor do evento
        const isRealizada = event.realizada === true;
        const eventColor = isRealizada ? '#E2E8F0' : event.cor;
        const textColor = isRealizada ? '#1F2937' : '#ffffff';

        return {
          id: event.id.toString(),
          title: `[${event.tipo_evento}] ${event.nome || 'Sem título'}`,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          backgroundColor: eventColor,
          borderColor: eventColor,
          textColor: textColor,
          allDay: !event.horamarcada,
          extendedProps: {
            descricao: event.descricao,
            tipo_evento: event.tipo_evento,
            usuario_resp: event.usuario_resp,
            horamarcada: event.horamarcada,
            prioritario: event.prioritario,
            realizada: event.realizada,
            parcial: event.parcial,
            cancelado: event.cancelado,
            pppoe: event.pppoe
          }
        };
      } catch (error) {
        console.error('Erro ao transformar evento:', event, error);
        return null;
      }
    }).filter(event => event !== null);
  };

  const handleDateSelect = (selectInfo: any) => {
    setNewEvent({
      datainicio: selectInfo.startStr,
      datafinal: selectInfo.endStr,
      horamarcada: !selectInfo.allDay,
    });
    setIsModalOpen(true);
  };

  const handleEventClick = async (info: any) => {
    const eventId = parseInt(info.event.id);
    try {
      const { data: event, error } = await supabase
        .from('agenda')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (event) {
        console.log('Evento original:', event);
        console.log('Usuario responsável:', event.usuario_resp);
        
        const formattedEvent = {
          id: event.id,
          nome: event.nome || '',
          descricao: event.descricao || '',
          datainicio: formatDateTimeLocal(event.datainicio),
          datafinal: formatDateTimeLocal(event.datafinal),
          tipo_evento: event.tipo_evento || '',
          usuario_resp: event.usuario_resp || '',
          horamarcada: event.horamarcada || false,
          prioritario: event.prioritario || false,
          realizada: event.realizada || false,
          parcial: event.parcial || false,
          cancelado: event.cancelado || false,
          cor: event.cor || '#3788d8',
          pppoe: event.pppoe || ''
        };
        
        console.log('Evento formatado para edição:', formattedEvent);
        setNewEvent(formattedEvent);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
    }
  };

  const handleSaveEvent = async () => {
    try {
      if (!newEvent.nome?.trim()) {
        toast.error('O nome do evento é obrigatório');
        return;
      }

      if (!newEvent.datainicio || !newEvent.datafinal) {
        toast.error('Data inicial e final são obrigatórias');
        return;
      }

      const eventData = {
        ...newEvent,
        creation_date: new Date().toISOString(),
        tipo_evento: newEvent.tipo_evento || 'Padrão',
        usuario_resp: newEvent.usuario_resp || 'Sistema',
        realizada: newEvent.realizada || false,
        parcial: newEvent.parcial || false,
        cancelado: newEvent.cancelado || false
      };

      const url = selectedEvent 
        ? `http://localhost:3001/api/agenda/${selectedEvent.id}`
        : 'http://localhost:3001/api/agenda';
      
      const method = selectedEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha ao salvar evento');
      }

      toast.success(selectedEvent ? 'Evento atualizado!' : 'Evento criado!');
      setIsModalOpen(false);
      fetchEvents(new Date(), new Date());
      setNewEvent({
        nome: '',
        descricao: '',
        horamarcada: false,
        prioritario: false,
        cor: '#3788d8'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar evento';
      toast.error(message);
      console.error('Erro:', error);
    }
  };

  const handleMoreEventsClick = (info: { date: Date; events: any[]; el: HTMLElement }) => {
    const rect = info.el.getBoundingClientRect();
    setSelectedMoreEvents({
      events: info.events,
      position: {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      }
    });
  };

  const MoreEventsPopover = () => {
    if (!selectedMoreEvents) return null;

    return (
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 p-2 min-w-[300px] max-h-[400px] overflow-y-auto"
        style={{
          top: selectedMoreEvents.position.top + 'px',
          left: selectedMoreEvents.position.left + 'px'
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Eventos Adicionais</h3>
          <button
            onClick={() => setSelectedMoreEvents(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {selectedMoreEvents.events.map((event: any) => (
            <div
              key={event.id}
              className="p-2 rounded"
              style={{
                backgroundColor: event.backgroundColor || '#3788d8',
                color: event.textColor || '#ffffff'
              }}
            >
              <div className="font-semibold">{event.title}</div>
              <div className="text-sm">
                {new Date(event.start).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {' - '}
                {new Date(event.end).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {event.extendedProps?.descricao && (
                <div className="text-sm mt-1 opacity-90">
                  {event.extendedProps.descricao}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const searchContratos = async (searchTerm: string) => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('id, pppoe')
        .ilike('pppoe', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast.error('Erro ao buscar contratos');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id_user, nome')
        .order('nome');

      if (error) {
        console.error('Erro Supabase:', error);
        throw error;
      }
      
      console.log('Usuários carregados:', data);
      setUsers(data?.map(user => ({
        id: user.id_user,
        nome: user.nome || ''
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedSearch = React.useCallback(
    debounce((searchTerm: string) => searchContratos(searchTerm), 300),
    []
  );

  return (
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="h-full" onClick={() => selectedMoreEvents && setSelectedMoreEvents(null)}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              initialView="dayGridMonth"
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={3}
              weekends={true}
              slotMinTime="07:00:00"
              slotMaxTime="19:00:00"
              allDaySlot={false}
              slotDuration="00:30:00"
              eventMinHeight={24}
              eventDisplay="block"
              eventOrder="start"
              moreLinkContent={({ num }) => `Ver mais (${num})`}
              moreLinkClick={handleMoreEventsClick}
              slotEventOverlap={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
              eventClassNames={(arg) => {
                const classes = [];
                if (arg.view.type === 'listWeek') {
                  classes.push(`list-event-${arg.event.id}`);
                }
                if (arg.view.type === 'timeGridDay' || arg.view.type === 'timeGridWeek') {
                  classes.push('time-grid-event');
                }
                return classes;
              }}
              eventContent={(eventInfo) => {
                const viewType = eventInfo.view.type;
                
                if (viewType === 'timeGridDay' || viewType === 'timeGridWeek') {
                  return (
                    <div className="event-content p-1 h-full">
                      <div className="font-semibold text-xs">
                        {eventInfo.timeText && (
                          <span className="mr-1">{eventInfo.timeText}</span>
                        )}
                        {eventInfo.event.title}
                        {eventInfo.event.extendedProps.prioritario && (
                          <span className="ml-1 text-yellow-300">⚡</span>
                        )}
                      </div>
                      {eventInfo.event.extendedProps.descricao && (
                        <div className="text-xs opacity-90 truncate">
                          {eventInfo.event.extendedProps.descricao}
                        </div>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="fc-content p-1">
                    <div className="fc-title font-semibold">
                      {eventInfo.event.title}
                      {eventInfo.event.extendedProps.prioritario && (
                        <span className="ml-1 text-red-500">⚡</span>
                      )}
                    </div>
                    {eventInfo.event.extendedProps.descricao && (
                      <div className="fc-description text-sm truncate">
                        {eventInfo.event.extendedProps.descricao}
                      </div>
                    )}
                  </div>
                );
              }}
              datesSet={async (dateInfo) => {
                console.log('Período do calendário alterado:', dateInfo);
                const events = await fetchEvents(dateInfo.start, dateInfo.end);
                setEvents(events);
              }}
              events={(info, successCallback, failureCallback) => {
                try {
                  const transformedEvents = transformEvents(events);
                  const viewType = info?.view?.type || 'dayGridMonth';

                  const filteredEvents = transformedEvents.filter(event => {
                    if (!event) return false;
                    
                    if (viewType === 'listWeek') {
                      return true;
                    }
                    
                    return event.extendedProps.realizada !== true;
                  });

                  filteredEvents.sort((a, b) => {
                    if (!a || !b) return 0;
                    return new Date(a.start).getTime() - new Date(b.start).getTime();
                  });

                  successCallback(filteredEvents);
                } catch (error) {
                  console.error('Erro ao transformar eventos:', error);
                  failureCallback(error);
                }
              }}
              select={handleDateSelect}
              eventClick={handleEventClick}
              locale={ptBrLocale}
            />
            <MoreEventsPopover />
          </div>

          {isModalOpen && (
            <Dialog
              open={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              className="fixed inset-0 z-50 overflow-y-auto"
            >
              <div className="flex items-center justify-center min-h-screen">
                <Dialog.Overlay className="fixed inset-0 bg-black/30 dark:bg-black/50" />

                <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 p-6 shadow-xl">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedEvent ? 'Editar Evento' : 'Novo Evento'}
                    </h3>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSaveEvent(); }}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tipo de Evento
                        </label>
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={newEvent.tipo_evento || ''}
                          onChange={(e) => {
                            const tipo = e.target.value;
                            setNewEvent({ 
                              ...newEvent, 
                              tipo_evento: tipo,
                              // Limpar o PPPoE se o tipo não requer contrato
                              pppoe: ['Visita', 'Instalação', 'Retirada'].includes(tipo) ? newEvent.pppoe : ''
                            });
                            // Limpar resultados da pesquisa se mudar para um tipo que não usa PPPoE
                            if (!['Visita', 'Instalação', 'Retirada'].includes(tipo)) {
                              setSearchResults([]);
                            }
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
                          value={newEvent.nome || ''}
                          onChange={(e) => setNewEvent({ ...newEvent, nome: e.target.value })}
                          required
                        />
                      </div>

                      {/* Campo PPPoE condicional */}
                      {['Visita', 'Instalação', 'Retirada'].includes(newEvent.tipo_evento || '') && (
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Contrato (PPPoE)
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={newEvent.pppoe || ''}
                              onChange={(e) => {
                                setNewEvent({ ...newEvent, pppoe: e.target.value });
                                debouncedSearch(e.target.value);
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
                          
                          {/* Dropdown de resultados */}
                          {searchResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                              {searchResults.map((contrato) => (
                                <div
                                  key={contrato.id}
                                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                                  onClick={() => {
                                    setNewEvent({ ...newEvent, pppoe: contrato.pppoe });
                                    setSearchResults([]);
                                  }}
                                >
                                  <span className="text-gray-900 dark:text-white">{contrato.pppoe}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {newEvent.tipo_evento !== 'Lembrete' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Colaborador Responsável
                          </label>
                          <select
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={newEvent.usuario_resp || ''}
                            onChange={(e) => {
                              setNewEvent(prev => ({
                                ...prev,
                                usuario_resp: e.target.value
                              }));
                            }}
                            required
                          >
                            <option value="">Selecione um colaborador</option>
                            {users.map((user) => (
                              <option 
                                key={user.id} 
                                value={user.nome}
                              >
                                {user.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Descrição
                        </label>
                        <textarea
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          rows={3}
                          value={newEvent.descricao || ''}
                          onChange={(e) => setNewEvent({ ...newEvent, descricao: e.target.value })}
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
                            value={newEvent.datainicio || ''}
                            onChange={(e) => setNewEvent({ ...newEvent, datainicio: e.target.value })}
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
                            value={newEvent.datafinal || ''}
                            onChange={(e) => setNewEvent({ ...newEvent, datafinal: e.target.value })}
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
                          value={newEvent.cor || '#3788d8'}
                          onChange={(e) => setNewEvent({ ...newEvent, cor: e.target.value })}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              checked={newEvent.horamarcada || false}
                              onChange={(e) => setNewEvent({ ...newEvent, horamarcada: e.target.checked })}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Hora Marcada</span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              checked={newEvent.prioritario || false}
                              onChange={(e) => setNewEvent({ ...newEvent, prioritario: e.target.checked })}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Prioritário</span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              checked={newEvent.realizada || false}
                              onChange={(e) => setNewEvent({ ...newEvent, realizada: e.target.checked })}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Realizada</span>
                          </label>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                          onClick={() => setIsModalOpen(false)}
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
                </div>
              </div>
            </Dialog>
          )}
        </div>
      </div>
    </Layout>
  );
}

function formatDateTimeLocal(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}
