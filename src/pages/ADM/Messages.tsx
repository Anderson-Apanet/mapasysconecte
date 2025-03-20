import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, BellIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { PencilIcon, CheckIcon, CalendarIcon } from '@heroicons/react/24/solid';
import Layout from '@/components/Layout';
import { Switch } from '@headlessui/react';
import { fetchTiposMensagem, upsertTipoMensagem, TipoMensagem } from '@/services/messages';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

interface MessageTemplate {
  id?: number;
  nome: string;
  mensagem_template: string;
  ativo: boolean;
  dias: number; // Positivo para dias antes do vencimento, negativo para dias após o vencimento
}

const Messages: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedTemplate, setEditedTemplate] = useState<MessageTemplate | null>(null);

  // Carregar os templates do banco de dados ao iniciar
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const tiposMensagem = await fetchTiposMensagem();
        
        // Converter TipoMensagem para MessageTemplate
        const loadedTemplates = tiposMensagem.map(tipo => ({
          id: tipo.id,
          nome: tipo.nome,
          mensagem_template: tipo.mensagem_template,
          ativo: tipo.ativo || true,
          dias: tipo.dias
        }));
        
        // Se não existirem templates no banco, criar os padrões
        if (loadedTemplates.length === 0) {
          const defaultTemplates = [
            {
              nome: 'Lembrete de Pagamento',
              mensagem_template: 'Olá {cliente}, este é um lembrete amigável de que sua fatura no valor de R$ {valor} vence em {dias_vencimento} dias. Para mais informações, entre em contato conosco.',
              ativo: true,
              dias: 3 // 3 dias antes do vencimento
            },
            {
              nome: 'Aviso de Pagamento Vencido',
              mensagem_template: 'Olá {cliente}, sua fatura no valor de R$ {valor} está vencida há {dias_atraso} dias. Por favor, regularize seu pagamento para evitar a suspensão dos serviços.',
              ativo: true,
              dias: -1 // 1 dia após o vencimento
            }
          ];
          
          // Salvar templates padrão no banco
          const savedTemplates = await Promise.all(
            defaultTemplates.map(async template => {
              const saved = await upsertTipoMensagem({
                nome: template.nome,
                mensagem_template: template.mensagem_template,
                dias: template.dias,
                ativo: template.ativo
              });
              return {
                id: saved.id,
                nome: saved.nome,
                mensagem_template: saved.mensagem_template,
                ativo: saved.ativo || true,
                dias: saved.dias
              };
            })
          );
          
          setTemplates(savedTemplates);
        } else {
          setTemplates(loadedTemplates);
        }
      } catch (error) {
        console.error('Erro ao carregar templates:', error);
        toast.error('Erro ao carregar templates de mensagens');
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplates();
  }, []);

  const handleEdit = (template: MessageTemplate) => {
    setEditingId(template.id || null);
    setEditedTemplate({ ...template });
  };

  const handleSave = async () => {
    if (editedTemplate) {
      try {
        setLoading(true);
        
        // Converter MessageTemplate para TipoMensagem
        const tipoMensagem: TipoMensagem = {
          id: editedTemplate.id,
          nome: editedTemplate.nome,
          mensagem_template: editedTemplate.mensagem_template,
          dias: editedTemplate.dias
        };
        
        // Salvar no banco de dados
        const savedTipo = await upsertTipoMensagem(tipoMensagem);
        
        // Atualizar a lista de templates
        setTemplates(templates.map(t => 
          t.id === savedTipo.id ? {
            id: savedTipo.id,
            nome: savedTipo.nome,
            mensagem_template: savedTipo.mensagem_template,
            ativo: savedTipo.ativo || true,
            dias: savedTipo.dias
          } : t
        ));
        
        toast.success('Template salvo com sucesso!');
        setEditingId(null);
        setEditedTemplate(null);
      } catch (error) {
        console.error('Erro ao salvar template:', error);
        toast.error('Erro ao salvar template');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedTemplate(null);
  };

  const handleToggleActive = async (template: MessageTemplate) => {
    try {
      setLoading(true);
      
      // Atualizar apenas o estado local para refletir a mudança na interface
      // A propriedade 'ativo' não existe no banco de dados, é apenas um controle visual
      const updatedTemplate = { 
        ...template, 
        ativo: !template.ativo 
      };
      
      // Não precisamos salvar a propriedade 'ativo' no banco de dados
      // Apenas atualizamos o estado local
      setTemplates(templates.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      ));
      
      toast.success(`Template ${updatedTemplate.ativo ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar status do template:', error);
      toast.error('Erro ao atualizar status do template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            Mensagens WhatsApp
          </h1>
          <Link 
            to={ROUTES.ADM_MESSAGE_HISTORY}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ClockIcon className="h-5 w-5 mr-2" />
            Histórico de Mensagens
          </Link>
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

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {templates.map(template => (
                <div 
                  key={template.id} 
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      {template.dias > 0 ? (
                        <BellIcon className="h-6 w-6 text-blue-500 mr-2" />
                      ) : (
                        <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
                      )}
                      <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                        {template.nome}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={template.ativo}
                        onChange={() => handleToggleActive(template)}
                        className={`${
                          template.ativo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                      >
                        <span
                          className={`${
                            template.ativo ? 'translate-x-6' : 'translate-x-1'
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
                          value={editedTemplate.mensagem_template}
                          onChange={(e) => setEditedTemplate({...editedTemplate, mensagem_template: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                          rows={4}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Variáveis disponíveis: {'{cliente}'}, {'{valor}'}, {'{dias_vencimento}'} ou {'{dias_atraso}'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {template.dias > 0 ? 'Dias antes do vencimento' : 'Dias após o vencimento'}
                        </label>
                        <input
                          type="number"
                          min={template.dias > 0 ? "1" : "-30"}
                          max={template.dias > 0 ? "30" : "-1"}
                          value={Math.abs(editedTemplate.dias)}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            const dias = template.dias > 0 ? value : -value;
                            setEditedTemplate({...editedTemplate, dias});
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
                        {template.mensagem_template}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        {template.dias > 0 ? (
                          <>
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span>Enviar {template.dias} dias antes do vencimento</span>
                          </>
                        ) : (
                          <>
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            <span>Enviar {Math.abs(template.dias)} dias após o vencimento</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

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
