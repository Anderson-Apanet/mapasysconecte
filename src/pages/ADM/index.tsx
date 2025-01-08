import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/Layout';
import AdminMenu from '../../components/adm/AdminMenu';

export default function AdminPage() {
  const location = useLocation();

  useEffect(() => {
    console.log('AdminPage carregada', { pathname: location.pathname });
  }, [location]);

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
        </div>
      </div>
    </Layout>
  );
}
