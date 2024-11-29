import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  WrenchScrewdriverIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { useSidebar } from '../contexts/SidebarContext';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import '../styles/digital.css';

const menuItems = [
  { path: '/', name: 'Home', icon: HomeIcon },
  { path: '/adm', name: 'ADM', icon: UserGroupIcon },
  { path: '/clientes', name: 'Clientes', icon: UsersIcon },
  { path: '/planos', name: 'Planos', icon: SignalIcon },
  { path: '/financeiro', name: 'Financeiro', icon: CurrencyDollarIcon },
  { path: '/agenda', name: 'Agenda', icon: CalendarIcon },
  { path: '/suporte', name: 'Suporte', icon: WrenchScrewdriverIcon },
];

export default function Sidebar() {
  const { isExpanded, toggleSidebar } = useSidebar();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const location = useLocation();

  return (
    <div
      className={`
        fixed left-0 top-0 h-screen
        ${isExpanded ? 'w-64' : 'w-20'}
        transition-all duration-300
        bg-sky-50 dark:bg-sky-900
        shadow-lg
      `}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`
          flex items-center justify-between
          border-b border-sky-100 dark:border-sky-800
          ${isExpanded ? 'p-4' : 'py-4 px-2'}
        `}>
          <div className="flex items-center flex-shrink-0">
            {isExpanded && (
              <span className="digital-font text-2xl text-sky-800 dark:text-sky-100">
                MapaSys
              </span>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-800 focus:outline-none"
          >
            {isExpanded ? (
              <ChevronLeftIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="p-2 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`
                      flex items-center px-2 py-2 rounded-lg
                      ${isActive
                        ? 'bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-white'
                        : 'text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-800'
                      }
                      transition-colors duration-150
                    `}
                  >
                    <Icon className={`h-6 w-6 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                    {isExpanded && (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme Toggle */}
        <div className="p-4 border-t border-sky-100 dark:border-sky-800">
          <button
            onClick={toggleDarkMode}
            className={`
              w-full flex items-center justify-center p-2 rounded-lg
              text-sky-700 dark:text-sky-300
              hover:bg-sky-100 dark:hover:bg-sky-800
              transition-colors duration-150
            `}
          >
            {isDarkMode ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
