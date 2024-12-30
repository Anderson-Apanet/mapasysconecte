import React from 'react';
import Layout from '../../components/Layout';

export default function ADM() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Administração do Sistema</h1>
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Gerencie as configurações administrativas do sistema.
          </p>
          {/* Aqui você pode adicionar mais conteúdo administrativo */}
        </div>
      </div>
    </Layout>
  );
}
