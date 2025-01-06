import React, { useState, useEffect } from 'react';
import { PencilIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { WhatsAppTemplate } from '../../types/adm';
import { fetchWhatsAppTemplates, updateWhatsAppTemplate, toggleTemplateActive } from '../../services/adm/whatsappService';

interface WhatsAppTabProps {
  onEdit: (template: WhatsAppTemplate) => void;
}

export function WhatsAppTab({ onEdit }: WhatsAppTabProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await fetchWhatsAppTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleToggleActive = async (id: number) => {
    try {
      await toggleTemplateActive(id);
      setTemplates(prev =>
        prev.map(template =>
          template.id === id ? { ...template, active: !template.active } : template
        )
      );
      toast.success('Status do template atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getTemplateTypeLabel = (type: WhatsAppTemplate['type']) => {
    switch (type) {
      case 'payment_reminder':
        return 'Lembrete de Pagamento';
      case 'overdue_payment':
        return 'Pagamento Atrasado';
      case 'welcome':
        return 'Boas-vindas';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {templates.map((template) => (
            <li key={template.id}>
              <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {getTemplateTypeLabel(template.type)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {template.message}
                  </p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => onEdit(template)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(template.id)}
                    className={template.active ? 'text-green-600' : 'text-red-600'}
                  >
                    {template.active ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <XCircleIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
