import Header from '../components/Header';
import Footer from '../components/Footer';
import { UsersIcon, DocumentCheckIcon, CalendarIcon, ClockIcon, UserPlusIcon, CalendarDaysIcon, DocumentPlusIcon, Link } from '../components/Icons';
import { navigate } from '../components/Navigation';

export default function Dashboard() {
  const totalClients = 10;
  const activePlans = 5;
  const todayAppointments = 3;
  const recentActivities = [
    { title: 'Atividade 1', description: 'Descrição da atividade 1', time: '10 minutos atrás' },
    { title: 'Atividade 2', description: 'Descrição da atividade 2', time: '30 minutos atrás' },
    { title: 'Atividade 3', description: 'Descrição da atividade 3', time: '1 hora atrás' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Bem-vindo ao seu painel de controle
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Clients Card */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total de Clientes
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {totalClients}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link
                  to="/clientes"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Ver todos os clientes
                </Link>
              </div>
            </div>
          </div>

          {/* Active Plans Card */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentCheckIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Planos Ativos
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {activePlans}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link
                  to="/planos"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Ver todos os planos
                </Link>
              </div>
            </div>
          </div>

          {/* Today's Appointments Card */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Agendamentos Hoje
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {todayAppointments}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link
                  to="/agenda"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Ver agenda completa
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Atividades Recentes
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Últimas ações realizadas no sistema
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentActivities.map((activity, index) => (
                  <li key={index} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {activity.description}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {recentActivities.length === 0 && (
              <div className="text-center py-12">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma atividade recente
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  As atividades recentes aparecerão aqui.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Ações Rápidas
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Acesse rapidamente as principais funcionalidades
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  onClick={() => navigate('/clientes/novo')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Novo Cliente
                </button>
                <button
                  onClick={() => navigate('/agenda/novo')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <CalendarDaysIcon className="h-5 w-5 mr-2" />
                  Novo Agendamento
                </button>
                <button
                  onClick={() => navigate('/planos/novo')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <DocumentPlusIcon className="h-5 w-5 mr-2" />
                  Novo Plano
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
