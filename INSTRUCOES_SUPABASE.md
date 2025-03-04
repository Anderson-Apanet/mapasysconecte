# Instruções para Configuração do Supabase

Para resolver o erro 406 (Not Acceptable) ao acessar a página Caixa, é necessário criar as tabelas "caixas" e "lancamentos" no seu novo banco de dados Supabase.

## Passos para criar as tabelas:

1. Acesse o painel do Supabase em: https://app.supabase.com/
2. Faça login com suas credenciais
3. Selecione o projeto "dieycvogftvfoncigvtl"
4. No menu lateral, clique em "SQL Editor"
5. Clique em "New Query"
6. Cole o conteúdo do arquivo `criar_tabela_caixas.sql` e execute
7. Crie uma nova consulta, cole o conteúdo do arquivo `criar_tabela_lancamentos.sql` e execute

## Verificação:

Após criar as tabelas, você pode verificar se elas foram criadas corretamente:

1. No menu lateral, clique em "Table Editor"
2. Você deve ver as tabelas "caixas" e "lancamentos" na lista

## Observações importantes:

- As tabelas são criadas com políticas de Row Level Security (RLS) que permitem que os usuários vejam apenas seus próprios registros
- Certifique-se de que o usuário que está acessando a aplicação tenha permissões adequadas
- Se você já tinha dados nas tabelas antigas, será necessário migrar esses dados para as novas tabelas

Depois de criar as tabelas, reinicie a aplicação e tente acessar a página Caixa novamente.
