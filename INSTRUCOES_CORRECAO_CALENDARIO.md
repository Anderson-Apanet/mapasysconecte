# Instruções para Correção do Calendário

Identificamos um problema no calendário da página Agenda, onde eventos com datas posteriores a 28/02/2025 não estão sendo exibidos corretamente. Este documento fornece instruções para resolver o problema.

## Problema Identificado

Os eventos com datas em março de 2025 estão presentes no banco de dados (56 registros), mas não são exibidos no calendário quando você visualiza o mês de março de 2025. Isso provavelmente está relacionado a um problema de fuso horário na forma como as datas são processadas.

## Solução Implementada

1. **Modificação no Código**: Foi alterada a função `transformEvents` no arquivo `src/services/agenda.ts` para corrigir o tratamento das datas:
   - Antes: `const startDate = new Date(event.datainicio + 'Z');`
   - Depois: `const startDate = new Date(event.datainicio.replace('Z', ''));`

   Esta alteração evita que o JavaScript interprete incorretamente o fuso horário, o que estava causando problemas na exibição dos eventos.

2. **Scripts de Diagnóstico**:
   - `verificar_eventos_calendario.js`: Um script que pode ser executado no console do navegador para diagnosticar problemas com os eventos do calendário.
   - `corrigir_eventos_calendario.sql`: Um script SQL para verificar e corrigir problemas nas datas dos eventos no banco de dados.

## Como Verificar se a Correção Funcionou

1. Acesse a página Agenda no seu aplicativo
2. Navegue para o mês de março de 2025 no calendário
3. Verifique se os eventos estão sendo exibidos corretamente

Se os eventos ainda não aparecerem, abra o console do navegador (F12) e execute o conteúdo do arquivo `verificar_eventos_calendario.js` para obter informações de diagnóstico.

## Passos Adicionais (se necessário)

Se a correção no código não resolver completamente o problema, você pode precisar executar o script SQL `corrigir_eventos_calendario.sql` no Supabase para corrigir os dados diretamente no banco de dados:

1. Acesse o painel do Supabase em: https://app.supabase.com/
2. Faça login com suas credenciais
3. Selecione o projeto "dieycvogftvfoncigvtl"
4. No menu lateral, clique em "SQL Editor"
5. Clique em "New Query"
6. Cole o conteúdo do arquivo `corrigir_eventos_calendario.sql` e execute

## Observações Importantes

- A correção implementada modifica apenas a forma como as datas são interpretadas pelo JavaScript, não altera os dados no banco de dados.
- Se você estiver usando fusos horários diferentes em diferentes partes do sistema, pode ser necessário padronizar o tratamento de datas em toda a aplicação.
- Recomendamos testar a solução em um ambiente de desenvolvimento antes de aplicá-la em produção.
