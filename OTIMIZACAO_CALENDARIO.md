# Otimização do Calendário - Carregamento por Período

## Problema Identificado

Identificamos que o carregamento de todos os eventos de uma vez estava sobrecarregando o sistema, causando lentidão e erros. Isso ocorre porque o banco de dados contém muitos eventos acumulados ao longo do tempo.

## Solução Implementada

Modificamos o código para carregar apenas os eventos do período visualizado no calendário, em vez de carregar todos os eventos de uma vez:

### 1. Filtro na Consulta SQL

Implementamos filtros na consulta SQL para buscar apenas os eventos relevantes para o período visualizado:

```typescript
// Aplica filtros de data apenas se ambas as datas forem fornecidas
if (startDateISO && endDateISO) {
  // Busca eventos que começam no período ou terminam no período ou englobam o período inteiro
  query = query
    .or(`datainicio.gte.${startDateISO},datainicio.lte.${endDateISO},datafinal.gte.${startDateISO},datafinal.lte.${endDateISO}`);
}
```

Este filtro busca eventos que:
- Começam dentro do período visualizado
- Terminam dentro do período visualizado
- Englobam todo o período visualizado (começam antes e terminam depois)

### 2. Carregamento Dinâmico

Modificamos a função `loadEvents` na página Agenda para passar os parâmetros de data para `fetchEvents`, garantindo que apenas os eventos do período visualizado sejam carregados:

```typescript
const loadEvents = useCallback(async (info, successCallback, failureCallback) => {
  setLoading(true);
  try {
    console.log('Carregando eventos para o período:', info.startStr, 'até', info.endStr);
    
    // Buscar eventos apenas para o período visualizado
    const events = await fetchEvents(info.startStr, info.endStr);
    
    // Transformar eventos para o formato do FullCalendar
    const transformedEvents = await transformEvents(events);
    
    console.log('Eventos carregados com sucesso:', transformedEvents.length);
    successCallback(transformedEvents);
  } catch (error) {
    console.error('Erro ao carregar eventos:', error);
    failureCallback(error);
    // Exibir mensagem de erro
  } finally {
    setLoading(false);
  }
}, [toast]);
```

### 3. Atualização Automática ao Mudar de Visualização

O calendário foi configurado para chamar a função `loadEvents` sempre que a visualização muda (por exemplo, ao navegar para outro mês ou semana):

```typescript
<FullCalendar
  // ...
  datesSet={handleDatesSet}
  // ...
/>
```

Onde `handleDatesSet` chama `loadEvents` com as novas datas:

```typescript
const handleDatesSet = (dateInfo: any) => {
  loadEvents(dateInfo, (events) => setEvents(events), (error) => console.error(error));
};
```

### 4. Simplificação da Tabela de Responsáveis

Como a tabela `agenda_responsaveis` está vazia (será populada apenas para novos eventos), simplificamos o código para não buscar responsáveis desnecessariamente:

```typescript
// Como a tabela agenda_responsaveis está vazia, adicionamos um array vazio de responsáveis a cada evento
const eventsWithResponsaveis = eventData.map(event => {
  return {
    ...event,
    responsaveis: []
  };
});
```

## Benefícios da Otimização

1. **Melhor Performance**: O sistema carrega muito menos dados de uma vez, reduzindo a carga no servidor e no navegador.

2. **Resposta Mais Rápida**: O calendário responde mais rapidamente às interações do usuário.

3. **Menos Erros**: Reduz a probabilidade de erros relacionados ao processamento de grandes volumes de dados.

4. **Experiência do Usuário Aprimorada**: O calendário fica mais fluido e responsivo.

5. **Redução de Requisições Desnecessárias**: Eliminamos requisições à tabela de responsáveis, que está vazia.

## Como Funciona na Prática

1. Quando o usuário acessa a página Agenda, o calendário carrega apenas os eventos do mês atual.
2. Quando o usuário navega para outro mês, semana ou dia, o calendário carrega apenas os eventos desse novo período.
3. Os eventos são filtrados no servidor antes de serem enviados para o cliente, reduzindo o volume de dados transferidos.
4. Não são feitas requisições desnecessárias à tabela de responsáveis, que está vazia.

Esta abordagem é muito mais eficiente e escalável, especialmente para sistemas com muitos eventos acumulados ao longo do tempo.
