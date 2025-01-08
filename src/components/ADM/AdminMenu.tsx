import React from 'react';
import { 
  UserIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon,
  UserGroupIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import classNames from 'classnames';

interface AdminMenuProps {
  onMenuClick: (path: string) => void;
}

const menuItems = [
  {
    id: 'usuarios',
    name: 'Usuários',
    icon: UserIcon,
    href: '/adm/usuarios',
    description: 'Gerenciar usuários do sistema',
    color: 'blue'
  },
  {
    id: 'mensagens',
    name: 'Mensagens WhatsApp',
    icon: ChatBubbleLeftRightIcon,
    href: '/adm/mensagens',
    description: 'Configurar mensagens automáticas',
    color: 'green'
  },
  {
    id: 'tipos_usuarios',
    name: 'Tipos de Usuários',
    icon: UserGroupIcon,
    href: '/adm/tipos-usuarios',
    description: 'Gerenciar perfis de acesso',
    color: 'purple'
  },
  {
    id: 'configuracoes',
    name: 'Configurações',
    icon: Cog6ToothIcon,
    href: '/adm/configuracoes',
    description: 'Configurações do sistema',
    color: 'gray'
  },
  {
    id: 'bairros',
    name: 'Bairros',
    icon: MapPinIcon,
    href: '/adm/bairros',
    description: 'Gerenciar bairros',
    color: 'orange'
  }
];

const AdminMenu: React.FC<AdminMenuProps> = ({ onMenuClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            console.log('Clicou em:', item.href);
            onMenuClick(item.href);
          }}
          className={classNames(
            'group relative p-6 rounded-xl transition-all duration-300 w-[260px]',
            'bg-white dark:bg-gray-800 backdrop-blur-lg',
            'shadow-[5px_5px_15px_rgba(0,0,0,0.1),-5px_-5px_15px_rgba(255,255,255,0.8)]',
            'dark:shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(255,255,255,0.05)]',
            'hover:shadow-[inset_5px_5px_15px_rgba(0,0,0,0.05),inset_-5px_-5px_15px_rgba(255,255,255,0.8)]',
            'dark:hover:shadow-[inset_5px_5px_15px_rgba(0,0,0,0.2),inset_-5px_-5px_15px_rgba(255,255,255,0.05)]',
            'transform hover:-translate-y-1 hover:scale-105',
            'border border-gray-200 dark:border-gray-700'
          )}
        >
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 rounded-t-xl opacity-80`} />
          <div className="flex flex-col items-center text-center space-y-4">
            <item.icon className="h-12 w-12 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white">
              {item.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default AdminMenu;
