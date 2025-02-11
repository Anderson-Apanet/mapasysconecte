import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabaseClient';
import { AgendaEvent } from '../../types/agenda';
import { saveEvent } from '../../services/agenda';
import { format } from 'date-fns';
import Modal from '../Modal';

interface VisitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AgendaEvent;
}

export default function VisitaModal({ isOpen, onClose, event }: VisitaModalProps) {
  const [loading, setLoading] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [acompanhante, setAcompanhante] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Atualiza o evento como realizado
      await saveEvent({
        ...event,
        realizada: true
      });

      // Busca o ID do contrato pelo PPPoE
      let id_contrato = null;
      if (event.pppoe) {
        const { data: contrato, error: contratoError } = await supabase
          .from('contratos')
          .select('id')
          .eq('pppoe', event.pppoe)
          .single();

        if (contratoError) {
          console.error('Erro ao buscar contrato:', contratoError);
        } else if (contrato) {
          id_contrato = contrato.id;
        }
      }

      // Registra a visita
      const { data: visita, error: visitaError } = await supabase
        .from('visitas')
        .insert({
          id_agenda: event.id,
          data: event.datainicio,
          relato: observacao,
          acompanhante: acompanhante || null,
          id_contrato: id_contrato
        })
        .select()
        .single();

      if (visitaError) throw visitaError;

      // Registra os técnicos responsáveis
      if (event.responsaveis && event.responsaveis.length > 0) {
        const tecnicosInsert = event.responsaveis.map(resp => ({
          visita_id: visita.id,
          tecnico_id: resp.id
        }));

        const { error: tecnicosError } = await supabase
          .from('visitas_tecnicos')
          .insert(tecnicosInsert);

        if (tecnicosError) throw tecnicosError;
      }

      toast.success('Visita registrada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao registrar visita:', error);
      toast.error('Erro ao registrar visita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Registrar Visita
        </h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Nome:</strong> {event.nome}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Data:</strong> {format(new Date(event.datainicio), 'dd/MM/yyyy HH:mm')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Responsáveis:</strong>{' '}
            {event.responsaveis?.map(resp => resp.nome).join(', ') || 'Nenhum responsável definido'}
          </p>
          {event.descricao && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Descrição:</strong> {event.descricao}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="acompanhante" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Acompanhante
            </label>
            <input
              type="text"
              id="acompanhante"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={acompanhante}
              onChange={(e) => setAcompanhante(e.target.value)}
              placeholder="Nome de quem acompanhou a visita"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              id="observacao"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={4}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              required
            />
          </div>

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Visita'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
