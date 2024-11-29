import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isOpen } = useSidebar();
  const { isDark } = useTheme();

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300`}>
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden ${isOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <header className="h-16 flex items-center justify-between px-6 backdrop-blur-md bg-white/80 dark:bg-gray-800/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">MapaSys</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
