import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface WhatsAppTemplate {
  id?: number;
  nome: string;
  mensagem: string;
  tipo: 'lembrete_pagamento' | 'mensalidade_vencida' | 'boas_vindas';
  dias_antecedencia?: number;
  diasApos?: number;
  ativo: boolean;
}

interface WhatsAppTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WhatsAppTemplate;
  onSuccess: (template: WhatsAppTemplate) => void;
}

const WhatsAppTemplateModal: React.FC<WhatsAppTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<WhatsAppTemplate>({
    nome: '',
    mensagem: '',
    tipo: 'lembrete_pagamento',
    dias_antecedencia: 3,
    diasApos: 0,
    ativo: true,
  });

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess(formData);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-auto p-6">
          <div className="absolute top-3 right-3">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1"
              aria-label="Fechar"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <Dialog.Title className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {formData.tipo === 'lembrete_pagamento' 
              ? 'Configurar Lembrete de Pagamento' 
              : formData.tipo === 'mensalidade_vencida'
              ? 'Configurar Mensagem de Vencimento'
              : 'Configurar Mensagem de Boas-vindas'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-6">
            {(formData.tipo === 'lembrete_pagamento' || formData.tipo === 'mensalidade_vencida') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {formData.tipo === 'lembrete_pagamento' ? 'Dias de Antecedência' : 'Dias Após Vencimento'}
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={formData.tipo === 'lembrete_pagamento' ? formData.dias_antecedencia : formData.diasApos}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        ...(formData.tipo === 'lembrete_pagamento' 
                          ? { dias_antecedencia: value }
                          : { diasApos: value }
                        )
                      }));
                    }}
                    min="0"
                    max="30"
                    className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.tipo === 'lembrete_pagamento' ? (
                      formData.dias_antecedencia === 0 
                        ? 'Enviar no dia do vencimento' 
                        : formData.dias_antecedencia === 1
                        ? 'Enviar 1 dia antes'
                        : `Enviar ${formData.dias_antecedencia} dias antes`
                    ) : (
                      formData.diasApos === 0 
                        ? 'Enviar no dia do vencimento' 
                        : formData.diasApos === 1
                        ? 'Enviar 1 dia após'
                        : `Enviar ${formData.diasApos} dias após`
                    )}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {formData.tipo === 'lembrete_pagamento' 
                    ? 'Configure com 0 para enviar no dia do vencimento, ou especifique quantos dias antes do vencimento a mensagem deve ser enviada.'
                    : 'Configure com 0 para enviar no dia do vencimento, ou especifique quantos dias após o vencimento a mensagem deve ser enviada.'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mensagem
              </label>
              <textarea
                value={formData.mensagem}
                onChange={(e) => setFormData(prev => ({ ...prev, mensagem: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Digite sua mensagem aqui..."
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Variáveis disponíveis:
                <br />
                {formData.tipo === 'boas_vindas' ? (
                  <>
                    • {'{nome_cliente}'} - Nome do cliente
                    <br />
                    • {'{nome_empresa}'} - Nome da empresa
                  </>
                ) : (
                  <>
                    • {'{nome_cliente}'} - Nome do cliente
                    <br />
                    • {'{valor_mensalidade}'} - Valor da mensalidade
                    <br />
                    • {'{data_vencimento}'} - Data de vencimento
                  </>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status da Mensagem
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    ativo: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.tipo === 'lembrete_pagamento' 
                    ? 'Lembrete ativo'
                    : formData.tipo === 'mensalidade_vencida'
                    ? 'Notificação ativa'
                    : 'Mensagem de boas-vindas ativa'}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default WhatsAppTemplateModal;
