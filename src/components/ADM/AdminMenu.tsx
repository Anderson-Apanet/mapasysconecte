import React, { useState } from 'react';
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
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  DragOverlay,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAdminCardOrder } from '@/hooks/useAdminCardOrder'; // Corrigindo a importação do hook useAdminCardOrder

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

const initialMenuItems: MenuItem[] = [
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

interface SortableCardProps {
  item: MenuItem;
  onClick: () => void;
}

const SortableCard: React.FC<SortableCardProps> = ({ item, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderIcon = (IconComponent: React.ForwardRefExoticComponent<any>) => {
    return (
      <IconComponent className="h-12 w-12 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white" />
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
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
  );
};

const AdminMenu: React.FC<AdminMenuProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [cards, setCards] = useAdminCardOrder(initialMenuItems);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const handleClick = (href: string) => {
    if (href === ROUTES.ADM_USER_TYPES) {
      onMenuClick(href);
    } else {
      navigate(href, { replace: true });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex justify-center">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
          <SortableContext 
            items={cards.map(card => card.id)}
            strategy={horizontalListSortingStrategy}
          >
            {cards.map((item) => (
              <SortableCard
                key={item.id}
                item={item}
                onClick={() => handleClick(item.href)}
              />
            ))}
          </SortableContext>
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <SortableCard
            item={cards.find((card) => card.id === activeId)!}
            onClick={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default AdminMenu;
