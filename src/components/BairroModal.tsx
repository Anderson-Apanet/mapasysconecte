import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

interface Bairro {
  id: number;
  nome: string;
  cidade: string;
  created_at?: string;
}

interface BairroModalProps {
  isOpen: boolean;
  onClose: () => void;
  bairro?: Bairro | null;
  onSave: () => void;
}

const BairroModal: React.FC<BairroModalProps> = ({ isOpen, onClose, bairro, onSave }) => {
  const [formData, setFormData] = useState<Omit<Bairro, 'id' | 'created_at'>>({
    nome: '',
    cidade: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bairro) {
      setFormData({
        nome: bairro.nome,
        cidade: bairro.cidade
      });
    } else {
      setFormData({
        nome: '',
        cidade: ''
      });
    }
  }, [bairro]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (bairro?.id) {
        // Atualização
        const { data: updateData, error: updateError } = await supabase
          .from('bairros')
          .update({
            nome: formData.nome,
            cidade: formData.cidade
          })
          .eq('id', bairro.id);

        if (updateError) {
          console.error('Erro na atualização:', updateError);
          throw updateError;
        }
      } else {
        // Inserção
        console.log('Tentando inserir:', formData);
        
        const { data, error: insertError } = await supabase
          .from('bairros')
          .insert([{  // Usando array conforme documentação do Supabase
            nome: formData.nome,
            cidade: formData.cidade
          }])
          .select();  // Adicionando select para retornar o registro inserido

        if (insertError) {
          console.error('Erro detalhado na inserção:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          throw new Error(`Falha ao inserir bairro: ${insertError.message || 'Erro desconhecido'}`);
        }

        console.log('Registro inserido:', data);
      }

      toast.success(bairro?.id ? 'Bairro atualizado com sucesso!' : 'Bairro criado com sucesso!');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erro completo:', error);
      const errorMessage = error.message || (error.error?.message) || 'Erro desconhecido ao salvar bairro';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel 
          className="mx-auto max-w-md w-full rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
              {bairro ? 'Editar Bairro' : 'Novo Bairro'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do Bairro
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cidade
              </label>
              <input
                type="text"
                id="cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default BairroModal;
