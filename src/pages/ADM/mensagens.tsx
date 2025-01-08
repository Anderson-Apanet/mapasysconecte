import React, { useState, useEffect } from 'react';
import { UserGroupIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/Layout';
import AdminMenu from '../../components/adm/AdminMenu';
import WhatsAppTemplateModal from '../../components/WhatsAppTemplateModal';
import toast from 'react-hot-toast';

interface WhatsAppTemplate {
  id: number;
  type: 'payment_reminder' | 'overdue_payment' | 'welcome';
  message: string;
  active: boolean;
}

export default function Mensagens() {
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([
    {
      id: 1,
      type: 'payment_reminder',
      message: 'Olá {client_name}, este é um lembrete de que seu pagamento de {amount} vence em {due_date}.',
      active: true
    },
    {
      id: 2,
      type: 'overdue_payment',
      message: 'Olá {client_name}, seu pagamento de {amount} está atrasado desde {due_date}. Por favor, regularize sua situação.',
      active: true
    },
    {
      id: 3,
      type: 'welcome',
      message: 'Bem-vindo(a) {client_name}! Estamos felizes em tê-lo(a) como cliente.',
      active: true
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleActive = (id: number) => {
    setWhatsappTemplates(prev =>
      prev.map(template =>
        template.id === id ? { ...template, active: !template.active } : template
      )
    );
    toast.success('Status atualizado com sucesso!');
  };

  const handleSaveTemplate = (updatedTemplate: WhatsAppTemplate) => {
    setWhatsappTemplates(prev =>
      prev.map(template =>
        template.id === updatedTemplate.id ? updatedTemplate : template
      )
    );
    setIsModalOpen(false);
    toast.success('Template atualizado com sucesso!');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <UserGroupIcon className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-2" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
              Administração
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie usuários, permissões e configurações do sistema
          </p>
        </div>

        {/* Menu */}
        <div className="p-4 sm:p-6">
          <AdminMenu />

          {/* Content */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Mensagens WhatsApp
                </h2>
              </div>

              <div className="space-y-6">
                {whatsappTemplates.map((template) => (
                  <div key={template.id} className="bg-white dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {template.type === 'payment_reminder' && 'Lembrete de Pagamento'}
                        {template.type === 'overdue_payment' && 'Pagamento Atrasado'}
                        {template.type === 'welcome' && 'Mensagem de Boas-vindas'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(template.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                            template.active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-400 dark:hover:bg-green-800/50'
                              : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-400 dark:hover:bg-red-800/50'
                          }`}
                        >
                          {template.active ? 'Ativo' : 'Inativo'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsModalOpen(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <ChatBubbleLeftRightIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Mensagem
                        </label>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {template.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && selectedTemplate && (
          <WhatsAppTemplateModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveTemplate}
            template={selectedTemplate}
          />
        )}
      </div>
    </Layout>
  );
}
