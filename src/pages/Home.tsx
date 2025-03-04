import React from 'react';
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
import Layout from '../components/Layout';
import {
  ChartBarIcon,
  UserGroupIcon,
  CubeIcon,
  BanknotesIcon,
  MapIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  WrenchScrewdriverIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useCardOrder } from '../hooks/useCardOrder';
import { ROUTES } from '../constants/routes';

interface MenuItem {
  title: string;
  icon: React.ForwardRefExoticComponent<any>;
  description: string;
  path: string;
  color: string;
}

interface SortableCardProps {
  card: MenuItem;
  onClick: () => void;
}

const renderIcon = (IconComponent: React.ForwardRefExoticComponent<any>) => {
  return (
    <IconComponent className="h-12 w-12 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white" />
  );
};

const SortableCard: React.FC<SortableCardProps> = ({ card, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.title });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group
        relative w-[260px] p-6 rounded-xl cursor-pointer
        transition-all duration-300 transform hover:-translate-y-1
        ${isDragging ? 'scale-105 z-50 opacity-50' : 'hover:scale-105'}
        bg-white dark:bg-gray-800 backdrop-blur-lg
        shadow-[5px_5px_15px_rgba(0,0,0,0.1),-5px_-5px_15px_rgba(255,255,255,0.8)]
        dark:shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(255,255,255,0.05)]
        hover:shadow-[inset_5px_5px_15px_rgba(0,0,0,0.05),inset_-5px_-5px_15px_rgba(255,255,255,0.8)]
        dark:hover:shadow-[inset_5px_5px_15px_rgba(0,0,0,0.2),inset_-5px_-5px_15px_rgba(255,255,255,0.05)]
        border border-gray-200 dark:border-gray-700`}
    >
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color} rounded-t-xl opacity-80`} />
      <div className="flex flex-col items-center text-center space-y-4">
        {renderIcon(card.icon)}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white">
          {card.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {card.description}
        </p>
      </div>
    </div>
  );
};

const initialMenuItems = [
  {
    title: 'Dashboard',
    icon: ChartBarIcon,
    description: 'Visualize métricas e indicadores importantes',
    path: ROUTES.DASHBOARD,
    color: 'from-blue-400 to-blue-600'
  },
  {
    title: 'Clientes',
    icon: UserGroupIcon,
    description: 'Gerencie seus clientes e contratos',
    path: ROUTES.CLIENTES,
    color: 'from-green-400 to-green-600'
  },
  {
    title: 'Financeiro',
    icon: CubeIcon,
    description: 'Controle financeiro e faturamento',
    path: ROUTES.FINANCEIRO,
    color: 'from-yellow-400 to-yellow-600'
  },
  {
    title: 'Planos',
    icon: DocumentTextIcon,
    description: 'Configure e gerencie planos',
    path: ROUTES.PLANOS,
    color: 'from-purple-400 to-purple-600'
  },
  {
    title: 'Agenda',
    icon: MapIcon,
    description: 'Organize instalações e visitas',
    path: ROUTES.AGENDA,
    color: 'from-indigo-400 to-indigo-600'
  },
  {
    title: 'Suporte Técnico',
    icon: WrenchScrewdriverIcon,
    description: 'Monitore e configure sua rede',
    path: ROUTES.REDE,
    color: 'from-teal-400 to-teal-600'
  },
  {
    title: 'Caixa',
    icon: BanknotesIcon,
    description: 'Lançamentos diários de receitas e despesas',
    path: ROUTES.CAIXA,
    color: 'from-emerald-400 to-emerald-600'
  },
  {
    title: 'ADM',
    icon: Cog6ToothIcon,
    description: 'Configurações administrativas',
    path: ROUTES.ADM,
    color: 'from-gray-400 to-gray-600'
  },
  {
    title: 'Técnicos',
    icon: BuildingStorefrontIcon,
    description: 'Gerenciar técnicos',
    path: ROUTES.TECNICOS,
    color: 'from-orange-400 to-orange-600'
  },
  {
    title: 'Estoque',
    icon: DocumentDuplicateIcon,
    description: 'Controle de estoque',
    path: ROUTES.ESTOQUE,
    color: 'from-red-400 to-red-600'
  }
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useCardOrder(initialMenuItems);
  const [activeId, setActiveId] = React.useState<string | null>(null);

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
        const oldIndex = items.findIndex((item) => item.title === active.id);
        const newIndex = items.findIndex((item) => item.title === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] p-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center">
            <div className="mb-8">
              <img 
                src="https://dieycvogftvfoncigvtl.supabase.co/storage/v1/object/public/imagens//logoconecte.jpg"
                alt="Conecte Logo"
                className="w-[135px] h-auto"
              />
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                <SortableContext 
                  items={cards.map(card => card.title)}
                  strategy={horizontalListSortingStrategy}
                >
                  {cards.map((card) => (
                    <SortableCard
                      key={card.title}
                      card={card}
                      onClick={() => handleCardClick(card.path)}
                    />
                  ))}
                </SortableContext>
              </div>

              <DragOverlay>
                {activeId ? (
                  <SortableCard
                    card={cards.find((card) => card.title === activeId)!}
                    onClick={() => {}}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
