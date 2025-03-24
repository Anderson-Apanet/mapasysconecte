import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import useAuth from '../hooks/useAuth';

interface Empresa {
  id: number;
  nome: string | null;
  cnpj: string | null;
}

export default function Login() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(null);

  // Função para buscar empresas associadas ao usuário
  const fetchUserEmpresas = async (email: string) => {
    setIsCheckingEmail(true);
    try {
      console.log('Verificando email:', email);
      
      // 1. Buscar o ID do usuário pelo email na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id_user')
        .eq('email', email)
        .single();

      console.log('Resultado da busca de usuário:', { userData, userError });

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        return false;
      }

      if (!userData?.id_user) {
        return false;
      }

      console.log('ID do usuário encontrado (id_user):', userData.id_user);
      
      // 2. Buscar na tabela usuarios_empresas os registros com usuario_id igual ao id_user encontrado
      const { data: userEmpresasData, error: userEmpresasError } = await supabase
        .from('usuarios_empresas')
        .select('empresa_id')
        .eq('usuario_id', userData.id_user);

      console.log('Empresas do usuário (consulta direta):', { 
        userEmpresasData, 
        userEmpresasError
      });

      if (userEmpresasError) {
        console.error('Erro ao buscar empresas do usuário:', userEmpresasError);
        return false;
      }

      if (!userEmpresasData || userEmpresasData.length === 0) {
        return false;
      }
      
      // 3. Extrair os IDs das empresas encontradas
      const empresaIds = userEmpresasData.map(item => item.empresa_id);
      console.log('IDs das empresas encontradas:', empresaIds);
      
      // 4. Buscar os detalhes das empresas na tabela empresas
      const { data: empresasDetalhes, error: empresasDetalhesError } = await supabase
        .from('empresas')
        .select('id, nome, cnpj')
        .in('id', empresaIds);
        
      console.log('Detalhes das empresas:', { 
        empresasDetalhes, 
        empresasDetalhesError
      });
      
      if (empresasDetalhesError) {
        console.error('Erro ao buscar detalhes das empresas:', empresasDetalhesError);
        return false;
      }
      
      if (!empresasDetalhes || empresasDetalhes.length === 0) {
        return false;
      }
      
      // 5. Formatar os dados das empresas para o dropdown
      const formattedEmpresas: Empresa[] = empresasDetalhes.map(item => ({
        id: item.id,
        nome: item.nome,
        cnpj: item.cnpj
      }));
      
      setEmpresas(formattedEmpresas);
      
      // 6. Se houver apenas uma empresa, seleciona automaticamente
      if (formattedEmpresas.length === 1) {
        setEmpresaId(formattedEmpresas[0].id);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!email || !email.includes('@')) return;
    
    // Verifica se o usuário tem empresas associadas
    await fetchUserEmpresas(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, informe seu email');
      return;
    }
    
    if (!email.includes('@')) {
      toast.error('Por favor, informe um email válido');
      return;
    }
    
    if (!password) {
      toast.error('Por favor, informe sua senha');
      return;
    }
    
    // Verificar se há empresas e se uma empresa foi selecionada
    if (empresas.length > 0 && !empresaId) {
      toast.error('Por favor, selecione uma empresa');
      return;
    }

    setIsLoading(true);

    try {
      // Limpar qualquer sessão anterior para evitar problemas com tokens inválidos
      await supabase.auth.signOut();
      
      // Limpar localStorage para garantir que não há tokens antigos
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-refresh-token');
      
      // Fazer login com Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Erro de autenticação:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Usuário não encontrado após autenticação');
      }

      console.log('Login bem-sucedido, usuário:', authData.user.id);

      // Armazenar a empresa selecionada no localStorage
      if (empresaId) {
        localStorage.setItem('selectedEmpresaId', empresaId.toString());
      }

      // Atualizar o campo empresa_id do usuário no Supabase
      if (empresaId) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ empresa_id: empresaId })
          .eq('id_user', authData.user.id);

        if (updateError) {
          console.error('Erro ao atualizar empresa do usuário:', updateError);
          // Não impede o login, apenas loga o erro
        }
      }

      toast.success('Login realizado com sucesso!');

      // Se for técnico externo, redireciona para /tecnicos
      if (userData?.user_tipo?.tipo === 'Técnico Externo') {
        navigate('/tecnicos');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Erro completo no login:', error);
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
              <div className="flex">
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  onBlur={handleVerifyEmail}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Seu email"
                  disabled={isLoading}
                />
                {isCheckingEmail && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                )}
              </div>
            </div>
            
            {empresas.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="empresa" className="block text-sm font-medium text-gray-700">
                  Empresa
                </label>
                <select
                  id="empresa"
                  name="empresa"
                  value={empresaId || ''}
                  onChange={(e) => setEmpresaId(Number(e.target.value))}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  disabled={isLoading}
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome} - {empresa.cnpj}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
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
