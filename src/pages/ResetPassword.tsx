import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { ROUTES } from '../constants/routes';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se estamos na página de redefinição de senha
    console.log('URL atual:', window.location.href);
    
    // Extrair o hash da URL
    const hashFragment = window.location.hash;
    console.log('Hash fragment:', hashFragment);
    
    // Verificar se há parâmetros de consulta (para o caso do Supabase usar ?token= em vez de #access_token=)
    const queryParams = new URLSearchParams(window.location.search);
    const queryToken = queryParams.get('token') || queryParams.get('access_token');
    console.log('Query token:', queryToken ? 'Presente' : 'Ausente');
    
    // Tentar diferentes abordagens para obter o token
    if (hashFragment) {
      try {
        // O formato é #access_token=...&type=recovery
        const params = new URLSearchParams(hashFragment.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        console.log('Parâmetros do hash encontrados:', {
          accessToken: accessToken ? 'Presente' : 'Ausente',
          refreshToken: refreshToken ? 'Presente' : 'Ausente',
          type
        });
        
        if (accessToken) {
          setHash(accessToken);
          
          // Configurar o token na sessão do Supabase
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          }).then(({ data, error }) => {
            if (error) {
              console.error('Erro ao configurar sessão:', error);
              setError('Erro ao configurar a sessão: ' + error.message);
            } else {
              console.log('Sessão configurada com sucesso:', data.session ? 'Válida' : 'Inválida');
            }
          });
        } else if (queryToken) {
          // Tentar usar o token da query string se o hash não tiver um token
          setHash(queryToken);
          
          // Configurar o token na sessão do Supabase
          supabase.auth.setSession({
            access_token: queryToken,
            refresh_token: '',
          }).then(({ data, error }) => {
            if (error) {
              console.error('Erro ao configurar sessão com token da query:', error);
              setError('Erro ao configurar a sessão: ' + error.message);
            } else {
              console.log('Sessão configurada com sucesso (token da query):', data.session ? 'Válida' : 'Inválida');
            }
          });
        } else {
          setError('Token de acesso não encontrado na URL');
        }
      } catch (err) {
        console.error('Erro ao processar o hash da URL:', err);
        setError('Erro ao processar o link de redefinição de senha');
      }
    } else if (queryToken) {
      // Se não houver hash, mas houver um token na query string
      setHash(queryToken);
      
      // Configurar o token na sessão do Supabase
      supabase.auth.setSession({
        access_token: queryToken,
        refresh_token: '',
      }).then(({ data, error }) => {
        if (error) {
          console.error('Erro ao configurar sessão com token da query:', error);
          setError('Erro ao configurar a sessão: ' + error.message);
        } else {
          console.log('Sessão configurada com sucesso (token da query):', data.session ? 'Válida' : 'Inválida');
        }
      });
    } else {
      // Verificar se o usuário já está autenticado
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error('Erro ao verificar sessão existente:', error);
          setError('Link de redefinição de senha inválido ou expirado');
        } else if (data.session) {
          console.log('Usuário já está autenticado, permitindo redefinição de senha');
          setHash('session-exists');
        } else {
          setError('Link de redefinição de senha inválido ou expirado');
        }
      });
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      console.log('Tentando atualizar a senha...');
      
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Erro ao atualizar senha:', error);
        throw error;
      }

      console.log('Senha atualizada com sucesso:', data.user ? 'Usuário válido' : 'Usuário inválido');
      toast.success('Senha atualizada com sucesso!');
      
      // Redirecionar para a página de login após 2 segundos
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      toast.error(error.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-8">
        <div className="space-y-4">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Redefinir Senha
          </h2>
          <p className="text-center text-sm text-gray-600">
            Digite sua nova senha abaixo
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nova Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !hash}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || !hash}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !hash}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Processando...
                </div>
              ) : (
                'Redefinir Senha'
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erro na redefinição de senha
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate(ROUTES.LOGIN)}
              className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition duration-150 ease-in-out"
            >
              Voltar para o login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
