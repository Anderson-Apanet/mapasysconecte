import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, setEmpresaIdContext } from '../utils/supabaseClient';
import { updateEmpresaColor } from '../utils/empresaColorEvent';

interface UserData {
  id_user_tipo: number;
  user_tipo: {
    tipo: string;
  };
  empresa_id?: number;
  empresa?: {
    id: number;
    nome: string;
    cnpj: string;
    cor?: string;
    logo?: string;
  } | null;
}

// Hook de autenticação
export default function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar dados do usuário
  const fetchUserData = async (userId: string) => {
    try {
      console.log('Buscando dados do usuário:', userId);
      
      // Recuperar a empresa selecionada do localStorage
      const selectedEmpresaId = localStorage.getItem('selectedEmpresaId');
      
      // Buscar dados do usuário com join explícito para user_tipo
      const { data, error } = await supabase
        .from('users')
        .select(`
          id_user_tipo,
          user_tipo_info:user_tipo(tipo),
          empresa_id
        `)
        .eq('id_user', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      // Se temos uma empresa selecionada no localStorage, vamos usá-la
      // Caso contrário, usamos a empresa_id do usuário
      const empresaId = selectedEmpresaId ? parseInt(selectedEmpresaId) : data.empresa_id;
      
      // Definir o contexto de empresa para o Supabase
      if (empresaId) {
        setEmpresaIdContext(empresaId);
      }
      
      // Se temos uma empresa_id, buscar os dados da empresa
      let empresaData = null;
      if (empresaId) {
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .select('id, nome, cnpj, cor, logo')
          .eq('id', empresaId)
          .single();
          
        if (empresaError) {
          console.error('Error fetching empresa data:', empresaError);
        } else {
          empresaData = empresa;
          
          // Atualizar o campo empresa_id do usuário no Supabase se necessário
          if (data.empresa_id !== empresaId) {
            await supabase
              .from('users')
              .update({ empresa_id: empresaId })
              .eq('id_user', userId);
          }
          
          // Aplicar a cor da empresa como cor de fundo da aplicação
          console.log('Dados da empresa:', empresa);
          if (empresa.cor) {
            console.log('Aplicando cor da empresa:', empresa.cor);
            updateEmpresaColor(empresa.cor);
          } else {
            console.log('Empresa não tem cor definida');
          }
        }
      }
      
      // Extrair o tipo do usuário do resultado da consulta
      let tipoUsuario = '';
      if (data.user_tipo_info && Array.isArray(data.user_tipo_info) && data.user_tipo_info.length > 0) {
        tipoUsuario = data.user_tipo_info[0].tipo || '';
      }
      
      // Formatar o objeto user_tipo para corresponder à interface UserData
      const formattedUserData: UserData = {
        id_user_tipo: data.id_user_tipo,
        user_tipo: {
          tipo: tipoUsuario
        },
        empresa_id: empresaId,
        empresa: empresaData
      };

      console.log('Dados do usuário obtidos com sucesso:', formattedUserData);
      return formattedUserData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Função para atualizar o estado com a nova sessão
    const handleSessionUpdate = async (currentSession: Session | null) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const data = await fetchUserData(currentSession.user.id);
        setUserData(data);
      } else {
        setUserData(null);
      }

      setLoading(false);
    };

    // Verificar sessão inicial
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao obter sessão:', error);
          // Limpar dados locais em caso de erro de sessão
          localStorage.removeItem('selectedEmpresaId');
          setSession(null);
          setUser(null);
          setUserData(null);
          setLoading(false);
          return;
        }
        
        handleSessionUpdate(data.session);
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setLoading(false);
      }
    };
    
    checkSession();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Evento de autenticação:', event);
      
      // Se o evento for um erro de token, tentar renovar a sessão
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        console.log('Token atualizado ou usuário logado');
      } else if (event === 'SIGNED_OUT') {
        // Limpar dados locais
        localStorage.removeItem('selectedEmpresaId');
      }
      
      handleSessionUpdate(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Efeito para verificar e atualizar o campo cor nas empresas
  useEffect(() => {
    const verificarEAtualizarCores = async () => {
      if (!user) return;
      
      try {
        // Verificar se o usuário está autenticado e tem dados
        if (userData && userData.empresa_id) {
          // Verificar se a empresa atual tem o campo cor
          const { data: empresa, error } = await supabase
            .from('empresas')
            .select('id, nome, cor')
            .eq('id', userData.empresa_id)
            .single();
            
          if (error) {
            console.error('Erro ao verificar cor da empresa:', error);
            return;
          }
          
          console.log('Verificando cor da empresa:', empresa);
          
          // Se a empresa tem cor definida, verificar se está no formato correto
          if (empresa.cor) {
            // Se a cor não começa com #, atualizar no banco de dados
            if (!empresa.cor.startsWith('#')) {
              const corFormatada = `#${empresa.cor}`;
              console.log(`Atualizando formato da cor da empresa ${empresa.nome} de ${empresa.cor} para ${corFormatada}`);
              
              // Atualizar a cor da empresa no banco de dados
              const { error: updateError } = await supabase
                .from('empresas')
                .update({ cor: corFormatada })
                .eq('id', empresa.id);
                
              if (updateError) {
                console.error('Erro ao atualizar formato da cor da empresa:', updateError);
              } else {
                // Aplicar a nova cor formatada
                updateEmpresaColor(corFormatada);
              }
            } else {
              // Cor já está no formato correto, apenas aplicar
              updateEmpresaColor(empresa.cor);
            }
          } 
          // Se a empresa não tem cor definida, definir uma cor padrão com base no ID
          else {
            // Lista de cores para diferentes empresas
            const cores = [
              '#1092E8', // Azul (Conecte)
              '#28a745', // Verde (NostraNet)
              '#dc3545', // Vermelho
              '#fd7e14', // Laranja
              '#6f42c1'  // Roxo
            ];
            
            // Usar o ID da empresa para selecionar uma cor (módulo para garantir que fique dentro do range)
            const corIndex = (empresa.id - 1) % cores.length;
            const novaCor = cores[corIndex];
            
            console.log(`Definindo cor padrão da empresa ${empresa.nome} para ${novaCor}`);
            
            // Atualizar a cor da empresa no banco de dados
            const { error: updateError } = await supabase
              .from('empresas')
              .update({ cor: novaCor })
              .eq('id', empresa.id);
              
            if (updateError) {
              console.error('Erro ao atualizar cor da empresa:', updateError);
            } else {
              // Aplicar a nova cor
              updateEmpresaColor(novaCor);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar cores das empresas:', error);
      }
    };
    
    verificarEAtualizarCores();
  }, [user, userData]);

  // Verificar e aplicar a cor da empresa sempre que os dados do usuário forem carregados
  useEffect(() => {
    if (userData?.empresa?.cor) {
      console.log('Aplicando cor da empresa do userData:', userData.empresa.cor);
      updateEmpresaColor(userData.empresa.cor);
    }
  }, [userData]);

  const signOut = async () => {
    try {
      // Limpar o contexto de empresa
      setEmpresaIdContext(null);
      
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Função para trocar de empresa
  const switchEmpresa = async (empresaId: number): Promise<boolean> => {
    if (!user) return false;
    
    try {
      console.log(`Trocando para empresa: ${empresaId}`);
      
      // Atualizar o localStorage
      localStorage.setItem('empresaId', empresaId.toString());
      
      // Atualizar o contexto de empresa para o Supabase
      setEmpresaIdContext(empresaId);
      
      // Atualizar o campo empresa_id do usuário no Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({ empresa_id: empresaId })
        .eq('id_user', user.id);
        
      if (updateError) {
        console.error('Erro ao atualizar empresa do usuário:', updateError);
        return false;
      }
      
      // Buscar os dados da nova empresa
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id, nome, cnpj, cor, logo')
        .eq('id', empresaId)
        .single();
        
      if (empresaError || !empresa) {
        console.error('Erro ao buscar dados da empresa:', empresaError);
        return false;
      }
      
      console.log('Dados da nova empresa:', empresa);
      
      // Atualizar o userData com os novos dados da empresa
      setUserData(prevData => {
        if (!prevData) return null;
        
        return {
          ...prevData,
          empresa_id: empresaId,
          empresa: empresa
        };
      });
      
      // Verificar se a empresa tem uma cor definida
      if (empresa.cor) {
        console.log(`Aplicando cor da empresa ${empresa.nome}: ${empresa.cor}`);
        
        // Garantir que a cor tenha o formato correto (com #)
        let corFormatada = empresa.cor;
        if (!corFormatada.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(corFormatada)) {
          corFormatada = `#${corFormatada}`;
          
          // Atualizar a cor da empresa no banco de dados
          const { error: updateError } = await supabase
            .from('empresas')
            .update({ cor: corFormatada })
            .eq('id', empresaId);
            
          if (updateError) {
            console.error('Erro ao atualizar cor da empresa:', updateError);
          } else {
            console.log(`Cor da empresa atualizada para: ${corFormatada}`);
          }
        }
        
        // Aplicar a cor
        updateEmpresaColor(corFormatada);
      } else {
        // Se a empresa não tem cor definida, definir uma cor padrão
        const cores = ['#1092E8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        const corIndex = (empresaId - 1) % cores.length;
        const novaCor = cores[corIndex];
        
        console.log(`Definindo cor padrão para empresa ${empresa.nome}: ${novaCor}`);
        
        // Atualizar a cor no banco de dados
        await supabase
          .from('empresas')
          .update({ cor: novaCor })
          .eq('id', empresaId);
          
        // Aplicar a cor
        updateEmpresaColor(novaCor);
      }
      
      console.log(`Empresa alterada para: ${empresaId}`);
      return true;
    } catch (error) {
      console.error('Erro ao trocar de empresa:', error);
      return false;
    }
  };

  return {
    session,
    user,
    userData,
    loading,
    signOut,
    switchEmpresa,
    empresaColor: userData?.empresa?.cor || '#1092E8',
    empresaLogo: userData?.empresa?.logo || ''
  };
}
