import { WhatsAppTemplate } from '../../types/adm';

// Mock data - Substitua por chamadas reais à API quando disponível
const templates: WhatsAppTemplate[] = [
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
];

export async function fetchWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  // Simula uma chamada assíncrona
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(templates);
    }, 500);
  });
}

export async function updateWhatsAppTemplate(template: WhatsAppTemplate): Promise<WhatsAppTemplate> {
  // Simula uma chamada assíncrona
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(template);
    }, 500);
  });
}

export async function toggleTemplateActive(id: number): Promise<boolean> {
  // Simula uma chamada assíncrona
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 500);
  });
}
