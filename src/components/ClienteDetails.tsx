import React from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, UserIcon, PhoneIcon, IdentificationIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Cliente } from '../types/cliente';
import { supabase } from '../utils/supabaseClient';
import { formatPhone } from '../utils/formatters';
import { formatDate } from '../utils/formatDate';

interface ClienteDetailsProps {
  cliente: Cliente | null;
  onClose: () => void;
}

const ClienteDetails: React.FC<ClienteDetailsProps> = ({
  cliente,
  onClose
}) => {
  const [bairroNome, setBairroNome] = React.useState<string | null>(null);

  // Carregar informações do bairro se o cliente tiver um bairro associado
  React.useEffect(() => {
    const fetchBairro = async () => {
      if (cliente?.id_bairro) {
        try {
          const { data, error } = await supabase
            .from('bairros')
            .select('nome')
            .eq('id', cliente.id_bairro)
            .single();
          
          if (error) throw error;
          setBairroNome(data?.nome || null);
        } catch (error) {
          console.error('Erro ao carregar bairro:', error);
          setBairroNome(null);
        }
      }
    };

    fetchBairro();
  }, [cliente?.id_bairro]);

  if (!cliente) return null;

  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-50 overflow-y-auto"
      onClose={onClose}
      open={!!cliente}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
          <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                    Detalhes do Cliente
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Informações completas do cliente
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Informações Pessoais */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Informações Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.nome || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <PhoneIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.fonewhats ? formatPhone(cliente.fonewhats) : 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <IdentificationIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">CPF/CNPJ</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.cpf_cnpj || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <IdentificationIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">RG</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.rg || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <EnvelopeIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.email || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Nascimento</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.datanas ? formatDate(cliente.datanas) : 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span>
                    </div>
                    <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${cliente.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                      cliente.status === 'Inativo' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                      {cliente.status || 'Pendente'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Logradouro</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">
                      {cliente.logradouro ? `${cliente.logradouro}, ${cliente.nrlogradouro || 'S/N'}` : 'Não informado'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Complemento</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.complemento || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Bairro</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{bairroNome || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">CEP</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.cep || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">UF</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{cliente.uf || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ClienteDetails;
