import React, { useState } from 'react';
import { formatDate } from '../utils/formatDate';
import { CalendarIcon, ClockIcon, UserIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface Tecnico {
  id: string;
  nome: string;
}

interface Visita {
  id: number;
  created_at: string;
  data: string;
  relato: string;
  acompanhante?: string;
  id_contrato: number;
  tecnicos?: Tecnico[];
}

interface Agendamento {
  id: number;
  nome: string;
  descricao: string;
  datainicio: string;
  datafinal: string;
  pppoe: string;
  tipo_evento: string;
  realizada: boolean;
  cancelado: boolean;
  responsaveis?: { user_id: string; nome?: string }[];
}

interface VisitasAgendamentosProps {
  visitas: Visita[];
  agendamentos: Agendamento[];
  isLoading: boolean;
}

const VisitasAgendamentos: React.FC<VisitasAgendamentosProps> = ({ 
  visitas, 
  agendamentos, 
  isLoading 
}) => {
  const [activeTab, setActiveTab] = useState<'visitas' | 'agendamentos'>('visitas');

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('visitas')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'visitas'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Visitas Técnicas
          </button>
          <button
            onClick={() => setActiveTab('agendamentos')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'agendamentos'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Agendamentos
          </button>
        </nav>
      </div>

      {/* Conteúdo da tab ativa */}
      {activeTab === 'visitas' ? (
        <div>
          {visitas.length > 0 ? (
            <div className="space-y-4">
              {visitas.map(visita => (
                <div key={visita.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">
                        <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Visita Técnica
                        </h3>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                          <span>{visita.data ? formatDate(visita.data) : 'Data não informada'}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {visita.id}
                    </span>
                  </div>

                  {visita.relato && (
                    <div className="mb-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{visita.relato}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visita.acompanhante && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Acompanhante:</span> {visita.acompanhante}
                      </div>
                    )}
                    
                    {visita.tecnicos && visita.tecnicos.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Técnicos:</span> {visita.tecnicos.map(t => t.nome || 'Técnico').join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-700 dark:text-yellow-400">
              Nenhuma visita técnica registrada para este cliente.
            </div>
          )}
        </div>
      ) : (
        <div>
          {agendamentos.length > 0 ? (
            <div className="space-y-4">
              {agendamentos.map(agendamento => (
                <div key={agendamento.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">
                        <CalendarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white mr-2">
                            {agendamento.nome || 'Sem título'}
                          </h3>
                          {agendamento.realizada ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          ) : agendamento.cancelado ? (
                            <XCircleIcon className="h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <ClockIcon className="h-3.5 w-3.5 mr-1" />
                          <span>
                            {agendamento.datainicio ? formatDate(agendamento.datainicio) : 'Data não informada'} 
                            {agendamento.datafinal && agendamento.datafinal !== agendamento.datainicio 
                              ? ` - ${formatDate(agendamento.datafinal)}` 
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {agendamento.tipo_evento || 'Evento'}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        PPPoE: {agendamento.pppoe || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {agendamento.descricao && (
                    <div className="mb-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{agendamento.descricao}</p>
                    </div>
                  )}

                  {agendamento.responsaveis && agendamento.responsaveis.length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Responsáveis:</span> {agendamento.responsaveis.map(r => r.nome || 'Usuário').join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-700 dark:text-yellow-400">
              Nenhum agendamento registrado para este cliente.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisitasAgendamentos;
