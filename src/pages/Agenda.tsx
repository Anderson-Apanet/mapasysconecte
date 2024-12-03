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

interface AgendaEvent {
  id: number;
  nome: string;
  descricao: string;
  datainicio: string;
  datafinal: string;
  nome_cliente: string;
  pppoe: string;
  tipo_evento: string;
  tipo_instalacao: string;
  txinstalacao: string;
  usuario_resp: string;
  horamarcada: boolean;
  prioritario: boolean;
  privado: boolean;
  realizada: boolean;
  parcial: boolean;
  cancelado: boolean;
  data_finalizacao: string;
  creation_date: string;
  unique_id: string;
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
    privado: false,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      console.log('Iniciando busca de eventos...');
      const response = await fetch('http://localhost:3001/api/agenda');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha ao carregar eventos');
      }
      const data = await response.json();
      console.log('Eventos carregados:', data.length);
      console.log('Exemplo de evento:', data[0]);
      setEvents(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar eventos';
      toast.error(message);
      console.error('Erro detalhado:', error);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    setNewEvent({
      datainicio: selectInfo.startStr,
      datafinal: selectInfo.endStr,
      horamarcada: !selectInfo.allDay,
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const event = events.find(e => e.id === parseInt(clickInfo.event.id));
    if (event) {
      setSelectedEvent(event);
      setNewEvent(event);
      setIsModalOpen(true);
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
      fetchEvents();
      setNewEvent({
        nome: '',
        descricao: '',
        horamarcada: false,
        prioritario: false,
        privado: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar evento';
      toast.error(message);
      console.error('Erro:', error);
    }
  };

  return (
    <div className="p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        initialView='dayGridMonth'
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={events}
        locale={ptBrLocale}
        height="85vh"
        eventDisplay="block"
        eventClassNames="rounded-md"
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        allDaySlot={false}
        slotDuration="00:30:00"
        eventMinHeight={24}
        eventMaxStack={4}
        eventBackgroundColor="transparent"
        eventBorderColor="transparent"
        dayCellClassNames="dark:bg-gray-800"
        dayHeaderClassNames="dark:bg-gray-800 dark:text-gray-200"
        slotLabelClassNames="dark:text-gray-300"
        viewClassNames="dark:bg-gray-900"
        allDayClassNames="dark:bg-gray-800 dark:text-gray-200"
        moreLinkClassNames="dark:text-blue-400 dark:hover:text-blue-300"
        nowIndicatorClassNames="dark:border-red-500"
        slotLaneClassNames="dark:border-gray-700"
        dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
        buttonText={{
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia',
          list: 'Lista'
        }}
        buttonClassNames="dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        titleFormat={{ year: 'numeric', month: 'long' }}
        events={events.map(event => ({
          id: event.id.toString(),
          title: event.nome,
          start: event.datainicio,
          end: event.datafinal,
          backgroundColor: event.cancelado ? '#dc2626' : 
                         event.realizada ? '#15803d' :   
                         event.prioritario ? '#d97706' : 
                         '#2563eb',                      
          textColor: '#ffffff', 
          borderColor: event.cancelado ? '#b91c1c' : 
                      event.realizada ? '#166534' :
                      event.prioritario ? '#b45309' :
                      '#1d4ed8',
          display: event.horamarcada ? 'block' : 'list-item',
          extendedProps: {
            description: event.descricao,
            cliente: event.nome_cliente,
            pppoe: event.pppoe,
            tipo: event.tipo_evento,
            status: event.realizada ? 'Realizada' : event.cancelado ? 'Cancelada' : event.parcial ? 'Parcial' : 'Pendente'
          }
        }))}
        eventContent={(eventInfo) => {
          const isCompactView = eventInfo.view.type === 'dayGridMonth' || 
                              (!eventInfo.event.extendedProps.horamarcada && eventInfo.view.type !== 'listWeek');
          
          const tooltipId = `event-tooltip-${eventInfo.event.id}`;
          
          return (
            <>
              <div 
                className={`${isCompactView ? 'p-1' : 'p-2'} h-full`}
                data-tooltip-id={tooltipId}
              >
                <div className="font-semibold text-white line-clamp-2">{eventInfo.event.title}</div>
                {!isCompactView && (
                  <>
                    <div className="text-sm text-white/90 line-clamp-1 mt-1">
                      <span className="font-medium">Cliente:</span> {eventInfo.event.extendedProps.cliente}
                    </div>
                    {eventInfo.event.extendedProps.pppoe && (
                      <div className="text-sm text-white/90 line-clamp-1">
                        <span className="font-medium">PPPoE:</span> {eventInfo.event.extendedProps.pppoe}
                      </div>
                    )}
                    <div className="text-xs text-white/80 line-clamp-1 mt-1">
                      <span className="font-medium">Tipo:</span> {eventInfo.event.extendedProps.tipo}
                    </div>
                    <div className="text-xs mt-2">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        eventInfo.event.extendedProps.status === 'Realizada' ? 'bg-green-900 text-green-100' :
                        eventInfo.event.extendedProps.status === 'Cancelada' ? 'bg-red-900 text-red-100' :
                        eventInfo.event.extendedProps.status === 'Parcial' ? 'bg-yellow-900 text-yellow-100' :
                        'bg-blue-900 text-blue-100'
                      }`}>
                        {eventInfo.event.extendedProps.status}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <Tooltip 
                id={tooltipId}
                place="top"
                className="max-w-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg rounded-lg !opacity-100"
              >
                <div className="p-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{eventInfo.event.title}</div>
                  <div className="mt-1 text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Cliente:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{eventInfo.event.extendedProps.cliente}</span>
                  </div>
                  {eventInfo.event.extendedProps.pppoe && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">PPPoE:</span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{eventInfo.event.extendedProps.pppoe}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Tipo:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{eventInfo.event.extendedProps.tipo}</span>
                  </div>
                  {eventInfo.event.extendedProps.description && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Descrição:</span>
                      <div className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {eventInfo.event.extendedProps.description}
                      </div>
                    </div>
                  )}
                  <div className="mt-2">
                    <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${
                      eventInfo.event.extendedProps.status === 'Realizada' ? 'bg-green-100 text-green-800' :
                      eventInfo.event.extendedProps.status === 'Cancelada' ? 'bg-red-100 text-red-800' :
                      eventInfo.event.extendedProps.status === 'Parcial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {eventInfo.event.extendedProps.status}
                    </span>
                  </div>
                </div>
              </Tooltip>
            </>
          );
        }}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      {selectedEvent ? 'Editar Evento' : 'Novo Evento'}
                    </h3>
                    <div className="mt-4">
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveEvent(); }}>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Nome</label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={newEvent.nome || ''}
                              onChange={(e) => setNewEvent({ ...newEvent, nome: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Cliente</label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={newEvent.nome_cliente || ''}
                              onChange={(e) => setNewEvent({ ...newEvent, nome_cliente: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">PPPoE</label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={newEvent.pppoe || ''}
                              onChange={(e) => setNewEvent({ ...newEvent, pppoe: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Descrição</label>
                            <textarea
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={newEvent.descricao || ''}
                              onChange={(e) => setNewEvent({ ...newEvent, descricao: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Evento</label>
                            <select
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={newEvent.tipo_evento || 'Padrão'}
                              onChange={(e) => setNewEvent({ ...newEvent, tipo_evento: e.target.value })}
                            >
                              <option value="Padrão">Padrão</option>
                              <option value="Instalação">Instalação</option>
                              <option value="Manutenção">Manutenção</option>
                              <option value="Visita Técnica">Visita Técnica</option>
                              <option value="Reunião">Reunião</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Responsável</label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={newEvent.usuario_resp || ''}
                              onChange={(e) => setNewEvent({ ...newEvent, usuario_resp: e.target.value })}
                            />
                          </div>

                          <div className="flex space-x-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                checked={newEvent.prioritario || false}
                                onChange={(e) => setNewEvent({ ...newEvent, prioritario: e.target.checked })}
                              />
                              <span className="ml-2 text-sm text-gray-700">Prioritário</span>
                            </label>

                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                checked={newEvent.privado || false}
                                onChange={(e) => setNewEvent({ ...newEvent, privado: e.target.checked })}
                              />
                              <span className="ml-2 text-sm text-gray-700">Privado</span>
                            </label>
                          </div>

                          <div className="flex space-x-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                checked={newEvent.realizada || false}
                                onChange={(e) => setNewEvent({ ...newEvent, realizada: e.target.checked })}
                              />
                              <span className="ml-2 text-sm text-gray-700">Realizada</span>
                            </label>

                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                checked={newEvent.parcial || false}
                                onChange={(e) => setNewEvent({ ...newEvent, parcial: e.target.checked })}
                              />
                              <span className="ml-2 text-sm text-gray-700">Parcial</span>
                            </label>

                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                checked={newEvent.cancelado || false}
                                onChange={(e) => setNewEvent({ ...newEvent, cancelado: e.target.checked })}
                              />
                              <span className="ml-2 text-sm text-gray-700">Cancelado</span>
                            </label>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            type="button"
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
