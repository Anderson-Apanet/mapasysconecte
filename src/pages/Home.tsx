import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  SignalIcon, 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/solid';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Interface para os dados de usuários
interface UserStats {
  total_users: number;
  active_connections: number;
}

// Mock data for charts
const monthlyRevenue = [
  { month: 'Jan', value: 45000 },
  { month: 'Fev', value: 48000 },
  { month: 'Mar', value: 52000 },
  { month: 'Abr', value: 51000 },
  { month: 'Mai', value: 54000 },
  { month: 'Jun', value: 58000 },
];

const planDistribution = [
  { name: '50MB', value: 150 },
  { name: '100MB', value: 300 },
  { name: '200MB', value: 200 },
  { name: '500MB', value: 100 },
];

const dailyTickets = [
  { day: 'Seg', value: 25 },
  { day: 'Ter', value: 18 },
  { day: 'Qua', value: 22 },
  { day: 'Qui', value: 20 },
  { day: 'Sex', value: 15 },
  { day: 'Sab', value: 8 },
  { day: 'Dom', value: 5 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Home: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats>({
    total_users: 0,
    active_connections: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/user-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch user stats');
        }
        const data = await response.json();
        setUserStats(data);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchUserStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Cabeçalho elegante */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-blue-600/20 to-transparent"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">
            Bem-vindo ao seu painel de controle
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Clients Card */}
          <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 shadow-lg">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de Clientes</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                  {loading ? '...' : userStats.total_users}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">Atualizado</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">em tempo real</span>
            </div>
          </div>

          {/* Active Connections Card */}
          <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 shadow-lg">
                <SignalIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Conexões Ativas</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                  {loading ? '...' : userStats.active_connections}
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm">
              <span className="text-emerald-500 font-medium">
                {loading ? '...' : ((userStats.active_connections / userStats.total_users) * 100).toFixed(1)}%
              </span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">dos clientes online</span>
            </div>
          </div>

          {/* Monthly Revenue Card */}
          <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-3 shadow-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Receita Mensal</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">R$ 58.000</div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">+7.4%</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">desde último mês</span>
            </div>
          </div>

          {/* Active Tickets Card */}
          <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-3 shadow-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Chamados Ativos</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">15</div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowTrendingDownIcon className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">-23%</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">desde ontem</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Receita Mensal</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700/50" />
                  <XAxis dataKey="month" className="text-gray-600 dark:text-gray-300" />
                  <YAxis className="text-gray-600 dark:text-gray-300" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
                  <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution Chart */}
          <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Distribuição de Planos</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Support Tickets Chart */}
          <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Chamados por Dia</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTickets}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700/50" />
                  <XAxis dataKey="day" className="text-gray-600 dark:text-gray-300" />
                  <YAxis className="text-gray-600 dark:text-gray-300" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Estatísticas Rápidas</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/50 dark:border-gray-700/50">
                <span className="text-gray-600 dark:text-gray-300">Taxa de Inadimplência</span>
                <span className="font-semibold text-rose-500">4.8%</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/50 dark:border-gray-700/50">
                <span className="text-gray-600 dark:text-gray-300">Média de Download</span>
                <span className="font-semibold text-emerald-500">85 Mbps</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/50 dark:border-gray-700/50">
                <span className="text-gray-600 dark:text-gray-300">Satisfação do Cliente</span>
                <span className="font-semibold text-blue-500">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Tempo Médio de Suporte</span>
                <span className="font-semibold text-amber-500">2.5h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
