import React, { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  WifiIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Connection {
  radacctid: number;
  username: string;
  nasipaddress: string;
  nasportid: string;
  acctstarttime: string;
  acctstoptime: string | null;
  acctinputoctets: number;
  acctoutputoctets: number;
  acctterminatecause: string;
  framedipaddress: string;
  callingstationid: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  recordsPerPage: number;
}

interface ConsumptionData {
  date: string;
  upload_gb: number;
  download_gb: number;
}

export default function Rede() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 10
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down'>('all');
  const [nasIpFilter, setNasIpFilter] = useState<string>('all');
  const [allNasIps, setAllNasIps] = useState<string[]>([]);
  const [concentratorStats, setConcentratorStats] = useState<{[key: string]: number}>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  const [showModal, setShowModal] = useState(false);

  const fetchConcentratorStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/concentrator-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch concentrator stats');
      }
      const data = await response.json();
      console.log('Raw concentrator stats:', data); // Debug log
      
      const stats: {[key: string]: number} = {};
      data.forEach((item: { nasipaddress: string; user_count: number }) => {
        console.log('Processing concentrator:', item); // Debug log
        stats[item.nasipaddress] = parseInt(item.user_count);
      });
      
      console.log('Processed concentrator stats:', stats); // Debug log
      setConcentratorStats(stats);
    } catch (err) {
      console.error('Error fetching concentrator stats:', err);
    }
  };

  const fetchConnections = async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching connections with:', { page, search, statusFilter, nasIpFilter });
      const url = new URL('http://localhost:3001/api/connections');
      url.searchParams.set('page', page.toString());
      url.searchParams.set('search', search);
      url.searchParams.set('status', statusFilter);
      url.searchParams.set('nasip', nasIpFilter);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      const data = await response.json();
      console.log('Raw server response:', data);
      setConnections(data.data);
      setPagination(data.pagination);

      // Update the list of all unique NAS IPs only on initial load or refresh
      if (nasIpFilter === 'all' && page === 1 && !search) {
        const ips = Array.from(new Set(data.data.map((conn: Connection) => conn.nasipaddress))).sort();
        setAllNasIps(ips);
        
        // Update concentrator stats
        await fetchConcentratorStats();
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserConsumption = async (username: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/user-consumption/${username}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user consumption');
      }
      const data = await response.json();
      console.log('Consumption data:', data);
      
      // Encontrar o valor máximo entre upload e download
      const maxValue = data.reduce((max, item) => {
        const currentMax = Math.max(item.upload_gb || 0, item.download_gb || 0);
        return Math.max(max, currentMax);
      }, 0);
      
      console.log('Maximum value:', maxValue);
      setConsumptionData(data);
      setSelectedUser(username);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching user consumption:', err);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    fetchConnections(1, value); // Reset to first page when searching
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as 'all' | 'up' | 'down';
    setStatusFilter(newStatus);
    fetchConnections(1, searchTerm); // Reset to first page when changing status
  };

  const handleNasIpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newNasIp = e.target.value;
    setNasIpFilter(newNasIp);
    fetchConnections(1, searchTerm); // Reset to first page when changing NAS IP
  };

  useEffect(() => {
    fetchConnections(pagination.currentPage, searchTerm);
  }, [pagination.currentPage, searchTerm, statusFilter, nasIpFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Não atualizar se o modal estiver aberto
      if (!showModal) {
        fetchConcentratorStats();
      }
    }, 30000);
    
    // Fetch inicial apenas se o modal não estiver aberto
    if (!showModal) {
      fetchConcentratorStats();
    }
    
    return () => clearInterval(interval);
  }, [showModal]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, currentPage: newPage });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const getConnectionStatus = (connection: Connection) => {
    // A connection is DOWN if it has an acctstoptime (end time)
    return connection.acctstoptime ? 'down' : 'up';
  };

  const getRowBackgroundColor = (connection: Connection) => {
    return 'bg-white'; // Return default white background
  };

  const filteredConnections = connections.filter(conn => {
    // Log connection details for debugging
    console.log('Connection:', {
      username: conn.username,
      acctstoptime: conn.acctstoptime,
      isDown: Boolean(conn.acctstoptime),
      currentFilter: statusFilter
    });

    // Search filter
    const matchesSearch = 
      conn.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conn.framedipaddress.includes(searchTerm) ||
      conn.nasipaddress.includes(searchTerm);
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const isDown = conn.acctstoptime !== null && conn.acctstoptime !== undefined && conn.acctstoptime !== '';
      if (statusFilter === 'up') {
        matchesStatus = !isDown;
      } else if (statusFilter === 'down') {
        matchesStatus = isDown;
      }
    }

    // NAS IP filter
    let matchesNasIp = true;
    if (nasIpFilter !== 'all') {
      matchesNasIp = conn.nasipaddress === nasIpFilter;
    }

    // Log filter result
    console.log('Filter result:', {
      username: conn.username,
      matchesSearch,
      matchesStatus,
      matchesNasIp,
      willShow: matchesSearch && matchesStatus && matchesNasIp
    });

    return matchesSearch && matchesStatus && matchesNasIp;
  });

  // Log filtered results
  console.log('Total connections:', connections.length);
  console.log('Filtered connections:', filteredConnections.length);
  console.log('Current status filter:', statusFilter);
  console.log('Current NAS IP filter:', nasIpFilter);

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <WifiIcon className="h-8 w-8 text-blue-500 mr-2" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Conexões
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Visualize o histórico de conexões dos clientes
        </p>
      </div>

      {/* Concentrator Stats Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allNasIps.map((nasip) => (
            <div
              key={nasip}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Concentrador</h3>
                  <p className="text-gray-600 dark:text-gray-300">{nasip}</p>
                  <p className="mt-2">
                    <span className="font-bold text-gray-900 dark:text-white text-xl">
                      {concentratorStats[nasip] || 0}
                    </span>{' '}
                    <span className="text-gray-600 dark:text-gray-300">
                      usuários
                    </span>
                  </p>
                </div>
                <div className="text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por usuário, IP ou NAS..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
              value={searchTerm}
              onChange={handleSearch}
            />
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="font-medium text-gray-700 dark:text-gray-300">Status:</label>
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                className="p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
              >
                <option value="all">Todos</option>
                <option value="up">UP</option>
                <option value="down">DOWN</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-medium text-gray-700 dark:text-gray-300">Concentrador:</label>
              <select
                value={nasIpFilter}
                onChange={handleNasIpChange}
                className="p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
              >
                <option value="all">Todos</option>
                {allNasIps.map((ip) => (
                  <option key={ip} value={ip}>{ip}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchConnections(pagination.currentPage, searchTerm)}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center transition duration-150 ease-in-out shadow-sm"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-xl shadow-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">IP Cliente</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Concentrador</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Início</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Fim</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">MAC</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                  {filteredConnections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma conexão encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredConnections.map((conn, index) => (
                      <tr 
                        key={index} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => fetchUserConsumption(conn.username)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          <span>{conn.username}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            getConnectionStatus(conn) === 'up' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {getConnectionStatus(conn) === 'up' ? 'UP' : 'DOWN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{conn.framedipaddress}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{conn.nasipaddress}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatDate(conn.acctstarttime)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatDate(conn.acctstoptime)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{conn.callingstationid}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando {((pagination.currentPage - 1) * pagination.recordsPerPage) + 1} até{' '}
                {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)} de{' '}
                {pagination.totalRecords} registros
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Consumo de Dados - {selectedUser}
            </h2>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={consumptionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'currentColor' }}
                    className="text-gray-600 dark:text-gray-300"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    tickMargin={25}
                    tickFormatter={(value) => {
                      if (!value) return '';
                      try {
                        const date = new Date(value);
                        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                      } catch (err) {
                        return value;
                      }
                    }}
                  />
                  <YAxis 
                    tick={{ fill: 'currentColor' }}
                    className="text-gray-600 dark:text-gray-300"
                    label={{ 
                      value: 'GB', 
                      angle: -90, 
                      position: 'insideLeft',
                      fill: 'currentColor',
                      offset: -5
                    }}
                    domain={[0, dataMax => Math.max(1, Math.ceil(dataMax * 1.2))]}
                    allowDataOverflow={false}
                    padding={{ top: 20, bottom: 20 }}
                    tickCount={8}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid #ccc',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => {
                      if (typeof value === 'number') {
                        return `${value.toFixed(2)} GB`;
                      }
                      return value;
                    }}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      try {
                        const date = new Date(label);
                        return date.toLocaleDateString('pt-BR');
                      } catch (err) {
                        return label;
                      }
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    wrapperStyle={{
                      paddingTop: '10px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="upload_gb" 
                    name="Upload (GB)"
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={true}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="download_gb" 
                    name="Download (GB)"
                    stroke="#16a34a" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
