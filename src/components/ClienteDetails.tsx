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
        <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-[#1092E8] text-left align-middle shadow-xl transition-all">
          <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-[#1092E8] z-10">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-[#1092E8]" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-medium text-white">
                    Detalhes do Cliente
                  </Dialog.Title>
                  <p className="text-sm text-white/80">
                    Informações completas do cliente
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-white/80"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Informações Pessoais */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-white mb-4">
                  Informações Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <UserIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">Nome</span>
                    </div>
                    <p className="text-gray-900">{cliente.nome || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <PhoneIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">Telefone</span>
                    </div>
                    <p className="text-gray-900">{cliente.fonewhats ? formatPhone(cliente.fonewhats) : 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <IdentificationIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">CPF/CNPJ</span>
                    </div>
                    <p className="text-gray-900">{cliente.cpf_cnpj || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <IdentificationIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">RG</span>
                    </div>
                    <p className="text-gray-900">{cliente.rg || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <EnvelopeIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">Email</span>
                    </div>
                    <p className="text-gray-900">{cliente.email || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5 text-[#1092E8] mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-[#1092E8]">Data de Nascimento</span>
                    </div>
                    <p className="text-gray-900">{cliente.datanas ? formatDate(cliente.datanas) : 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5 text-[#1092E8] mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-[#1092E8]">Status</span>
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
                <h3 className="text-lg font-medium text-white mb-4">
                  Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">Logradouro</span>
                    </div>
                    <p className="text-gray-900">
                      {cliente.logradouro ? `${cliente.logradouro}, ${cliente.nrlogradouro || 'S/N'}` : 'Não informado'}
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">Complemento</span>
                    </div>
                    <p className="text-gray-900">{cliente.complemento || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">Bairro</span>
                    </div>
                    <p className="text-gray-900">{bairroNome || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">CEP</span>
                    </div>
                    <p className="text-gray-900">{cliente.cep || 'Não informado'}</p>
                  </div>

                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-5 w-5 text-[#1092E8] mr-2" />
                      <span className="text-sm font-medium text-[#1092E8]">UF</span>
                    </div>
                    <p className="text-gray-900">{cliente.uf || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white text-[#1092E8] border border-[#1092E8] rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1092E8]"
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
