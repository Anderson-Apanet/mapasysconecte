import React, { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
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
  const [searchResults, setSearchResults] = useState<Array<{ id: number; pppoe: string; endereco: string }>>([]);
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
        // Se o evento tem um PPPoE, buscar informações do contrato para obter o endereço
        let endereco = '';
        if (event.pppoe) {
          try {
            const contratos = await searchContratos(event.pppoe);
            const contrato = contratos.find(c => c.pppoe === event.pppoe);
            if (contrato && contrato.endereco) {
              endereco = contrato.endereco;
            }
          } catch (error) {
            console.error('Erro ao buscar informações do contrato:', error);
          }
        }

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
          endereco: endereco, // Adiciona o endereço do contrato
          cor: event.cor,
          criador: event.criador, // Adiciona o criador do evento
          data_cad_evento: event.data_cad_evento // Adiciona a data de criação do evento
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
        // Obtém a visualização atual do calendário
        const view = calendarApi.view;
        // Obtém as datas de início e fim da visualização atual
        const start = calendarApi.view.activeStart;
        const end = calendarApi.view.activeEnd;
        
        // Recarrega os eventos para o período atual
        try {
          // Buscar eventos para o período atual
          const events = await fetchEvents(start.toISOString(), end.toISOString());
          // Transformar eventos para o formato do FullCalendar
          const transformedEvents = await transformEvents(events);
          // Atualiza os eventos no estado
          setEvents(transformedEvents);
          // Força o calendário a renderizar novamente
          calendarApi.refetchEvents();
        } catch (error) {
          console.error('Erro ao recarregar eventos:', error);
        }
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
    // Verifica se estamos no modo mensal ou semanal
    if (currentViewType === 'dayGridMonth' || currentViewType === 'timeGridWeek') {
      console.log(`Filtrando eventos realizados na visualização ${currentViewType}`);
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
              plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
              }}
              initialView="dayGridMonth"
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={false}
              weekends={true}
              locale={ptBrLocale}
              nowIndicator={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              events={filterEvents(events)}
              datesSet={handleDatesSet}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              moreLinkContent={({ num }) => `Ver mais (${num})`}
              moreLinkClick="popover"
              eventDisplay="block"
              eventOrder="start,-allDay"
              displayEventTime={true}
              displayEventEnd={true}
              eventMinHeight={24}
              views={{
                dayGridMonth: {
                  titleFormat: { year: 'numeric', month: 'long' },
                  dayHeaderFormat: { weekday: 'short', day: 'numeric' }
                },
                listWeek: {
                  titleFormat: { year: 'numeric', month: 'long', day: '2-digit' },
                  listDayFormat: { weekday: 'long', day: 'numeric', month: 'long' },
                  listDaySideFormat: { weekday: 'short' }
                }
              }}
              eventClassNames={(arg) => {
                // Adicionar classes personalizadas com base no tipo de evento
                const classes = [];
                const tipoEvento = (arg.event.extendedProps.tipo_evento || '').toLowerCase();
                
                // Adicionar classe com base no tipo de evento
                if (tipoEvento === 'visita') {
                  classes.push('evento-visita');
                } else if (tipoEvento === 'instalacao' || tipoEvento === 'instalação') {
                  classes.push('evento-instalacao');
                } else if (tipoEvento === 'lembrete') {
                  classes.push('evento-lembrete');
                } else if (tipoEvento === 'retirada') {
                  classes.push('evento-retirada');
                }
                
                // Adicionar classes com base no status
                if (arg.event.extendedProps.realizada === true) {
                  classes.push('evento-realizado');
                } else if (arg.event.extendedProps.parcial === true) {
                  classes.push('evento-parcial');
                } else if (arg.event.extendedProps.prioritario === true) {
                  classes.push('evento-prioritario');
                }
                
                return classes;
              }}
              eventContent={(eventInfo) => {
                const event = eventInfo.event;
                
                // Definir cores com base no tipo de evento
                let backgroundColor = '#3788d8'; // Cor padrão (azul)
                
                // Verifica o tipo de evento (em minúsculas para garantir a comparação)
                const tipoEvento = (event.extendedProps.tipo_evento || '').toLowerCase();
                
                if (tipoEvento === 'visita') {
                  backgroundColor = '#28a745'; // Verde para visitas
                } else if (tipoEvento === 'instalacao' || tipoEvento === 'instalação') {
                  backgroundColor = '#5F57E7'; // Azul específico para instalações
                } else if (tipoEvento === 'lembrete') {
                  backgroundColor = '#fd7e14'; // Laranja para lembretes
                } else if (tipoEvento === 'retirada') {
                  backgroundColor = '#ffc107'; // Amarelo para retiradas
                }
                
                // Se o evento já foi realizado, mantém a cor definida no transformEvents
                if (event.extendedProps.realizada === true) {
                  backgroundColor = '#28a745'; // Verde para eventos realizados
                } else if (event.extendedProps.parcial === true) {
                  backgroundColor = '#ffc107'; // Amarelo para eventos parcialmente realizados
                } else if (event.extendedProps.prioritario === true) {
                  backgroundColor = '#dc3545'; // Vermelho para eventos prioritários
                }
                
                const textColor = event.textColor || 'white';
                const isTimeGridView = eventInfo.view.type.includes('timeGrid');
                const isPastEvent = event.end 
                  ? new Date(event.end as Date) < new Date() 
                  : new Date(event.start as Date) < new Date();
                
                // Não mostrar eventos já realizados na visualização de mês
                if (isPastEvent && !isTimeGridView && event.extendedProps.realizada) {
                  return null;
                }

                // Para debug
                console.log('Evento:', event.title, 'Tipo:', tipoEvento, 'Cor:', backgroundColor);

                return (
                  <div
                    style={{
                      backgroundColor,
                      color: textColor,
                      borderRadius: '3px',
                      padding: '1px 3px',
                      fontSize: eventInfo.view.type === 'dayGridMonth' ? '0.8em' : '0.85em',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      width: '100%',
                      marginBottom: '1px',
                      opacity: isPastEvent ? 0.7 : 1
                    }}
                  >
                    {eventInfo.view.type === 'dayGridMonth' && event.start ? (
                      <>
                        <span style={{ fontWeight: 'bold' }}>
                          {new Date(event.start as Date).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </span>
                        {' - '}
                        {event.title}
                      </>
                    ) : (
                      event.title
                    )}
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
      <style>{`
        .evento-visita {
          background-color: #28a745 !important;
          border-color: #28a745 !important;
        }
        
        .evento-instalacao {
          background-color: #5F57E7 !important;
          border-color: #5F57E7 !important;
        }
        
        .evento-lembrete {
          background-color: #fd7e14 !important;
          border-color: #fd7e14 !important;
        }
        
        .evento-retirada {
          background-color: #ffc107 !important;
          border-color: #ffc107 !important;
        }
        
        .evento-realizado {
          background-color: #28a745 !important;
          border-color: #28a745 !important;
        }
        
        .evento-parcial {
          background-color: #ffc107 !important;
          border-color: #ffc107 !important;
        }
        
        .evento-prioritario {
          background-color: #dc3545 !important;
          border-color: #dc3545 !important;
        }
      `}</style>
    </Layout>
  );
}
