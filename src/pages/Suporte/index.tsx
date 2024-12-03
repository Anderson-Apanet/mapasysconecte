import React, { useState } from 'react';
import { 
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid';

interface Ticket {
  id: number;
  cliente: string;
  assunto: string;
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
  prioridade: 'baixa' | 'media' | 'alta';
  data_abertura: string;
  ultima_atualizacao: string;
}

export default function Suporte() {
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 1,
      cliente: "João Silva",
      assunto: "Conexão Instável",
      status: "aberto",
      prioridade: "alta",
      data_abertura: "2024-01-15",
      ultima_atualizacao: "2024-01-15"
    },
    {
      id: 2,
      cliente: "Maria Santos",
      assunto: "Instalação de Equipamento",
      status: "em_andamento",
      prioridade: "media",
      data_abertura: "2024-01-14",
      ultima_atualizacao: "2024-01-15"
    },
    {
      id: 3,
      cliente: "Pedro Oliveira",
      assunto: "Alteração de Plano",
      status: "resolvido",
      prioridade: "baixa",
      data_abertura: "2024-01-13",
      ultima_atualizacao: "2024-01-15"
    }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Cabeçalho elegante */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Suporte
              </h1>
              <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-blue-600/20 to-transparent"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">
            Central de Atendimento e Suporte Técnico
          </p>
        </div>

        {/* Ações e Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-400/20 dark:shadow-gray-700/20 backdrop-blur-xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Botão Novo Chamado */}
            <div className="lg:col-span-1">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Chamado
              </button>
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-4 pr-8 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-700 dark:text-gray-300"
              >
                <option value="todos">Todos os Status</option>
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="resolvido">Resolvido</option>
                <option value="fechado">Fechado</option>
              </select>
            </div>

            {/* Busca */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por cliente, assunto ou número do chamado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Chamados */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.24)] backdrop-blur-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Chamados
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <ClockIcon className="h-5 w-5" />
                <span>Atualizado há 5 minutos</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assunto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prioridade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data Abertura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Última Atualização</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center py-6">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-lg font-medium">Nenhum chamado encontrado</p>
                        <p className="text-sm">Crie um novo chamado ou ajuste seus filtros de busca</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        #{ticket.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.cliente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.assunto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ticket.status === 'aberto'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                            : ticket.status === 'em_andamento'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                            : ticket.status === 'resolvido'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                        }`}>
                          <span className={`h-2 w-2 rounded-full mr-1.5 ${
                            ticket.status === 'aberto'
                              ? 'bg-yellow-400'
                              : ticket.status === 'em_andamento'
                              ? 'bg-blue-400'
                              : ticket.status === 'resolvido'
                              ? 'bg-green-400'
                              : 'bg-red-400'
                          }`}></span>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ticket.prioridade === 'baixa'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                            : ticket.prioridade === 'media'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                        }`}>
                          {ticket.prioridade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.data_abertura}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ticket.ultima_atualizacao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                          Editar
                        </button>
                        <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
