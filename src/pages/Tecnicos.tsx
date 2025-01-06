import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaEvent } from '../types/agenda';
import { fetchEvents } from '../services/agenda';
import { InstalacaoModal } from '../components/Tecnicos/InstalacaoModal';
import { useNavigate } from 'react-router-dom';

export default function Tecnicos() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [userName, setUserName] = useState<string>('');
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
  }, []);

  // Memoize funções de manipulação de data
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

  // Memoize funções de manipulação de eventos
  const handleEventClick = useCallback((event: AgendaEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

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
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
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
      await fetchDayEvents(selectedDate);
      await fetchUserName();
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [selectedDate, fetchDayEvents, fetchUserName]);

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
        {/* Controles de data */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleToday}
              className={`flex items-center px-3 py-1.5 text-sm rounded-full ${
                isToday(selectedDate)
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Hoje
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousDay}
                className="p-1.5 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h2 className="text-base font-medium text-gray-900">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h2>
              <button
                onClick={handleNextDay}
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
            Nenhum evento agendado para hoje.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div 
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${getEventTypeColor(event.tipo_evento)} active:bg-gray-50`}
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
                <h3 className="font-medium text-gray-900 mb-1">
                  {event.nome}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {event.descricao}
                </p>
                {event.tipo_evento === 'Instalação' && event.pppoe && (
                  <p className="text-xs text-gray-500">
                    PPPoE: {event.pppoe}
                  </p>
                )}
                <div className="mt-2 flex items-center">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {event.tipo_evento}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InstalacaoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        onEventUpdated={() => fetchDayEvents(selectedDate)}
      />
    </div>
  );
}
