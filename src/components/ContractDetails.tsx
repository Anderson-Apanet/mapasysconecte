import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { DocumentTextIcon, DocumentIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import DocumentEditor from './DocumentEditor';
import { toast } from 'react-toastify';
import { supabase } from '../utils/supabaseClient';

interface Contrato {
  id: number;
  endereco: string;
  complemento: string;
  id_bairro: number | null;
  bairro: {
    id: number;
    nome: string;
    cidade: string;
  };
  plano: {
    id: number;
    nome: string;
    valor: number;
  };
}

interface ContractDetailsProps {
  contrato: Contrato | null;
  onClose: () => void;
  onUpdate: (contrato: Contrato) => void;
}

const ContractDetails: React.FC<ContractDetailsProps> = ({
  contrato,
  onClose,
  onUpdate
}) => {
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [documentType, setDocumentType] = useState<'adesao' | 'permanencia' | 'rescisao'>('adesao');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    endereco: '',
    complemento: '',
    id_bairro: null as number | null
  });

  // Atualiza os dados quando o contrato mudar
  useEffect(() => {
    if (contrato) {
      setEditedData({
        endereco: contrato.endereco || '',
        complemento: contrato.complemento || '',
        id_bairro: contrato.id_bairro
      });
    }
  }, [contrato]);

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('contratos')
        .update({
          endereco: editedData.endereco,
          complemento: editedData.complemento,
          id_bairro: editedData.id_bairro
        })
        .eq('id', contrato?.id);

      if (error) throw error;

      // Recarrega os dados do contrato após salvar
      const { data: updatedContrato, error: fetchError } = await supabase
        .from('contratos')
        .select(`
          *,
          bairros (
            id,
            nome,
            cidade
          ),
          planos (
            id,
            nome,
            valor
          )
        `)
        .eq('id', contrato?.id)
        .single();

      if (fetchError) throw fetchError;

      // Atualiza o contrato no componente pai
      onUpdate(updatedContrato);

      toast.success('Endereço atualizado com sucesso!');
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao atualizar endereço');
    }
  };

  const handleOpenDocument = (type: 'adesao' | 'permanencia' | 'rescisao') => {
    setDocumentType(type);
    setShowDocumentEditor(true);
  };

  const handleCancel = () => {
    setEditedData({
      endereco: contrato?.endereco || '',
      complemento: contrato?.complemento || '',
      id_bairro: contrato?.id_bairro
    });
    setIsEditing(false);
  };

  const contractData = {
    clientName: contrato?.cliente.nome || '',
    cpf: contrato?.cliente.cpf_cnpj || '',
    rg: contrato?.cliente.rg || '',
    address: editedData.endereco || '',
    city: contrato?.bairro.cidade || '',
    state: contrato?.bairro.cidade.uf || '',
    cep: contrato?.cep || '',
    email: contrato?.cliente.email || '',
    phone: contrato?.cliente.fonewhats || '',
    planName: contrato?.plano.nome || '',
    planValue: contrato?.plano.valor || 0,
    downloadSpeed: 300,
    uploadSpeed: 150,
    installationDate: contrato?.data_instalacao || ''
  };

  return (
    <>
      <Dialog open={!!contrato} onClose={onClose} className="relative z-40">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-lg font-medium">
                  Detalhes do Contrato
                </Dialog.Title>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Editar endereço"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        className="text-green-600 hover:text-green-700"
                        title="Salvar alterações"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-700"
                        title="Cancelar edição"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Fechar</span>
                    &times;
                  </button>
                </div>
              </div>

              {/* Card de Endereço */}
              <div className="bg-white shadow rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium mb-3">Endereço</h3>
                <div className="grid grid-cols-2 gap-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Endereço</label>
                        <input
                          type="text"
                          value={editedData.endereco}
                          onChange={(e) => setEditedData({
                            ...editedData,
                            endereco: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Complemento</label>
                        <input
                          type="text"
                          value={editedData.complemento}
                          onChange={(e) => setEditedData({
                            ...editedData,
                            complemento: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bairro</label>
                        <p className="text-sm font-medium">{contrato?.bairro.nome}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">Endereço</p>
                        <p className="text-sm font-medium">{contrato?.endereco}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Complemento</p>
                        <p className="text-sm font-medium">{contrato?.complemento}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Bairro</p>
                        <p className="text-sm font-medium">{contrato?.bairro.nome}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card de Detalhes do Cliente */}
              <div className="bg-white shadow rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium mb-3">Detalhes do Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome</p>
                    <p className="text-sm font-medium">{contrato?.cliente.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CPF/CNPJ</p>
                    <p className="text-sm font-medium">{contrato?.cliente.cpf_cnpj}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-sm font-medium">{contrato?.cliente.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="text-sm font-medium">{contrato?.cliente.fonewhats}</p>
                  </div>
                </div>
              </div>

              {/* Card de Detalhes do Plano */}
              <div className="bg-white shadow rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium mb-3">Detalhes do Plano</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome do Plano</p>
                    <p className="text-sm font-medium">{contrato?.plano.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor</p>
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(contrato?.plano.valor || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data de Instalação</p>
                    <p className="text-sm font-medium">
                      {new Date(contrato?.data_instalacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-sm font-medium">{contrato?.status}</p>
                  </div>
                </div>
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
