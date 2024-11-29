import { UserCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import MainNav from './MainNav';

export default function Header() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900">MapaSys</h1>
          </div>

          {/* Navigation */}
          <div className="hidden md:block flex-1 ml-10">
            <MainNav />
          </div>

          {/* User Menu */}
          <div className="flex items-center ml-4">
            <div className="flex items-center">
              <button
                type="button"
                className="flex items-center max-w-xs rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                id="user-menu-button"
              >
                <span className="sr-only">Abrir menu do usuário</span>
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
              </button>
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                Sair
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <MainNav />
          </div>
        </div>
      </div>
    </header>
  );
}
