import React, { useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

interface Plano {
  id: number;
  nome: string;
  velocidade: string;
  valor: number;
  descricao: string;
  ativo: boolean;
}

const MOCK_PLANOS: Plano[] = [
  {
    id: 1,
    nome: 'Plano Básico',
    velocidade: '50 Mbps',
    valor: 79.90,
    descricao: 'Internet fibra óptica com velocidade de 50 Mbps',
    ativo: true
  },
  {
    id: 2,
    nome: 'Plano Intermediário',
    velocidade: '100 Mbps',
    valor: 99.90,
    descricao: 'Internet fibra óptica com velocidade de 100 Mbps',
    ativo: true
  },
  {
    id: 3,
    nome: 'Plano Premium',
    velocidade: '200 Mbps',
    valor: 149.90,
    descricao: 'Internet fibra óptica com velocidade de 200 Mbps',
    ativo: true
  }
];

export default function Planos() {
  const [planos, setPlanos] = useState<Plano[]>(MOCK_PLANOS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtra os planos baseado no termo de busca
  const filteredPlanos = planos.filter(plano =>
    plano.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plano.velocidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Planos de Internet</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Gerencie os planos de internet disponíveis no sistema.
        </p>
      </div>

      {/* Search and Add Plan */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex-1 w-full sm:max-w-xs">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar planos..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Novo Plano</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Velocidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {filteredPlanos.map((plano) => (
                <tr key={plano.id} className="hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{plano.nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{plano.velocidade}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {plano.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      plano.ativo 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                    }`}>
                      {plano.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        // TODO: Implementar edição
                      }}
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mr-4 transition-colors duration-150"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implementar exclusão
                      }}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-150"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
