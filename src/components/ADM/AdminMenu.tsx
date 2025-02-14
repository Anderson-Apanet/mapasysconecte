import React from 'react';
import { 
  UserIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon,
  UserGroupIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  DocumentTextIcon,
  TruckIcon
} from '@heroicons/react/24/solid';
import classNames from 'classnames';
import { ROUTES } from '@/constants/routes';
import { useNavigate } from 'react-router-dom';

interface AdminMenuProps {
  onMenuClick: (path: string) => void;
}

interface MenuItem {
  id: string;
  name: string;
  icon: React.ForwardRefExoticComponent<any>;
  href: string;
  description: string;
  color: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'usuarios',
    name: 'Usuários',
    icon: UserIcon,
    href: ROUTES.ADM_USERS,
    description: 'Gerenciar usuários do sistema',
    color: 'from-blue-400 to-blue-600'
  },
  {
    id: 'mensagens',
    name: 'Mensagens WhatsApp',
    icon: ChatBubbleLeftRightIcon,
    href: ROUTES.ADM_MESSAGES,
    description: 'Configurar mensagens automáticas',
    color: 'from-green-400 to-green-600'
  },
  {
    id: 'tipos_usuarios',
    name: 'Tipos de Usuários',
    icon: UserGroupIcon,
    href: ROUTES.ADM_USER_TYPES,
    description: 'Configurar tipos de usuários',
    color: 'from-yellow-400 to-yellow-600'
  },
  {
    id: 'bairros',
    name: 'Bairros',
    icon: MapPinIcon,
    href: ROUTES.ADM_BAIRROS,
    description: 'Gerenciar bairros atendidos',
    color: 'from-purple-400 to-purple-600'
  },
  {
    id: 'veiculos',
    name: 'Veículos',
    icon: TruckIcon,
    href: ROUTES.ADM_VEICULOS,
    description: 'Gerenciar veículos da empresa',
    color: 'from-orange-400 to-orange-600'
  },
  {
    id: 'configuracoes',
    name: 'Configurações',
    icon: Cog6ToothIcon,
    href: ROUTES.ADM_SETTINGS,
    description: 'Configurações do sistema',
    color: 'from-gray-400 to-gray-600'
  }
];

const AdminMenu: React.FC<AdminMenuProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();

  const handleClick = (href: string) => {
    if (href === ROUTES.ADM_USER_TYPES) {
      onMenuClick(href);
    } else {
      navigate(href, { replace: true });
    }
  };

  const renderIcon = (IconComponent: React.ForwardRefExoticComponent<any>) => {
    return (
      <IconComponent className="h-12 w-12 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white" />
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {menuItems.map((item) => (
        <div
          key={item.id}
          onClick={() => handleClick(item.href)}
          className="group relative w-[260px] p-6 rounded-xl cursor-pointer
            transition-all duration-300 transform hover:-translate-y-1 hover:scale-105
            bg-white dark:bg-gray-800 backdrop-blur-lg
            shadow-[5px_5px_15px_rgba(0,0,0,0.1),-5px_-5px_15px_rgba(255,255,255,0.8)]
            dark:shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(255,255,255,0.05)]
            hover:shadow-[inset_5px_5px_15px_rgba(0,0,0,0.05),inset_-5px_-5px_15px_rgba(255,255,255,0.8)]
            dark:hover:shadow-[inset_5px_5px_15px_rgba(0,0,0,0.2),inset_-5px_-5px_15px_rgba(255,255,255,0.05)]
            border border-gray-200 dark:border-gray-700"
        >
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.color} rounded-t-xl opacity-80`} />
          <div className="flex flex-col items-center text-center space-y-4">
            {renderIcon(item.icon)}
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white">
              {item.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminMenu;
