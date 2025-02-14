import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import Layout from '@/components/Layout';
import UserManagement from '@/components/ADM/UserManagement';

const Users: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-[#1E4620] dark:bg-[#1E4620] p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <UserIcon className="h-8 w-8 text-white mr-2" />
            <h1 className="text-3xl font-bold text-white">
              Gerenciamento de Usuários
            </h1>
          </div>
          <p className="text-white">
            Gerencie os usuários do sistema, suas permissões e informações
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <UserManagement />
        </div>
      </div>
    </Layout>
  );
};

export default Users;
