import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { EventModal } from '../components/Agenda/EventModal';
import { MoreEventsPopover } from '../components/Agenda/MoreEventsPopover';
import { AgendaEvent } from '../types/agenda';
import { fetchEvents, saveEvent, searchContratos, fetchUsers, transformEvents, updateEventDates } from '../services/agenda';
import { debounce } from '../utils/date';

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
      const { data: event, error } = await fetchEvents(eventId);

      if (error) throw error;

      if (event) {
        setSelectedEvent(event);
        setNewEvent(event);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      toast.error('Erro ao carregar evento');
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

      await saveEvent(newEvent, selectedEvent);
      
      toast.success(selectedEvent ? 'Evento atualizado!' : 'Evento criado!');
      setIsModalOpen(false);
      const updatedEvents = await fetchEvents(new Date(), new Date());
      setEvents(updatedEvents);
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

  const handleSearchPPPoE = async (searchTerm: string) => {
    setIsSearching(true);
    try {
      const results = await searchContratos(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast.error('Erro ao buscar contratos');
    } finally {
      setIsSearching(false);
    }
  };

  const handleEventDrop = async (dropInfo: any) => {
    try {
      const eventId = parseInt(dropInfo.event.id);
      const start = dropInfo.event.start.toISOString();
      const end = dropInfo.event.end?.toISOString() || start;

      await updateEventDates(eventId, start, end);
      toast.success('Evento atualizado com sucesso!');
      
      // Atualizar a lista de eventos
      const dateInfo = dropInfo.view.getCurrentData().dateProfile;
      const updatedEvents = await fetchEvents(dateInfo.activeRange.start, dateInfo.activeRange.end);
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      toast.error('Erro ao atualizar evento');
      dropInfo.revert();
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        toast.error('Erro ao carregar usuários');
      }
    };
    loadUsers();
  }, []);

  const debouncedSearch = React.useCallback(
    debounce(handleSearchPPPoE, 300),
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
              eventDrop={handleEventDrop}
              locale={ptBrLocale}
            />
          </div>

          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            event={newEvent}
            onEventChange={setNewEvent}
            onSave={handleSaveEvent}
            users={users}
            searchResults={searchResults}
            isSearching={isSearching}
            onSearchPPPoE={debouncedSearch}
          />

          <MoreEventsPopover
            selectedMoreEvents={selectedMoreEvents}
            onClose={() => setSelectedMoreEvents(null)}
          />
        </div>
      </div>
    </Layout>
  );
}
