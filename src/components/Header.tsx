import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  MoonIcon, 
  SunIcon, 
  UserCircleIcon, 
  BuildingOfficeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import useAuth from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

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

// Definir a interface para o objeto empresa
interface Empresa {
  id: number;
  nome: string;
  cnpj: string;
}

export default function Header() {
  const [isDark, setIsDark] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaDropdownOpen, setEmpresaDropdownOpen] = useState(false);
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null);
  const empresaDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, user, switchEmpresa, signOut } = useAuth();

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
  }, []);

  // Atualiza o nome do usuário quando userData mudar
  useEffect(() => {
    if (userData) {
      // Buscar o nome do usuário na tabela users
      const fetchUserName = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('nome')
            .eq('id_user', user?.id)
            .single();
            
          if (error) {
            console.error('Erro ao buscar nome do usuário:', error);
            // Usar email como fallback
            setUserName(user?.email?.split('@')[0] || 'Usuário');
            return;
          }
          
          if (data && data.nome) {
            setUserName(data.nome);
          } else {
            // Usar email como fallback
            setUserName(user?.email?.split('@')[0] || 'Usuário');
          }
        } catch (error) {
          console.error('Erro ao buscar nome do usuário:', error);
          setUserName(user?.email?.split('@')[0] || 'Usuário');
        }
      };
      
      fetchUserName();
    }
  }, [userData, user]);

  // Buscar empresas do usuário
  useEffect(() => {
    const fetchUserEmpresas = async () => {
      if (!user) return;
      
      try {
        console.log('Buscando empresas para o usuário:', user.id);
        
        const { data, error } = await supabase
          .from('usuarios_empresas')
          .select(`
            empresa_id,
            empresas:empresa_id (
              id,
              nome,
              cnpj
            )
          `)
          .eq('usuario_id', user.id);
          
        if (error) {
          console.error('Erro ao buscar empresas do usuário:', error);
          return;
        }
        
        console.log('Dados recebidos da consulta:', data);
        
        if (data && data.length > 0) {
          // Usar tipagem mais genérica para evitar erros de tipo
          const formattedEmpresas = data.map((item: any) => {
            // Verificar se item.empresas existe e tem as propriedades necessárias
            if (item.empresas && typeof item.empresas === 'object') {
              return {
                id: item.empresa_id,
                nome: item.empresas.nome || '',
                cnpj: item.empresas.cnpj || ''
              };
            }
            // Fallback para caso item.empresas não tenha o formato esperado
            return {
              id: item.empresa_id,
              nome: 'Empresa sem nome',
              cnpj: ''
            };
          });
          
          console.log('Empresas formatadas:', formattedEmpresas);
          setEmpresas(formattedEmpresas);
          
          // Definir a empresa atual com base no userData
          if (userData?.empresa_id) {
            const empresaAtual = formattedEmpresas.find(emp => emp.id === userData.empresa_id);
            if (empresaAtual) {
              setCurrentEmpresa(empresaAtual);
            }
          }
        } else {
          console.log('Nenhuma empresa encontrada para o usuário');
          // Se não encontrou empresas na tabela usuarios_empresas,
          // verificar se o usuário tem uma empresa_id definida
          if (userData?.empresa_id) {
            console.log('Usando empresa_id do userData:', userData.empresa_id);
            // Buscar dados da empresa diretamente
            const { data: empresaData, error: empresaError } = await supabase
              .from('empresas')
              .select('id, nome, cnpj')
              .eq('id', userData.empresa_id)
              .single();
              
            if (empresaError) {
              console.error('Erro ao buscar dados da empresa:', empresaError);
            } else if (empresaData) {
              console.log('Dados da empresa encontrados:', empresaData);
              const empresaFormatada = {
                id: empresaData.id,
                nome: empresaData.nome,
                cnpj: empresaData.cnpj
              };
              setEmpresas([empresaFormatada]);
              setCurrentEmpresa(empresaFormatada);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      }
    };
    
    fetchUserEmpresas();
  }, [user, userData?.empresa_id]);

  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (empresaDropdownRef.current && !empresaDropdownRef.current.contains(event.target as Node)) {
        setEmpresaDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Função para alternar o tema
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const handleSwitchEmpresa = async (empresaId: number) => {
    console.log('Trocando para empresa:', empresaId);
    const success = await switchEmpresa(empresaId);
    if (success) {
      // Atualizar a empresa atual no estado local
      const empresaSelecionada = empresas.find(emp => emp.id === empresaId);
      if (empresaSelecionada) {
        setCurrentEmpresa(empresaSelecionada);
      }
      setEmpresaDropdownOpen(false);
      // Opcional: Recarregar a página para atualizar os dados
      window.location.reload();
    }
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

          {/* Theme Toggle, Home, Empresa and User Menu */}
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

            {/* Seleção de Empresa */}
            <div className="relative" ref={empresaDropdownRef}>
              <button
                onClick={() => setEmpresaDropdownOpen(!empresaDropdownOpen)}
                className="flex items-center p-2 rounded-lg bg-gray-100 dark:bg-gray-800 
                         text-gray-800 dark:text-gray-200
                         hover:bg-gray-200 dark:hover:bg-gray-700 
                         transition-colors duration-200"
              >
                <BuildingOfficeIcon className="h-5 w-5 mr-1" />
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {userData?.empresa?.nome || currentEmpresa?.nome || 'Selecionar Empresa'}
                </span>
                <ChevronDownIcon className="h-4 w-4 ml-1" />
              </button>
              
              {empresaDropdownOpen && empresas.length > 0 && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {empresas.map((empresa) => (
                      <button
                        key={empresa.id}
                        onClick={() => handleSwitchEmpresa(empresa.id)}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          (currentEmpresa?.id === empresa.id || userData?.empresa_id === empresa.id)
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        role="menuitem"
                      >
                        <div className="font-medium">{empresa.nome}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {empresa.cnpj}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <UserCircleIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                  {userName}
                </span>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/login');
                }}
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
