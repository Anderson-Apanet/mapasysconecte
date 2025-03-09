import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      toast.success('Login realizado com sucesso!');

      // Se for técnico externo, redireciona para /tecnicos
      if (userData?.user_tipo?.tipo === 'Técnico Externo') {
        navigate('/tecnicos');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.error_description || error.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, informe seu email para redefinir a senha');
      return;
    }
    
    setIsResettingPassword(true);
    
    try {
      // Configurar a URL de redefinição de senha no site do Supabase
      // Isso é necessário porque o Supabase não está incluindo o caminho /resetpw
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) throw error;
      
      toast.success('Email de redefinição de senha enviado com sucesso! Verifique seu email e clique no link para redefinir sua senha.');
    } catch (error: any) {
      toast.error(error.error_description || error.message || 'Erro ao solicitar redefinição de senha');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-8">
        <div className="space-y-4">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Bem-vindo de volta
          </h2>
          <p className="text-center text-sm text-gray-600">
            Entre com sua conta para continuar
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Seu email"
                disabled={isLoading || isResettingPassword}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Sua senha"
                disabled={isLoading || isResettingPassword}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isLoading || isResettingPassword}
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition duration-150 ease-in-out"
              >
                {isResettingPassword ? 'Enviando...' : 'Esqueci minha senha'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isResettingPassword}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Entrando...
              </div>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
