import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

interface UserData {
  id_user_tipo: number;
  user_tipo: {
    tipo: string;
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Função para buscar dados do usuário
    const fetchUserData = async (userId: string) => {
      try {
        console.log('Buscando dados do usuário:', userId);
        
        // Adicionar cabeçalho Accept explícito para evitar erro 406
        const { data, error } = await supabase
          .from('users')
          .select(`
            id_user_tipo,
            user_tipo (tipo)
          `)
          .eq('id_user', userId)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          return null;
        }

        console.log('Dados do usuário obtidos com sucesso:', data);
        return data;
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    };

    // Função para atualizar o estado com a nova sessão
    const handleSessionUpdate = async (currentSession: Session | null) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const data = await fetchUserData(currentSession.user.id);
        setUserData(data);
      } else {
        setUserData(null);
      }

      setLoading(false);
    };

    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionUpdate(session);
    });

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleSessionUpdate(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    session,
    user,
    userData,
    loading,
    signOut,
  };
}
