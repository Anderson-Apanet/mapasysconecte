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
import Layout from '../components/Layout';

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

interface ConcentratorStats {
  nasname: string;
  shortname: string;
  type: string;
  ports: number;
  description: string;
  user_count: number;
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
  const [concentrators, setConcentrators] = useState<ConcentratorStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  const [connectionHistory, setConnectionHistory] = useState<Connection[]>([]);
  const [showModal, setShowModal] = useState(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

  const fetchConnections = async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching connections with:', { page, search, statusFilter, nasIpFilter });
      
      // Construir a URL corretamente
      const url = `${window.location.origin}${baseUrl}/support/connections`;
      const searchParams = new URLSearchParams({
        page: page.toString(),
        search: search || '',
        status: statusFilter,
        nasip: nasIpFilter
      });

      const response = await fetch(`${url}?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch connections: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Raw server response:', data);
      setConnections(data.data || []); 
      setPagination(data.pagination);

      // Update the list of all unique NAS IPs only on initial load or refresh
      if (nasIpFilter === 'all' && page === 1 && !search) {
        const ips = Array.from(new Set((data.data || []).map((conn: Connection) => conn.nasipaddress))).sort();
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

  const fetchConcentratorStats = async () => {
    try {
      const url = `${window.location.origin}${baseUrl}/concentrator-stats`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch concentrator stats');
      }
      const data = await response.json();
      console.log('Dados dos concentradores:', data);
      setConcentrators(data);
      
      // Atualiza a lista de IPs dos concentradores para o filtro
      const ips = data.map((concentrator: ConcentratorStats) => concentrator.nasname);
      setAllNasIps(ips);
    } catch (err) {
      console.error('Error fetching concentrator stats:', err);
    }
  };

  const handleUserClick = async (username: string) => {
    try {
      setSelectedUser(username);
      setShowModal(true);
      
      // Busca os dados de consumo e histórico em paralelo
      const baseUrlWithOrigin = `${window.location.origin}${baseUrl}`;
      const [consumptionResponse, historyResponse] = await Promise.all([
        fetch(`${baseUrlWithOrigin}/user-consumption/${username}`),
        fetch(`${baseUrlWithOrigin}/support/connections/user/${username}/history`)
      ]);

      if (!consumptionResponse.ok) {
        throw new Error('Erro ao buscar dados de consumo');
      }
      if (!historyResponse.ok) {
        throw new Error('Erro ao buscar histórico de conexões');
      }

      const consumptionData = await consumptionResponse.json();
      const historyData = await historyResponse.json();

      setConsumptionData(consumptionData);
      setConnectionHistory(historyData.data || []);
    } catch (err) {
      console.error('Erro ao buscar dados do usuário:', err);
      // toast.error('Erro ao buscar dados do usuário');
    }
  };

  const fetchUserConnectionHistory = async (username: string) => {
    try {
      const baseUrlWithOrigin = `${window.location.origin}${baseUrl}`;
      const response = await fetch(`${baseUrlWithOrigin}/support/connections/user/${username}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch user connection history');
      }
      const data = await response.json();
      setConnectionHistory(data.data || []); 
    } catch (err) {
      console.error('Error fetching user connection history:', err);
      setConnectionHistory([]); 
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
    return 'hover:bg-gray-50 dark:hover:bg-gray-700'; // Add dark mode hover state
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
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center mb-2">
              <WifiIcon className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-2" />
              <h1 className="text-3xl font-bold text-white">
                Conexões
              </h1>
            </div>
            <p className="text-white">
              Visualize o histórico de conexões dos clientes
            </p>
          </div>

          {/* Cards dos Concentradores */}
          <div className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {concentrators
                .filter(concentrator => 
                  concentrator.nasname !== 'localhost' && 
                  concentrator.nasname !== '127.0.0.1'
                )
                .map((concentrator) => (
                <div
                  key={concentrator.nasname}
                  className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {concentrator.shortname || 'Concentrador'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {concentrator.nasname}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {concentrator.description || 'Sem descrição'}
                      </p>
                      <p className="mt-2">
                        <span className="font-bold text-gray-900 dark:text-white text-xl">
                          {concentrator.user_count}
                        </span>{' '}
                        <span className="text-gray-600 dark:text-gray-300">
                          usuários
                        </span>
                      </p>
                      {concentrator.ports && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Portas: {concentrator.ports}
                        </p>
                      )}
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

          <div className="mb-6 bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
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
            <div>
              <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
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
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${getRowBackgroundColor(conn)}`}
                            onClick={() => handleUserClick(conn.username)}
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
              <div className="mt-6 bg-white dark:bg-gray-700 rounded-xl shadow-lg p-4 border border-gray-100 dark:border-gray-700">
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
            </div>
          )}
          {showModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Detalhes do Usuário: {selectedUser}</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Gráfico de Consumo</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={consumptionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="download_gb" stroke="#8884d8" name="Download (GB)" />
                        <Line type="monotone" dataKey="upload_gb" stroke="#82ca9d" name="Upload (GB)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Últimas 10 Conexões</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-2 border">Início</th>
                          <th className="px-4 py-2 border">Fim</th>
                          <th className="px-4 py-2 border">Download</th>
                          <th className="px-4 py-2 border">Upload</th>
                          <th className="px-4 py-2 border">IP</th>
                          <th className="px-4 py-2 border">Causa Término</th>
                        </tr>
                      </thead>
                      <tbody>
                        {connectionHistory.map((conn) => (
                          <tr key={conn.radacctid} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border">{new Date(conn.acctstarttime).toLocaleString()}</td>
                            <td className="px-4 py-2 border">
                              {conn.acctstoptime ? new Date(conn.acctstoptime).toLocaleString() : 'Ativo'}
                            </td>
                            <td className="px-4 py-2 border">
                              {(conn.acctinputoctets / (1024 * 1024 * 1024)).toFixed(2)} GB
                            </td>
                            <td className="px-4 py-2 border">
                              {(conn.acctoutputoctets / (1024 * 1024 * 1024)).toFixed(2)} GB
                            </td>
                            <td className="px-4 py-2 border">{conn.framedipaddress}</td>
                            <td className="px-4 py-2 border">{conn.acctterminatecause || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
