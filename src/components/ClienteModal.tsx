import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Cliente } from '../types/cliente';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: Cliente;
  onSave: () => void;
}

const ClienteModal: React.FC<ClienteModalProps> = ({ isOpen, onClose, cliente, onSave }) => {
  const [formData, setFormData] = useState<Partial<Cliente>>({
    nome: '',
    email: '',
    fonewhats: '',
    logradouro: '',
    nrlogradouro: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    rg: '',
    cpf_cnpj: '',
    datanas: '',
    ponto_referencia: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome || '',
        email: cliente.email || '',
        fonewhats: cliente.fonewhats || '',
        logradouro: cliente.logradouro || '',
        nrlogradouro: cliente.nrlogradouro || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        uf: cliente.uf || '',
        cep: cliente.cep || '',
        rg: cliente.rg || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        datanas: cliente.datanas || '',
        ponto_referencia: cliente.ponto_referencia || '',
      });
    }
  }, [cliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar autenticado para salvar clientes');
        return;
      }

      if (cliente?.id) {
        // Atualizar cliente existente
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', cliente.id);

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Criar novo cliente
        const { error } = await supabase
          .from('clientes')
          .insert([{ ...formData, id_empresa: session.user.user_metadata.id_empresa }]);

        if (error) throw error;
        toast.success('Cliente criado com sucesso!');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao salvar cliente: ' + error.message);
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
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
              {cliente ? 'Editar Cliente' : 'Novo Cliente'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="fonewhats" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefone/WhatsApp
                </label>
                <input
                  type="tel"
                  id="fonewhats"
                  name="fonewhats"
                  value={formData.fonewhats}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="cpf_cnpj" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CPF/CNPJ
                </label>
                <input
                  type="text"
                  id="cpf_cnpj"
                  name="cpf_cnpj"
                  value={formData.cpf_cnpj}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="rg" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  RG
                </label>
                <input
                  type="text"
                  id="rg"
                  name="rg"
                  value={formData.rg}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="datanas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  id="datanas"
                  name="datanas"
                  value={formData.datanas}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="cep" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CEP
                </label>
                <input
                  type="text"
                  id="cep"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="logradouro" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Logradouro
                </label>
                <input
                  type="text"
                  id="logradouro"
                  name="logradouro"
                  value={formData.logradouro}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="nrlogradouro" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Número
                </label>
                <input
                  type="text"
                  id="nrlogradouro"
                  name="nrlogradouro"
                  value={formData.nrlogradouro}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Complemento
                </label>
                <input
                  type="text"
                  id="complemento"
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bairro
                </label>
                <input
                  type="text"
                  id="bairro"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
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
                />
              </div>

              <div>
                <label htmlFor="uf" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  UF
                </label>
                <input
                  type="text"
                  id="uf"
                  name="uf"
                  value={formData.uf}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="ponto_referencia" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ponto de Referência
                </label>
                <input
                  type="text"
                  id="ponto_referencia"
                  name="ponto_referencia"
                  value={formData.ponto_referencia}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 dark:bg-primary-500 text-sm font-medium text-white hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : cliente ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ClienteModal;
