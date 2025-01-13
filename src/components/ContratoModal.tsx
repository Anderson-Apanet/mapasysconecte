import React from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Contrato {
  id: number;
  created_at: string;
  complemento: string | null;
  contratoassinado: boolean | null;
  data_instalacao: string | null;
  dia_vencimento: number | null;
  id_empresa: number | null;
  endereco: string | null;
  liberado48: string | null;
  pppoe: string | null;
  senha: string | null;
  status: string | null;
  tipo: string | null;
  ultparcela: string | null;
  vendedor: string | null;
  data_cad_contrato: string | null;
  id_legado: string | null;
  id_cliente: number | null;
  planos: {
    id: number;
    nome: string;
    valor: number;
  } | null;
  bairros: {
    id: number;
    nome: string;
    cidade: string;
  } | null;
}

interface ContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: Contrato;
}

const ContratoModal: React.FC<ContratoModalProps> = ({ isOpen, onClose, contrato }) => {
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-50 overflow-y-auto"
      onClose={onClose}
      open={isOpen}
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title
            as="h3"
            className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
          >
            Detalhes do Contrato
          </Dialog.Title>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">PPPoE</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{contrato.pppoe || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Senha</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{contrato.senha || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    contrato.status === 'Ativo'
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  }`}>
                    {contrato.status || 'Não definido'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{contrato.tipo || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Plano</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {contrato.planos ? `${contrato.planos.nome} - R$ ${contrato.planos.valor}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dia do Vencimento</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{contrato.dia_vencimento || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Instalação</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(contrato.data_instalacao)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Cadastro</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(contrato.data_cad_contrato)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Endereço</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {contrato.endereco || '-'}
                  {contrato.complemento && `, ${contrato.complemento}`}
                  {contrato.bairros?.nome && ` - ${contrato.bairros.nome}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ContratoModal;
