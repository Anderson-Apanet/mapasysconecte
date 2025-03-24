import React, { useState, useEffect } from 'react';
import { LockOpenIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { Caixa, CaixaStatus } from '../types/caixa';
import { format } from 'date-fns';

interface GerenciamentoCaixaProps {
  onStatusChange: (status: CaixaStatus) => void;
}

export default function GerenciamentoCaixa({ onStatusChange }: GerenciamentoCaixaProps) {
  const [caixaStatus, setCaixaStatus] = useState<CaixaStatus>({
    isOpen: false,
    caixaAtual: null
  });
  const [loading, setLoading] = useState(true);

  // Busca o caixa atual (aberto) do usuário
  const fetchCaixaAtual = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Usuário não autenticado');
        return;
      }

      console.log('Buscando caixa para o usuário:', session.user.id);
      
      const { data: caixas, error } = await supabase
        .from('caixas')
        .select('*')
        .eq('id_usuario', session.user.id)
        .is('horario_fechamento', null)
        .order('horario_abertura', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar caixa:', error);
        throw error;
      }

      // Verifica se há algum caixa aberto
      const caixaAberto = caixas && caixas.length > 0 ? caixas[0] : null;
      
      const newStatus = {
        isOpen: !!caixaAberto,
        caixaAtual: caixaAberto
      };

      console.log('Status do caixa:', newStatus);
      setCaixaStatus(newStatus);
      onStatusChange(newStatus);
    } catch (error) {
      console.error('Erro ao buscar caixa:', error);
      toast.error('Erro ao verificar status do caixa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaixaAtual();

    // Configura o fechamento automático às 22h
    const checkAutoClose = () => {
      const now = new Date();
      if (now.getHours() >= 22 && caixaStatus.isOpen) {
        handleCloseCaixa(true);
      }
    };

    const timer = setInterval(checkAutoClose, 60000); // Verifica a cada minuto

    return () => clearInterval(timer);
  }, []);

  const handleOpenCaixa = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Usuário não autenticado');
        return;
      }

      console.log('Abrindo caixa para o usuário:', session.user.id);
      
      // Buscar o ID da empresa do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('empresa_id')
        .eq('id_user', session.user.id)
        .single();
        
      if (userError) {
        console.error('Erro ao buscar empresa do usuário:', userError);
        throw userError;
      }
      
      const empresaId = userData?.empresa_id;
      console.log('ID da empresa do usuário:', empresaId);
      
      const { data: novoCaixa, error } = await supabase
        .from('caixas')
        .insert([
          {
            id_usuario: session.user.id,
            horario_abertura: new Date().toISOString(),
            empresa_id: empresaId // Adiciona o ID da empresa do usuário
          }
        ])
        .select();

      if (error) {
        console.error('Erro ao abrir caixa:', error);
        throw error;
      }

      if (!novoCaixa || novoCaixa.length === 0) {
        throw new Error('Não foi possível criar o caixa');
      }

      const newStatus = {
        isOpen: true,
        caixaAtual: novoCaixa[0]
      };
      
      console.log('Caixa aberto:', newStatus);
      setCaixaStatus(newStatus);
      onStatusChange(newStatus);
      toast.success('Caixa aberto com sucesso!');
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      toast.error('Erro ao abrir caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCaixa = async (isAutomatic: boolean = false) => {
    if (!caixaStatus.caixaAtual) return;

    try {
      setLoading(true);
      console.log('Fechando caixa:', caixaStatus.caixaAtual.id);
      
      const { error } = await supabase
        .from('caixas')
        .update({
          horario_fechamento: new Date().toISOString()
        })
        .eq('id', caixaStatus.caixaAtual.id);

      if (error) {
        console.error('Erro ao fechar caixa:', error);
        throw error;
      }

      const newStatus = {
        isOpen: false,
        caixaAtual: null
      };
      
      console.log('Caixa fechado com sucesso');
      setCaixaStatus(newStatus);
      onStatusChange(newStatus);
      
      if (!isAutomatic) {
        toast.success('Caixa fechado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      toast.error('Erro ao fechar caixa');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600 mb-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Status do Caixa
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {caixaStatus.isOpen ? (
              <>
                Aberto em{' '}
                {format(new Date(caixaStatus.caixaAtual!.horario_abertura), "dd/MM/yyyy 'às' HH:mm")}
              </>
            ) : (
              'Fechado'
            )}
          </p>
        </div>
        <div>
          {caixaStatus.isOpen ? (
            <button
              onClick={() => handleCloseCaixa()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              disabled={loading}
            >
              <LockClosedIcon className="h-5 w-5 mr-2" />
              Fechar Caixa
            </button>
          ) : (
            <button
              onClick={handleOpenCaixa}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              disabled={loading}
            >
              <LockOpenIcon className="h-5 w-5 mr-2" />
              Abrir Caixa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
