import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabaseClient';
import { AgendaEvent } from '../../types/agenda';

interface VisitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AgendaEvent;
  onVisitaRegistered: () => void;
}

interface ClienteInfo {
  nome: string;
  pppoe: string;
}

export function VisitaModal({ isOpen, onClose, event, onVisitaRegistered }: VisitaModalProps) {
  const [acompanhante, setAcompanhante] = useState('');
  const [relato, setRelato] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clienteInfo, setClienteInfo] = useState<ClienteInfo | null>(null);

  useEffect(() => {
    if (event?.pppoe) {
      loadClienteInfo();
    }
  }, [event]);

  const loadClienteInfo = async () => {
    try {
      const { data: contratoData, error: contratoError } = await supabase
        .from('contratos')
        .select('id, pppoe, id_cliente')
        .eq('pppoe', event.pppoe)
        .single();

      if (contratoError) throw contratoError;

      if (contratoData) {
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('nome')
          .eq('id', contratoData.id_cliente)
          .single();

        if (clienteError) throw clienteError;

        if (clienteData) {
          setClienteInfo({
            nome: clienteData.nome,
            pppoe: contratoData.pppoe
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar informações do cliente:', error);
      toast.error('Erro ao carregar informações do cliente');
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Buscar ID do contrato
      const { data: contratoData, error: contratoError } = await supabase
        .from('contratos')
        .select('id')
        .eq('pppoe', event.pppoe)
        .single();

      if (contratoError) throw contratoError;

      // Registrar a visita
      const { error: visitaError } = await supabase
        .from('visitas')
        .insert({
          acompanhante,
          relato,
          data: event.datainicio,
          id_agenda: event.id,
          id_contrato: contratoData.id
        });

      if (visitaError) throw visitaError;

      // Marcar o evento como realizado
      const { error: agendaError } = await supabase
        .from('agenda')
        .update({ realizada: true })
        .eq('id', event.id);

      if (agendaError) throw agendaError;

      toast.success('Visita registrada com sucesso');
      onVisitaRegistered();
      onClose();
    } catch (error) {
      console.error('Erro ao registrar visita:', error);
      toast.error('Erro ao registrar visita');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Registrar Visita
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          {clienteInfo && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cliente
                </label>
                <p className="mt-1 text-sm text-gray-900">{clienteInfo.nome}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PPPoE
                </label>
                <p className="mt-1 text-sm text-gray-900">{clienteInfo.pppoe}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Acompanhante
            </label>
            <input
              type="text"
              value={acompanhante}
              onChange={(e) => setAcompanhante(e.target.value)}
              placeholder="Nome de quem acompanhou a visita"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Relato
            </label>
            <textarea
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              placeholder="Descreva o que foi feito durante a visita"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !acompanhante || !relato}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isLoading || !acompanhante || !relato
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? 'Registrando...' : 'Registrar Visita'}
          </button>
        </div>
      </div>
    </div>
  );
}
