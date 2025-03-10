import React, { useState } from 'react';
import { ChatBubbleLeftRightIcon, BellIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { PencilIcon, CheckIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/solid';
import Layout from '@/components/Layout';
import { Switch } from '@headlessui/react';

interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  active: boolean;
  daysBeforeDue?: number;
  daysAfterDue?: number;
}

const Messages: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      id: 'payment-reminder',
      name: 'Lembrete de Pagamento',
      template: 'Olá {cliente}, este é um lembrete amigável de que sua fatura no valor de R$ {valor} vence em {dias_vencimento} dias. Para mais informações, entre em contato conosco.',
      active: true,
      daysBeforeDue: 3
    },
    {
      id: 'overdue-payment',
      name: 'Aviso de Pagamento Vencido',
      template: 'Olá {cliente}, sua fatura no valor de R$ {valor} está vencida há {dias_atraso} dias. Por favor, regularize seu pagamento para evitar a suspensão dos serviços.',
      active: true,
      daysAfterDue: 1
    }
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTemplate, setEditedTemplate] = useState<MessageTemplate | null>(null);

  const handleEdit = (template: MessageTemplate) => {
    setEditingId(template.id);
    setEditedTemplate({ ...template });
  };

  const handleSave = () => {
    if (editedTemplate) {
      setTemplates(templates.map(t => 
        t.id === editedTemplate.id ? editedTemplate : t
      ));
      setEditingId(null);
      setEditedTemplate(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedTemplate(null);
  };

  const handleToggleActive = (id: string) => {
    setTemplates(templates.map(t => 
      t.id === id ? { ...t, active: !t.active } : t
    ));
  };

  const handleDaysChange = (id: string, field: 'daysBeforeDue' | 'daysAfterDue', value: number) => {
    setTemplates(templates.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-white dark:text-white mr-2" />
            <h1 className="text-3xl font-bold text-white">
              Mensagens WhatsApp
            </h1>
          </div>
          <p className="text-white dark:text-white opacity-90">
            Configure as mensagens automáticas do WhatsApp para seus clientes
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Gerenciamento de Mensagens Automáticas
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Configure os templates e agendamentos para envio automático de mensagens aos clientes.
            </p>
          </div>

          <div className="space-y-6">
            {templates.map(template => (
              <div 
                key={template.id} 
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    {template.id === 'payment-reminder' ? (
                      <BellIcon className="h-6 w-6 text-blue-500 mr-2" />
                    ) : (
                      <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
                    )}
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                      {template.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={template.active}
                      onChange={() => handleToggleActive(template.id)}
                      className={`${
                        template.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                    >
                      <span
                        className={`${
                          template.active ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {editingId === template.id && editedTemplate ? (
                  <div className="mt-3 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Template da Mensagem
                      </label>
                      <textarea
                        value={editedTemplate.template}
                        onChange={(e) => setEditedTemplate({...editedTemplate, template: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        rows={4}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Variáveis disponíveis: {'{cliente}'}, {'{valor}'}, {'{dias_vencimento}'} ou {'{dias_atraso}'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {template.id === 'payment-reminder' ? 'Dias antes do vencimento' : 'Dias após o vencimento'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={template.id === 'payment-reminder' ? editedTemplate.daysBeforeDue : editedTemplate.daysAfterDue}
                        onChange={(e) => {
                          const field = template.id === 'payment-reminder' ? 'daysBeforeDue' : 'daysAfterDue';
                          setEditedTemplate({...editedTemplate, [field]: parseInt(e.target.value) || 1});
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" /> Salvar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 bg-gray-100 dark:bg-gray-600 p-3 rounded-md text-gray-700 dark:text-gray-300 text-sm">
                      {template.template}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      {template.id === 'payment-reminder' ? (
                        <>
                          <ClockIcon className="h-4 w-4 mr-1" />
                          <span>Enviar {template.daysBeforeDue} dias antes do vencimento</span>
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          <span>Enviar {template.daysAfterDue} dias após o vencimento</span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">
              Informações sobre o envio automático
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              As mensagens serão enviadas automaticamente de acordo com as configurações acima. 
              O sistema verifica diariamente os contratos e envia as mensagens para os clientes 
              conforme os critérios definidos.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
