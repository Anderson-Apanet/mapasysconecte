import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Contrato } from '../types/contrato';
import { Plano } from '../types/plano';
import { Bairro } from '../types/bairro';
import { User } from '../types/user';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

interface NovoContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteData: {
    id: number;
    nome: string;
  };
}

interface Plano {
  id: number;
  nome: string;
  valor: number;
}

export default function NovoContratoModal({
  isOpen,
  onClose,
  clienteData,
}: NovoContratoModalProps) {
  const [plano, setPlano] = useState("");
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [tipo, setTipo] = useState("Residencial");
  const [vencimento, setVencimento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [bairros, setBairros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carregar bairros da tabela
    const fetchBairros = async () => {
      const { data: bairrosData, error } = await supabase
        .from('bairros')
        .select('*');
      
      if (error) {
        console.error('Erro ao carregar bairros:', error);
        return;
      }
      
      setBairros(bairrosData || []);
    };

    // Carregar planos da tabela
    const fetchPlanos = async () => {
      const { data: planosData, error } = await supabase
        .from('planos')
        .select('*')
        .order('nome');
      
      if (error) {
        console.error('Erro ao carregar planos:', error);
        return;
      }
      
      setPlanos(planosData || []);
    };

    fetchBairros();
    fetchPlanos();
  }, []);

  const generatePPPoE = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const firstName = clienteData.nome.split(' ')[0].toLowerCase();
    return `${firstName}${year}${month}${day}${hour}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Log dos valores para debug
    console.log('Valores do formulário:', {
      clienteId: clienteData?.id,
      plano,
      tipo,
      vencimento,
      endereco,
      complemento,
      bairro
    });

    if (!clienteData?.id) {
      toast.error('Erro: ID do cliente não encontrado');
      return;
    }

    if (!plano) {
      toast.error('Por favor, selecione um plano');
      return;
    }

    if (!vencimento) {
      toast.error('Por favor, informe o dia do vencimento');
      return;
    }

    setLoading(true);
    try {
      const pppoe = generatePPPoE();
      const senha = pppoe.replace(/[^0-9]/g, '').split('').reverse().join('');

      const contratoData = {
        id_cliente: clienteData.id,
        id_plano: plano,
        pppoe,
        senha,
        status: 'Criado',
        tipo,
        dia_vencimento: parseInt(vencimento),
        endereco,
        complemento,
        id_bairro: bairro || null,
        data_cad_contrato: new Date().toISOString().split('T')[0],
        contratoassinado: false,
        pendencia: false
      };

      console.log('Dados a serem salvos:', contratoData);

      const { error } = await supabase
        .from('contratos')
        .insert([contratoData]);

      if (error) throw error;

      // Busca os dados do plano para obter o radius
      const { data: planoData, error: planoError } = await supabase
        .from('planos')
        .select('radius')
        .eq('id', plano)
        .single();

      if (planoError) {
        console.error('Erro ao buscar dados do plano:', planoError);
      } else if (!planoData.radius) {
        console.error('Plano não tem o campo radius definido');
      } else {
        // Adiciona as credenciais no banco radius
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
          const apiUrl = baseUrl.startsWith('http') ? `${baseUrl}/api` : baseUrl;
          const response = await fetch(`${apiUrl}/support/add-contract-credentials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: contratoData.pppoe,
              password: contratoData.senha,
              groupname: planoData.radius
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao adicionar credenciais no radius:', errorData);
            toast.error('Erro ao adicionar credenciais no radius');
          }
        } catch (error) {
          console.error('Erro ao adicionar credenciais no radius:', error);
          toast.error('Erro ao adicionar credenciais no radius');
        }
      }

      toast.success('Contrato criado com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      toast.error('Erro ao criar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-[60] overflow-y-auto"
      onClose={onClose}
      open={isOpen}
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <Dialog.Title
            as="h3"
            className="text-lg font-medium leading-6 text-gray-900"
          >
            Novo Contrato - {clienteData?.nome}
          </Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Plano
              </label>
              <select
                value={plano}
                onChange={(e) => setPlano(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Selecione um plano</option>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} - R$ {p.valor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dia do Vencimento
              </label>
              <input
                type="text"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Endereço
              </label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Complemento
              </label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bairro
              </label>
              <select
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Selecione um bairro</option>
                {bairros.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
