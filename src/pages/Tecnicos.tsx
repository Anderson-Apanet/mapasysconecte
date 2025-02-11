import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { format, startOfDay, endOfDay, isToday, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaEvent } from '../types/agenda';
import { fetchEvents } from '../services/agenda';
import InstalacaoModal from '../components/Tecnicos/InstalacaoModal';
import VisitaModal from '../components/Agenda/VisitaModal';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@headlessui/react';

interface ContratoDetalhes {
  endereco: string;
  bairro: {
    nome: string;
  };
  plano: {
    nome: string;
  };
}

interface EventCardProps {
  event: AgendaEvent;
  contratoDetalhes: ContratoDetalhes | null;
  onClick: (event: AgendaEvent) => void;
  getEventTypeColor: (tipo: string) => string;
  getStatusColor: (event: AgendaEvent) => string;
  getStatusText: (event: AgendaEvent) => string;
  compact?: boolean;
}

interface Tecnico {
  id: string;
  nome: string;
  email: string;
}

interface VisitaInfo {
  id: number;
  data: string;
  relato: string | null;
  acompanhante: string | null;
  id_agenda: number;
  id_contrato: number | null;
  tecnicos: Tecnico[];
}

interface InstalacaoInfo {
  id: number;
  data_instalacao: string;
  relato: string | null;
  acompanhante: string | null;
  id_agenda: number;
  id_contrato: number | null;
  tecnicos: Tecnico[];
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  contratoDetalhes,
  onClick,
  getEventTypeColor,
  getStatusColor,
  getStatusText,
  compact = false
}) => (
  <div 
    onClick={() => onClick(event)}
    className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${getEventTypeColor(event.tipo_evento)} active:bg-gray-50 ${
      compact ? 'text-sm' : ''
    } ${event.realizada ? 'opacity-60 filter blur-[0.3px]' : ''}`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-gray-500">
        {format(new Date(event.datainicio), "HH:mm", { locale: ptBR })}
        {event.horamarcada ? ` - ${format(new Date(event.datafinal), "HH:mm", { locale: ptBR })}` : ''}
      </span>
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(event)}`}>
        {getStatusText(event)}
      </span>
    </div>
    
    <h3 className={`font-medium text-gray-900 mb-1 ${compact ? 'text-sm' : ''}`}>
      {event.nome}
    </h3>
    
    {!compact && event.descricao && (
      <p className="text-sm text-gray-600 mb-2">
        {event.descricao}
      </p>
    )}

    {(event.tipo_evento === 'Instalação' || event.tipo_evento === 'Visita') && event.pppoe && (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
            PPPoE: {event.pppoe}
          </span>
          {contratoDetalhes?.plano && !compact && (
            <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
              {contratoDetalhes.plano.nome}
            </span>
          )}
        </div>
        
        {contratoDetalhes && !compact && (
          <div className="flex items-center text-sm text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span>
              {contratoDetalhes.endereco}, {contratoDetalhes.bairro?.nome}
            </span>
          </div>
        )}
      </div>
    )}
  </div>
);

export default function Tecnicos() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isInstalacaoModalOpen, setIsInstalacaoModalOpen] = useState(false);
  const [isVisitaModalOpen, setIsVisitaModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedVisitaInfo, setSelectedVisitaInfo] = useState<VisitaInfo | null>(null);
  const [selectedInstalacaoInfo, setSelectedInstalacaoInfo] = useState<InstalacaoInfo | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [contratosDetalhes, setContratosDetalhes] = useState<Record<string, ContratoDetalhes>>({});
  const navigate = useNavigate();

  // Memoize funções que não precisam ser recriadas a cada render
  const fetchUserName = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('users')
          .select('nome')
          .eq('id_user', session.user.id)
          .single();

        if (!error && data) {
          setUserName(data.nome);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar nome do usuário:', error);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
    }
  }, [navigate]);

  const fetchContratosDetalhes = useCallback(async (events: AgendaEvent[]) => {
    const pppoes = events
      .filter(event => event.pppoe)
      .map(event => event.pppoe);

    if (pppoes.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          pppoe,
          endereco,
          bairro:id_bairro (
            nome
          ),
          plano:id_plano (
            nome
          )
        `)
        .in('pppoe', pppoes);

      if (error) throw error;

      const detalhes = (data || []).reduce((acc, contrato) => ({
        ...acc,
        [contrato.pppoe]: {
          endereco: contrato.endereco,
          bairro: contrato.bairro,
          plano: contrato.plano
        }
      }), {});

      setContratosDetalhes(detalhes);
    } catch (error) {
      console.error('Erro ao buscar detalhes dos contratos:', error);
    }
  }, []);

  const fetchDayEvents = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const start = startOfDay(date);
      const end = endOfDay(date);
      
      const data = await fetchEvents(start, end);
      
      // Ordenar eventos apenas se houver dados
      if (Array.isArray(data)) {
        const sortedEvents = data.sort((a, b) => 
          new Date(a.datainicio).getTime() - new Date(b.datainicio).getTime()
        );
        setEvents(sortedEvents);
        fetchContratosDetalhes(sortedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      toast.error('Erro ao carregar eventos');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [fetchContratosDetalhes]);

  const fetchWeekEvents = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const start = startOfWeek(date, { locale: ptBR });
      const end = endOfWeek(date, { locale: ptBR });
      
      const data = await fetchEvents(start, end);
      
      if (Array.isArray(data)) {
        const sortedEvents = data.sort((a, b) => 
          new Date(a.datainicio).getTime() - new Date(b.datainicio).getTime()
        );
        setEvents(sortedEvents);
        fetchContratosDetalhes(sortedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      toast.error('Erro ao carregar eventos');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [fetchContratosDetalhes]);

  const handlePreviousDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, []);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handlePreviousWeek = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

  // Memoize funções de manipulação de eventos
  const handleEventClick = useCallback(async (event: AgendaEvent) => {
    setSelectedEvent(event);
    console.log('Evento clicado:', event);

    if (event.realizada) {
      try {
        if (event.tipo_evento === 'Instalação') {
          console.log('Buscando detalhes da instalação...');
          // Buscar instalação
          const { data: instalacao, error: instalacaoError } = await supabase
            .from('instalacao')
            .select(`
              id,
              data_instalacao,
              relato,
              acompanhante,
              id_agenda,
              id_contrato
            `)
            .eq('id_agenda', event.id)
            .maybeSingle();

          if (instalacaoError) throw instalacaoError;
          console.log('Dados da instalação:', instalacao);
          
          if (instalacao) {
            try {
              // Buscar técnicos da instalação - Simplificando a consulta
              const { data: tecnicosData, error: tecnicosError } = await supabase
                .from('instalacao_tecnicos')
                .select(`
                  tecnico_id,
                  users!tecnico_id (
                    id,
                    email,
                    raw_user_meta_data->nome
                  )
                `)
                .eq('instalacao_id', instalacao.id);

              console.log('Dados dos técnicos da instalação:', tecnicosData);
              console.log('Erro ao buscar técnicos da instalação:', tecnicosError);

              // Se houver erro ou não houver dados, apenas define tecnicos como array vazio
              const tecnicos = tecnicosError || !tecnicosData ? [] : 
                tecnicosData.map(t => ({
                  id: t.users.id,
                  email: t.users.email,
                  nome: t.users.raw_user_meta_data?.nome || 'Nome não informado'
                }));

              setSelectedInstalacaoInfo({
                ...instalacao,
                tecnicos
              });
            } catch (error) {
              console.warn('Erro ao buscar técnicos da instalação:', error);
              setSelectedInstalacaoInfo({
                ...instalacao,
                tecnicos: []
              });
            }
            setIsInfoModalOpen(true);
          }
        } else if (event.tipo_evento === 'Visita') {
          console.log('Buscando detalhes da visita...');
          // Buscar visita
          const { data: visita, error: visitaError } = await supabase
            .from('visitas')
            .select(`
              id,
              data,
              relato,
              acompanhante,
              id_agenda,
              id_contrato
            `)
            .eq('id_agenda', event.id)
            .maybeSingle();

          if (visitaError) throw visitaError;
          console.log('Dados da visita:', visita);
          
          if (visita) {
            try {
              // Buscar técnicos da visita - Simplificando a consulta
              const { data: tecnicosData, error: tecnicosError } = await supabase
                .from('visitas_tecnicos')
                .select(`
                  tecnico_id,
                  users!tecnico_id (
                    id,
                    email,
                    raw_user_meta_data->nome
                  )
                `)
                .eq('visita_id', visita.id);

              console.log('Dados dos técnicos da visita:', tecnicosData);
              console.log('Erro ao buscar técnicos da visita:', tecnicosError);

              // Se houver erro ou não houver dados, apenas define tecnicos como array vazio
              const tecnicos = tecnicosError || !tecnicosData ? [] : 
                tecnicosData.map(t => ({
                  id: t.users.id,
                  email: t.users.email,
                  nome: t.users.raw_user_meta_data?.nome || 'Nome não informado'
                }));

              setSelectedVisitaInfo({
                ...visita,
                tecnicos
              });
            } catch (error) {
              console.warn('Erro ao buscar técnicos da visita:', error);
              setSelectedVisitaInfo({
                ...visita,
                tecnicos: []
              });
            }
            setIsInfoModalOpen(true);
          } else {
            console.warn('Nenhum dado de visita encontrado para o evento:', event);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar informações:', error);
        toast.error('Erro ao carregar informações do evento');
      }
    } else {
      if (event.tipo_evento === 'Instalação') {
        setIsInstalacaoModalOpen(true);
      } else if (event.tipo_evento === 'Visita') {
        setIsVisitaModalOpen(true);
      }
    }
  }, []);

  const handleCloseInfoModal = useCallback(() => {
    setIsInfoModalOpen(false);
    setSelectedVisitaInfo(null);
    setSelectedInstalacaoInfo(null);
  }, []);

  const handleCloseInstalacaoModal = useCallback(() => {
    setIsInstalacaoModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleCloseVisitaModal = useCallback(() => {
    setIsVisitaModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleVisitaRegistered = useCallback(() => {
    fetchDayEvents(selectedDate);
  }, [selectedDate, fetchDayEvents]);

  // Memoize funções de estilo
  const getStatusColor = useMemo(() => (event: AgendaEvent) => {
    if (event.realizada) return 'bg-green-100 text-green-800';
    if (event.parcial) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  }, []);

  const getStatusText = useMemo(() => (event: AgendaEvent) => {
    if (event.realizada) return 'Concluída';
    if (event.parcial) return 'Parcial';
    return 'Pendente';
  }, []);

  const getEventTypeColor = useMemo(() => (tipo: string) => {
    switch (tipo) {
      case 'Instalação':
        return 'border-blue-500';
      case 'Suporte':
        return 'border-yellow-500';
      case 'Manutenção':
        return 'border-red-500';
      default:
        return 'border-gray-500';
    }
  }, []);

  // Efeito para atualizar sessão
  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;

    const refreshSession = async () => {
      if (!mounted) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) throw refreshError;
        }
      } catch (error) {
        console.error('Erro ao atualizar sessão:', error);
      }
    };

    interval = setInterval(refreshSession, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Efeito para monitorar autenticação
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN') {
        fetchDayEvents(selectedDate);
        fetchUserName();
      } else if (event === 'SIGNED_OUT') {
        setEvents([]);
        navigate('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [selectedDate, navigate, fetchDayEvents, fetchUserName]);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      if (!mounted) return;
      if (viewMode === 'day') {
        await fetchDayEvents(selectedDate);
      } else {
        await fetchWeekEvents(selectedDate);
      }
      await fetchUserName();
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [selectedDate, viewMode, fetchDayEvents, fetchWeekEvents, fetchUserName]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho fixo */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="px-4 py-2 flex justify-between items-center">
          <img 
            src="https://aunfucsmyfbdyxfgvpha.supabase.co/storage/v1/object/public/assets-mapasys/Nostranet/logosemfundo.PNG" 
            alt="Logo" 
            className="h-10 w-auto"
          />
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Olá, {userName}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="pt-16 pb-6 px-4">
        {/* Controles de data e visualização */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToday}
                className={`flex items-center px-3 py-1.5 text-sm rounded-full ${
                  isToday(selectedDate)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Hoje
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    viewMode === 'day'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dia
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    viewMode === 'week'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semana
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={viewMode === 'day' ? handlePreviousDay : handlePreviousWeek}
                className="p-1.5 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h2 className="text-base font-medium text-gray-900">
                {viewMode === 'day' 
                  ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                  : `${format(startOfWeek(selectedDate, { locale: ptBR }), "dd 'de' MMMM", { locale: ptBR })} - ${format(endOfWeek(selectedDate, { locale: ptBR }), "dd 'de' MMMM", { locale: ptBR })}`
                }
              </h2>
              <button
                onClick={viewMode === 'day' ? handleNextDay : handleNextWeek}
                className="p-1.5 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de eventos */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            Nenhum evento agendado para {viewMode === 'day' ? 'hoje' : 'esta semana'}.
          </div>
        ) : viewMode === 'day' ? (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                contratoDetalhes={event.pppoe ? contratosDetalhes[event.pppoe] : null}
                onClick={handleEventClick}
                getEventTypeColor={getEventTypeColor}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, index) => {
              const currentDate = addDays(startOfWeek(selectedDate, { locale: ptBR }), index);
              const dayEvents = events.filter(event => 
                isSameDay(new Date(event.datainicio), currentDate)
              );

              return (
                <div key={index} className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className={`text-sm font-medium mb-3 ${
                    isToday(currentDate) ? 'text-indigo-600' : 'text-gray-600'
                  }`}>
                    {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  
                  {dayEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum evento
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dayEvents.map((event) => (
                        <EventCard 
                          key={event.id} 
                          event={event} 
                          contratoDetalhes={event.pppoe ? contratosDetalhes[event.pppoe] : null}
                          onClick={handleEventClick}
                          getEventTypeColor={getEventTypeColor}
                          getStatusColor={getStatusColor}
                          getStatusText={getStatusText}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modais */}
        <InstalacaoModal
          isOpen={isInstalacaoModalOpen}
          onClose={handleCloseInstalacaoModal}
          event={selectedEvent}
          onEventUpdated={() => fetchDayEvents(selectedDate)}
        />

        {selectedEvent && (
          <VisitaModal
            isOpen={isVisitaModalOpen}
            onClose={handleCloseVisitaModal}
            event={selectedEvent}
            onVisitaRegistered={handleVisitaRegistered}
          />
        )}

        {/* Modal de Informações */}
        <Dialog
          open={isInfoModalOpen}
          onClose={handleCloseInfoModal}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full mx-4 p-6">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Detalhes do {selectedEvent?.tipo_evento}
              </Dialog.Title>

              {selectedInstalacaoInfo && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Data da Instalação</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(selectedInstalacaoInfo.data_instalacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  {selectedInstalacaoInfo.acompanhante && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Acompanhante</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedInstalacaoInfo.acompanhante}
                      </p>
                    </div>
                  )}

                  {selectedInstalacaoInfo.relato && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Relato</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedInstalacaoInfo.relato}
                      </p>
                    </div>
                  )}

                  {selectedInstalacaoInfo.tecnicos && selectedInstalacaoInfo.tecnicos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Técnicos</h3>
                      <ul className="list-disc pl-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedInstalacaoInfo.tecnicos.map(tecnico => (
                          <li key={tecnico.id}>{tecnico.nome}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {selectedVisitaInfo && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Data da Visita</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(selectedVisitaInfo.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  {selectedVisitaInfo.acompanhante && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Acompanhante</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedVisitaInfo.acompanhante}
                      </p>
                    </div>
                  )}

                  {selectedVisitaInfo.relato && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Relato</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedVisitaInfo.relato}
                      </p>
                    </div>
                  )}

                  {selectedVisitaInfo.tecnicos && selectedVisitaInfo.tecnicos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Técnicos</h3>
                      <ul className="list-disc pl-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedVisitaInfo.tecnicos.map(tecnico => (
                          <li key={tecnico.id}>{tecnico.nome}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                  onClick={handleCloseInfoModal}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
