import { UserCircleIcon } from '@heroicons/react/24/outline';
import { SunIcon, MoonIcon, HomeIcon } from '@heroicons/react/24/solid';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Mapeamento de rotas para títulos
const routeTitles: { [key: string]: string } = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/agenda': 'Agenda',
  '/financeiro': 'Financeiro',
  '/caixa': 'Caixa',
  '/suporte': 'Suporte Técnico',
  '/clientes': 'Clientes',
  '/planos': 'Planos',
  '/rede': 'Rede',
  '/adm': 'Administração'
};

export default function Header() {
  const [isDark, setIsDark] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  // Função para obter o título da página atual
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    return routeTitles[path] || 'MapaSys';
  };

  useEffect(() => {
    // Verifica o tema inicial
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);

    // Busca o nome do usuário
    const fetchUserName = async () => {
      try {
        // Pega o usuário autenticado do auth.users
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          // Busca o nome do usuário na tabela users usando o id_user
          const { data: userData, error } = await supabase
            .from('users')
            .select('nome')
            .eq('id_user', user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Erro ao buscar usuário:', error);
            return;
          }
          
          // Se encontrou o nome na tabela users, usa ele
          // Caso contrário, usa o email do usuário autenticado
          setUserName(userData?.nome || user.email?.split('@')[0] || 'Usuário');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      }
    };

    fetchUserName();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-[#1a2234] shadow-md z-50 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="https://aunfucsmyfbdyxfgvpha.supabase.co/storage/v1/object/public/assets-mapasys/conecte/MapaSys_Logo_novo.png"
              alt="MapaSys Logo"
              className="h-8 w-auto"
            />
          </div>

          {/* Título da Página */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {getCurrentPageTitle()}
            </h1>
          </div>

          {/* Theme Toggle, Home and User Menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 
                       text-gray-800 dark:text-gray-200
                       hover:bg-gray-200 dark:hover:bg-gray-700 
                       transition-colors duration-200"
              aria-label="Ir para Home"
            >
              <HomeIcon className="h-5 w-5" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <UserCircleIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                  {userName || 'Usuário'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium rounded-lg
                         bg-gray-100 dark:bg-gray-800 
                         text-gray-800 dark:text-gray-200
                         hover:bg-gray-200 dark:hover:bg-gray-700 
                         transition-colors duration-200"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
