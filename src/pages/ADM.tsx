import React, { useState } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import Layout from '@/components/Layout';
import AdminMenu from '@/components/ADM/AdminMenu';
import UserTypesModal from '@/components/ADM/UserTypesModal';

const ADM: React.FC = () => {
  const [isUserTypesModalOpen, setIsUserTypesModalOpen] = useState(false);

  const handleMenuClick = (path: string) => {
    // Aqui você pode adicionar a lógica para outros menus
    if (path === '/adm/tipos-usuarios') {
      setIsUserTypesModalOpen(true);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1092E8] dark:bg-[#1092E8] p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-2">
            <UserGroupIcon className="h-8 w-8 text-white dark:text-white mr-2" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent dark:from-yellow-300 dark:to-yellow-500">
              Administração
            </h1>
          </div>
          <p className="text-white dark:text-white">
            Gerencie usuários, permissões e configurações do sistema
          </p>
        </div>

        {/* Menu */}
        <div className="p-4 sm:p-6">
          <AdminMenu onMenuClick={handleMenuClick} />
        </div>

        {/* Modals */}
        <UserTypesModal 
          isOpen={isUserTypesModalOpen} 
          onClose={() => setIsUserTypesModalOpen(false)} 
        />
      </div>
    </Layout>
  );
};

export default ADM;
