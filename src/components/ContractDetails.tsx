import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { DocumentTextIcon, DocumentIcon } from '@heroicons/react/24/outline';
import DocumentEditor from './DocumentEditor';

interface ContractDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  contract: any; // Tipo do contrato
  client: any; // Tipo do cliente
  plan: any; // Tipo do plano
}

const ContractDetails: React.FC<ContractDetailsProps> = ({
  isOpen,
  onClose,
  contract,
  client,
  plan
}) => {
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [documentType, setDocumentType] = useState<'adesao' | 'permanencia' | 'rescisao'>('adesao');

  const handleOpenDocument = (type: 'adesao' | 'permanencia' | 'rescisao') => {
    setDocumentType(type);
    setShowDocumentEditor(true);
  };

  const contractData = {
    clientName: client?.nome || '',
    cpf: client?.cpf_cnpj || '',
    rg: client?.rg || '',
    address: client?.logradouro || '',
    city: client?.cidade || '',
    state: client?.uf || '',
    cep: client?.cep || '',
    email: client?.email || '',
    phone: client?.fonewhats || '',
    planName: plan?.nome || '',
    planValue: plan?.valor || 0,
    downloadSpeed: 300, // Ajuste conforme necessário
    uploadSpeed: 150, // Ajuste conforme necessário
    installationDate: contract?.data_instalacao || ''
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-40">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-lg font-medium">
                  Detalhes do Contrato
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  &times;
                </button>
              </div>
              
              {/* Detalhes do contrato existentes */}
              <div className="mb-4">
                {/* ... outros detalhes do contrato ... */}
              </div>

              {/* Botões para documentos */}
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => handleOpenDocument('adesao')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Contrato de Adesão
                </button>
                <button
                  onClick={() => handleOpenDocument('permanencia')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <DocumentIcon className="h-5 w-5 mr-2" />
                  Contrato de Permanência
                </button>
                <button
                  onClick={() => handleOpenDocument('rescisao')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  <DocumentIcon className="h-5 w-5 mr-2" />
                  Rescisão
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {showDocumentEditor && (
        <DocumentEditor
          isOpen={showDocumentEditor}
          onClose={() => setShowDocumentEditor(false)}
          documentType={documentType}
          contractData={contractData}
        />
      )}
    </>
  );
};

export default ContractDetails;
