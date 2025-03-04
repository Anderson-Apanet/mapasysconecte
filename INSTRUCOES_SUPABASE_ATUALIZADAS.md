# Instruções para Ajustar o Supabase

Para resolver o erro 406 (Not Acceptable) ao acessar a página Caixa, é necessário verificar e ajustar as políticas de segurança (RLS - Row Level Security) para as tabelas "caixas" e "lancamentos" no seu banco de dados Supabase.

## Passos para ajustar as políticas de segurança:

1. Acesse o painel do Supabase em: https://app.supabase.com/
2. Faça login com suas credenciais
3. Selecione o projeto "dieycvogftvfoncigvtl"
4. No menu lateral, clique em "SQL Editor"
5. Clique em "New Query"
6. Cole o conteúdo do arquivo `ajustar_politicas_rls.sql` e execute
7. Crie uma nova consulta, cole o conteúdo do arquivo `verificar_estrutura_tabelas.sql` e execute

## O que esses scripts fazem:

1. **ajustar_politicas_rls.sql**:
   - Verifica se as políticas de RLS estão habilitadas
   - Remove políticas existentes para evitar conflitos
   - Cria novas políticas para permitir que os usuários acessem seus próprios dados
   - Adiciona políticas temporárias para permitir acesso público (apenas para testes)

2. **verificar_estrutura_tabelas.sql**:
   - Verifica a estrutura atual das tabelas
   - Adiciona colunas que possam estar faltando
   - Garante que todas as colunas necessárias estejam presentes

## Observações importantes:

- As políticas temporárias de acesso público devem ser removidas em ambiente de produção
- Se você quiser manter o acesso público para testes, mantenha as políticas "Acesso temporário para testes"
- Se você quiser restringir o acesso apenas aos próprios usuários, remova as políticas "Acesso temporário para testes"

Depois de executar os scripts, reinicie a aplicação e tente acessar a página Caixa novamente.
