import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { AgendaEvent } from '../../types/agenda';
import { supabase } from '../../utils/supabaseClient';
import toast from 'react-hot-toast';

interface InstalacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AgendaEvent | null;
  onEventUpdated: () => void;
}

export function InstalacaoModal({ isOpen, onClose, event, onEventUpdated }: InstalacaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [acompanhante, setAcompanhante] = useState('');
  const [relato, setRelato] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    try {
      setLoading(true);

      // Buscar o usuário logado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Se tiver PPPoE, buscar o id do contrato
      let id_contrato = null;
      if (event.pppoe) {
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select('id')
          .eq('pppoe', event.pppoe)
          .single();

        if (contratoError) {
          console.error('Erro ao buscar contrato:', contratoError);
        } else if (contratoData) {
          id_contrato = contratoData.id;
        }
      }

      // Inserir na tabela instalacao
      const { error: instalacaoError } = await supabase
        .from('instalacao')
        .insert({
          id_agenda: event.id,
          data_instalacao: new Date().toISOString(),
          id_contrato: id_contrato,
          id_user: session.user.id,
          acompanhante: acompanhante,
          relato: relato
        });

      if (instalacaoError) throw instalacaoError;

      // Atualizar o evento na agenda como realizado
      const { error: agendaUpdateError } = await supabase
        .from('agenda')
        .update({
          realizada: true,
          parcial: false
        })
        .eq('id', event.id);

      if (agendaUpdateError) throw agendaUpdateError;

      // Se tem PPPoE e id_contrato, atualizar a data de instalação
      if (event.pppoe && id_contrato) {
        const { error: contratoUpdateError } = await supabase
          .from('contratos')
          .update({
            data_instalacao: new Date().toISOString()
          })
          .eq('id', id_contrato);

        if (contratoUpdateError) {
          console.error('Erro ao atualizar data de instalação no contrato:', contratoUpdateError);
        }
      }

      toast.success('Instalação salva com sucesso!');
      onEventUpdated();
      onClose();
      
      // Limpar os campos
      setAcompanhante('');
      setRelato('');
    } catch (error) {
      console.error('Erro ao salvar instalação:', error);
      toast.error('Erro ao salvar instalação');
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
            Registrar Instalação
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cliente
                </label>
                <p className="mt-1 text-sm text-gray-500">{event.nome}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PPPoE
                </label>
                <p className="mt-1 text-sm text-gray-500">{event.pppoe || 'Não informado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Acompanhante
                </label>
                <input
                  type="text"
                  value={acompanhante}
                  onChange={(e) => setAcompanhante(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Relato
                </label>
                <textarea
                  value={relato}
                  onChange={(e) => setRelato(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
