# Correção para Eventos com Data Final Nula

## Problema Identificado

Após as modificações iniciais, identificamos um novo problema: muitos eventos no banco de dados têm o campo `datafinal` como `null`. Isso estava causando o seguinte erro:

```
TypeError: Cannot read properties of null (reading 'replace')
    at agenda.ts:427:48
```

Este erro ocorre porque estávamos tentando chamar o método `replace` em um valor nulo, o que não é possível.

## Solução Implementada

Modificamos a função `transformEvents` para tratar corretamente eventos com `datafinal` nulo:

1. **Verificação de Valores Nulos**:
   - Verificamos se `datainicio` e `datafinal` existem antes de chamar o método `replace`
   - Se `datafinal` for nulo, usamos a data de início como data final

2. **Ajuste de Duração**:
   - Se a data final for igual à data inicial, adicionamos 1 hora à data final para garantir que o evento tenha uma duração visível no calendário

3. **Tratamento de Erros**:
   - Adicionamos verificações adicionais para garantir que as datas sejam válidas
   - Eventos com datas inválidas não são exibidos no calendário

## Código Implementado

```typescript
// Verificar se datainicio e datafinal existem antes de usar replace
const startDateStr = event.datainicio ? event.datainicio.replace('Z', '') : null;
const endDateStr = event.datafinal ? event.datafinal.replace('Z', '') : startDateStr; // Se datafinal for null, usa a data de início

if (!startDateStr) {
  console.log('Data de início nula para o evento:', event.id);
  return null;
}

const startDate = new Date(startDateStr);
const endDate = endDateStr ? new Date(endDateStr) : new Date(startDate); // Se endDateStr for null, usa startDate

// Se endDate for igual a startDate, adiciona 1 hora
if (endDate.getTime() === startDate.getTime()) {
  endDate.setHours(endDate.getHours() + 1);
}
```

## Impacto da Correção

Esta correção permite que eventos com `datafinal` nulo sejam exibidos corretamente no calendário. Agora, todos os eventos válidos devem aparecer, independentemente de terem ou não uma data final definida.

## Recomendação para o Futuro

Para evitar problemas semelhantes no futuro, recomendamos:

1. **Validação de Dados**: Implementar validação de dados ao criar ou atualizar eventos, garantindo que todos os campos obrigatórios sejam preenchidos.

2. **Valores Padrão**: Definir valores padrão para campos importantes, como `datafinal`, para que nunca sejam nulos.

3. **Tratamento Defensivo**: Manter o tratamento defensivo implementado na função `transformEvents` para lidar com dados inconsistentes.
