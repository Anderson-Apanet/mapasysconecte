import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface PrivateRouteProps {
  children: React.ReactNode;
}

interface UserData {
  id_user_tipo: number;
  user_tipo: {
    tipo: string;
  };
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function checkSession() {
      // Verifica a sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        // Busca o tipo de usuário
        const { data, error } = await supabase
          .from('users')
          .select(`
            id_user_tipo,
            user_tipo (tipo)
          `)
          .eq('id_user', session.user.id)
          .single();

        if (!error && data) {
          setUserData(data);
        }
      }

      setLoading(false);
    }

    checkSession();

    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        // Busca o tipo de usuário
        const { data, error } = await supabase
          .from('users')
          .select(`
            id_user_tipo,
            user_tipo (tipo)
          `)
          .eq('id_user', session.user.id)
          .single();

        if (!error && data) {
          setUserData(data);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mostra um loader enquanto verifica a autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!session) {
    // Não está logado, redireciona para a página de login
    return <Navigate to="/login" replace />;
  }

  // Verifica se é técnico externo e está tentando acessar uma página diferente de /tecnicos
  if (userData?.user_tipo?.tipo === 'Técnico Externo' && location.pathname !== '/tecnicos') {
    return <Navigate to="/tecnicos" replace />;
  }

  // Está logado e tem as permissões corretas, renderiza o componente filho
  return <>{children}</>;
}
