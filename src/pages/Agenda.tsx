import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  description?: string;
  backgroundColor?: string;
}

function Agenda() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: '',
    description: '',
    allDay: false,
  });

  const handleDateSelect = (selectInfo: any) => {
    setNewEvent({
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      allDay: selectInfo.allDay,
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
    setNewEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      description: clickInfo.event.extendedProps.description,
      allDay: clickInfo.event.allDay,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEvent.title || !newEvent.start) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const eventToSave: Event = {
      id: newEvent.id || Math.random().toString(),
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      allDay: newEvent.allDay,
      description: newEvent.description,
      backgroundColor: newEvent.backgroundColor || '#3788d8',
    };

    if (newEvent.id) {
      // Atualizar evento existente
      setEvents(events.map(event => 
        event.id === newEvent.id ? eventToSave : event
      ));
      toast.success('Evento atualizado com sucesso!');
    } else {
      // Criar novo evento
      setEvents([...events, eventToSave]);
      toast.success('Evento criado com sucesso!');
    }

    setIsModalOpen(false);
    setNewEvent({
      title: '',
      description: '',
      allDay: false,
    });
    setSelectedEvent(null);
  };

  const handleDelete = () => {
    if (newEvent.id) {
      setEvents(events.filter(event => event.id !== newEvent.id));
      toast.success('Evento excluído com sucesso!');
      setIsModalOpen(false);
      setSelectedEvent(null);
    }
  };

  return (
    <div className="h-full bg-sky-50 dark:bg-gray-900 p-4 space-y-4">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Agenda</h1>
          <button
            onClick={() => {
              setNewEvent({
                title: '',
                description: '',
                allDay: false,
                start: new Date().toISOString(),
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            Novo Evento
          </button>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="rounded-xl">
        <div className="calendar-container">
          <style jsx global>{`
            .fc {
              background: transparent !important;
            }
            .fc .fc-view-harness {
              background: transparent !important;
            }
            .fc .fc-toolbar button {
              background-color: #4F46E5 !important;
              border-color: #4F46E5 !important;
            }
            .fc .fc-toolbar button:hover {
              background-color: #4338CA !important;
              border-color: #4338CA !important;
            }
            .fc-theme-standard .fc-scrollgrid {
              border: none !important;
            }
            .fc td, .fc th {
              border-color: rgba(0, 0, 0, 0.1) !important;
            }
            .dark .fc {
              color: #E5E7EB !important;
            }
            .dark .fc-theme-standard td, 
            .dark .fc-theme-standard th {
              border-color: rgba(75, 85, 99, 0.4) !important;
            }
            .dark .fc-theme-standard .fc-scrollgrid {
              border: none !important;
            }
          `}</style>
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
            dayMaxEvents={true}
            weekends={true}
            events={events}
            select={handleDateSelect}
            eventClick={handleEventClick}
            locale={ptBrLocale}
            buttonText={{
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              list: 'Lista'
            }}
            height="auto"
          />
        </div>
      </div>

      {/* Modal de Evento */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-6">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedEvent ? 'Editar Evento' : 'Novo Evento'}
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Título *
                  </label>
                  <input
                    id="event-title"
                    name="title"
                    type="text"
                    value={newEvent.title || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descrição
                  </label>
                  <textarea
                    id="event-description"
                    name="description"
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="event-allday"
                    name="allDay"
                    type="checkbox"
                    checked={newEvent.allDay || false}
                    onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label htmlFor="event-allday" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Dia inteiro
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  {selectedEvent && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                    >
                      Excluir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                  >
                    {selectedEvent ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default Agenda;
