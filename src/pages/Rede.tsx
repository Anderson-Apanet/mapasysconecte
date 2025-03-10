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

export default function Rede() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 10
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down'>('all');
  const [nasIpFilter, setNasIpFilter] = useState<string>('all');
  const [allNasIps, setAllNasIps] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  const [connectionHistory, setConnectionHistory] = useState<Connection[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Usar a URL base correta dependendo do ambiente
  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  
  // Log para depuração
  console.log('API URL configuration:', { 
    baseUrl, 
    apiUrl, 
    env: import.meta.env.MODE,
    viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    windowOrigin: window.location.origin
  });

  const fetchConnections = async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching connections with:', { page, search, statusFilter, nasIpFilter });
      
      // Construir a URL corretamente
      const url = `${apiUrl}/support/connections`;
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
        setAllNasIps(ips as string[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`${error}`);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (username: string) => {
    setSelectedUser(username);
    setShowModal(true);
    
    try {
      // Buscar histórico de conexões do usuário
      console.log(`Fetching connection history for user: ${username}`);
      
      // Tenta primeiro o endpoint de desenvolvimento
      let response;
      let data;
      let success = false;
      
      try {
        response = await fetch(`${apiUrl}/support/connections/user/${username}/history`);
        if (response.ok) {
          data = await response.json();
          if (data && data.data) {
            success = true;
          }
        }
      } catch (devError) {
        console.log("Endpoint de desenvolvimento falhou, tentando endpoint de produção:", devError);
      }
      
      // Se o primeiro endpoint falhar, tenta o endpoint de produção
      if (!success) {
        try {
          response = await fetch(`${apiUrl}/connection-history/${username}`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error response from server: ${response.status} - ${errorText}`);
            throw new Error(`Falha ao buscar histórico de conexões: ${response.status}`);
          }
          
          data = await response.json();
          console.log("Connection history data from production endpoint:", data);
          
          if (!data || (!data.data && !data.connections)) {
            console.error("Invalid data format received:", data);
            throw new Error("Formato de dados inválido recebido do servidor");
          }
          
          // Normaliza o formato dos dados
          if (data.connections && !data.data) {
            data.data = data.connections;
          }
        } catch (prodError) {
          console.error("Ambos endpoints falharam:", prodError);
          throw prodError;
        }
      }
      
      console.log("Final connection history data:", data);
      setConnectionHistory(data.data || []);
      
      // Processar dados de consumo para o gráfico
      if (data.data && data.data.length > 0) {
        const consumptionByDay = data.data.reduce((acc: Record<string, { upload: number, download: number }>, conn: Connection) => {
          const date = new Date(conn.acctstarttime).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { upload: 0, download: 0 };
          }
          
          // Converter bytes para GB
          acc[date].upload += conn.acctoutputoctets / (1024 * 1024 * 1024);
          acc[date].download += conn.acctinputoctets / (1024 * 1024 * 1024);
          
          return acc;
        }, {});
        
        const chartData = Object.keys(consumptionByDay).map(date => ({
          date,
          upload_gb: parseFloat(consumptionByDay[date].upload.toFixed(2)),
          download_gb: parseFloat(consumptionByDay[date].download.toFixed(2))
        }));
        
        setConsumptionData(chartData);
      } else {
        console.log("No connection data available for chart");
        setConsumptionData([]);
      }
    } catch (error) {
      console.error('Error fetching user connection history:', error);
      setConnectionHistory([]);
      setConsumptionData([]);
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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, currentPage: newPage });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('pt-BR');
  };

  const getConnectionStatus = (connection: Connection) => {
    return connection.acctstoptime ? 'down' : 'up';
  };

  const getRowClass = (connection: Connection) => {
    const isActive = !connection.acctstoptime;
    if (isActive) {
      return 'bg-green-50 dark:bg-green-900/20'; // Add dark mode background
    }
    return 'hover:bg-gray-50 dark:hover:bg-gray-700'; // Add dark mode hover state
  };

  const filteredConnections = connections.filter((conn) => {
    // Search filter
    let matchesSearch = true;
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch = 
        conn.username.toLowerCase().includes(searchLower) ||
        conn.framedipaddress.toLowerCase().includes(searchLower) ||
        conn.nasipaddress.toLowerCase().includes(searchLower) ||
        conn.callingstationid.toLowerCase().includes(searchLower);
    }

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

    return matchesSearch && matchesStatus && matchesNasIp;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
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
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${getRowClass(conn)}`}
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
