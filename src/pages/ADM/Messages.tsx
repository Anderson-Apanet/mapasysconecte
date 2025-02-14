import React from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import Layout from '@/components/Layout';

const Messages: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-500 dark:text-green-400 mr-2" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent dark:from-green-400 dark:to-green-300">
              Mensagens WhatsApp
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Configure as mensagens automáticas do WhatsApp
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Aqui será implementado o gerenciamento de mensagens */}
          <p className="text-gray-600 dark:text-gray-400">
            Funcionalidade em desenvolvimento...
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
