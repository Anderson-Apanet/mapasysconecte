import React, { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { EventModal } from '../components/Agenda/EventModal';
import { AgendaEvent } from '../types/agenda';
import { fetchEvents, saveEvent, searchContratos, fetchUsers, transformEvents, updateEventDates, updateContratoStatus } from '../services/agenda';
import { debounce } from 'lodash';

export default function Agenda() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<AgendaEvent>>({
    nome: '',
    descricao: '',
    horamarcada: true,
    prioritario: false,
    cor: '#3788d8',
    responsaveis: []
  });
  const [searchResults, setSearchResults] = useState<Array<{ id: number; pppoe: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; nome: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [currentViewType, setCurrentViewType] = useState<string>('dayGridMonth');
  const [selectedMoreEvents, setSelectedMoreEvents] = useState<{
    events: any[];
    position: {
      top: number;
      left: number;
    }
  } | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const lastFetchRef = useRef<{ start: string, end: string } | null>(null);

  const loadEvents = useCallback(async (info, successCallback, failureCallback) => {
    // Verifica se já estamos carregando eventos
    if (isLoadingEvents) {
      console.log('Já existe um carregamento de eventos em andamento. Ignorando nova requisição.');
      return;
    }

    // Vamos sempre carregar novos eventos, independente da última faixa carregada
    // para garantir que todos os eventos sejam exibidos
    
    setIsLoadingEvents(true);
    setLoading(true);
    
    try {
      console.log('Carregando eventos para o período:', info.startStr, 'até', info.endStr);
      
      // Buscar eventos apenas para o período visualizado
      const events = await fetchEvents(info.startStr, info.endStr);
      
      // Transformar eventos para o formato do FullCalendar
      const transformedEvents = await transformEvents(events);
      
      console.log('Eventos carregados com sucesso:', transformedEvents.length);
      
      // Armazena a faixa de datas que acabamos de carregar
      lastFetchRef.current = { start: info.startStr, end: info.endStr };
      
      if (successCallback) {
        successCallback(transformedEvents);
      } else {
        setEvents(transformedEvents);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      if (failureCallback) {
        failureCallback(error);
      }
      // Corrigindo o erro de renderização do toast
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
      setIsLoadingEvents(false);
    }
  }, []);

  const handleDateSelect = (selectInfo: any) => {
    const startDate = new Date(selectInfo.startStr);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // Adiciona 1 hora à data inicial

    setSelectedEvent(null);
    setNewEvent({
      nome: '',
      descricao: '',
      datainicio: startDate.toISOString().slice(0, 16),
      datafinal: endDate.toISOString().slice(0, 16),
      horamarcada: true,
      prioritario: false,
      cor: '#3788d8',
      responsaveis: []
    });
    setIsModalOpen(true);
  };

  const handleEventClick = async (info: any) => {
    const eventId = parseInt(info.event.id);
    console.log('Clicou no evento:', eventId);
    
    try {
      const event = await fetchEvents(eventId);
      console.log('Evento carregado:', event);

      if (event) {
        const eventData = {
          id: event.id,
          nome: event.nome,
          descricao: event.descricao,
          datainicio: event.datainicio,
          datafinal: event.datafinal,
          tipo_evento: event.tipo_evento,
          responsaveis: event.responsaveis || [],
          horamarcada: event.horamarcada,
          prioritario: event.prioritario,
          realizada: event.realizada,
          parcial: event.parcial,
          cancelado: event.cancelado,
          pppoe: event.pppoe,
          cor: event.cor
        };

        console.log('Dados do evento formatados:', eventData);
        setSelectedEvent(eventData);
        setNewEvent(eventData);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      toast.error('Erro ao carregar evento');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setNewEvent({
      nome: '',
      descricao: '',
      horamarcada: true,
      prioritario: false,
      cor: '#3788d8',
      responsaveis: []
    });
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

      // Sempre define horamarcada como true
      const eventToSave = {
        ...newEvent,
        horamarcada: true
      };

      const savedEvent = await saveEvent(eventToSave, selectedEvent);
      
      // Se for uma instalação, atualiza o status do contrato
      if (eventToSave.tipo_evento === 'Instalação' && eventToSave.pppoe) {
        await updateContratoStatus(eventToSave.pppoe, 'Agendado');
      }
      
      toast.success(selectedEvent ? 'Evento atualizado!' : 'Evento criado!');
      setIsModalOpen(false);
      
      // Atualiza o calendário com o novo evento
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        const dateRange = calendarApi.view.getCurrentData().dateProfile.activeRange;
        await loadEvents(calendarApi.view.getCurrentData(), (events) => setEvents(events), (error) => console.error(error));
      }

      setSelectedEvent(null);
      setNewEvent({
        nome: '',
        descricao: '',
        horamarcada: true,
        prioritario: false,
        cor: '#3788d8',
        responsaveis: []
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar evento';
      toast.error(message);
      console.error('Erro:', error);
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
      await loadEvents(dropInfo.view.getCurrentData(), (events) => setEvents(events), (error) => console.error(error));
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      toast.error('Erro ao atualizar evento');
      dropInfo.revert();
    }
  };

  const handleMoreEventsClick = (info: any) => {
    console.log('Clique em Ver mais:', info);
    
    // Verificar se info.el existe antes de tentar acessar getBoundingClientRect
    if (!info || !info.el) {
      console.error('Elemento não encontrado para posicionar o popover');
      return 'popover'; // Retorna popover para usar o comportamento padrão
    }
    
    try {
      const rect = info.el.getBoundingClientRect();
      setSelectedMoreEvents({
        events: info.events || [],
        position: {
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX
        }
      });
    } catch (error) {
      console.error('Erro ao posicionar popover:', error);
    }
    
    return 'popover';
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

  // Usar debounce para evitar múltiplas chamadas em rápida sucessão
  const debouncedLoadEvents = useCallback(
    debounce((dateInfo) => {
      loadEvents(dateInfo, (events) => setEvents(events), (error) => console.error(error));
    }, 300),
    [loadEvents]
  );

  const handleDatesSet = (dateInfo: any) => {
    console.log('Período visualizado:', dateInfo.startStr, 'até', dateInfo.endStr);
    console.log('Tipo de visualização atual:', dateInfo.view.type);
    setCurrentViewType(dateInfo.view.type);
    debouncedLoadEvents(dateInfo);
  };

  // Debounce para a busca de PPPoE
  const debouncedSearch = useCallback(
    debounce(handleSearchPPPoE, 300),
    [handleSearchPPPoE]
  );

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

  const filterEvents = (events: any[]) => {
    // Se a visualização for mensal, oculta eventos realizados
    if (currentViewType === 'dayGridMonth') {
      console.log('Filtrando eventos realizados na visualização mensal');
      console.log('Total de eventos antes do filtro:', events.length);
      
      // Filtra os eventos onde extendedProps.realizada é true
      const filteredEvents = events.filter(event => {
        // Verifica se o evento tem extendedProps e se realizada não é true
        return !event.extendedProps || event.extendedProps.realizada !== true;
      });
      
      console.log('Total de eventos após o filtro:', filteredEvents.length);
      return filteredEvents;
    }
    // Para outras visualizações, mostra todos os eventos
    return events;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="h-full">
            <FullCalendar
              ref={calendarRef}
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
              allDaySlot={true}
              allDayText="Dia inteiro"
              slotDuration="00:30:00"
              eventMinHeight={24}
              displayEventTime={true}
              displayEventEnd={true}
              eventDisplay="block"
              eventOrder="start,-allDay"
              events={filterEvents(events)}
              datesSet={handleDatesSet}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              moreLinkContent={({ num }) => `Ver mais (${num})`}
              moreLinkClick="popover"
              slotEventOverlap={false}
              locale={ptBrLocale}
              nowIndicator={true}
              scrollTime="07:00:00"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                meridiem: false
              }}
              views={{
                timeGridWeek: {
                  titleFormat: { year: 'numeric', month: 'long', day: '2-digit' },
                  slotLabelFormat: {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  },
                  dayHeaderFormat: { weekday: 'long', day: '2-digit' }
                },
                timeGridDay: {
                  titleFormat: { year: 'numeric', month: 'long', day: '2-digit' },
                  slotLabelFormat: {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  },
                  dayHeaderFormat: { weekday: 'long', day: '2-digit' },
                  nowIndicator: true,
                  scrollTime: '07:00:00'
                }
              }}
              eventContent={(eventInfo) => {
                const viewType = eventInfo.view.type;
                const event = eventInfo.event;
                const extendedProps = event.extendedProps;
                const isRealizada = extendedProps.realizada === true;
                const isCancelado = extendedProps.cancelado === true;
                const isParcial = extendedProps.parcial === true;
                const isPrioritario = extendedProps.prioritario === true;
                const isAllDay = event.allDay;

                // Log para debug
                if (viewType === 'timeGridDay') {
                  console.log('Evento na visualização diária:', {
                    id: event.id,
                    title: event.title,
                    start: event.start,
                    end: event.end,
                    allDay: event.allDay,
                    horamarcada: extendedProps.horamarcada
                  });
                }

                let statusClass = '';
                if (isRealizada) statusClass = 'bg-gray-200 text-gray-800';
                else if (isCancelado) statusClass = 'bg-red-100 text-red-800';
                else if (isParcial) statusClass = 'bg-yellow-100 text-yellow-800';
                else if (isPrioritario) statusClass = 'bg-orange-100 text-orange-800';

                const timeText = !isAllDay && eventInfo.timeText 
                  ? eventInfo.timeText 
                  : '';

                const commonContent = (
                  <>
                    <div className="font-semibold text-sm">
                      {event.title}
                    </div>
                    {timeText && (
                      <div className="text-xs opacity-75">
                        {timeText}
                      </div>
                    )}
                    {extendedProps.descricao && (
                      <div className="text-xs mt-1 opacity-75 line-clamp-2">
                        {extendedProps.descricao}
                      </div>
                    )}
                    {extendedProps.usuario_resp && (
                      <div className="text-xs mt-1 opacity-75">
                        Resp: {extendedProps.usuario_resp}
                      </div>
                    )}
                  </>
                );

                if (viewType === 'timeGridWeek' || viewType === 'timeGridDay') {
                  return (
                    <div className={`h-full w-full ${statusClass}`}>
                      <div className="p-1">
                        {commonContent}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className={`p-1 ${statusClass}`}>
                    {commonContent}
                  </div>
                );
              }}
            />
          </div>

          <EventModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            event={newEvent}
            onEventChange={setNewEvent}
            onSave={handleSaveEvent}
            users={users}
            searchResults={searchResults}
            isSearching={isSearching}
            onSearchPPPoE={debouncedSearch}
          />
        </div>
      </div>
    </Layout>
  );
}
