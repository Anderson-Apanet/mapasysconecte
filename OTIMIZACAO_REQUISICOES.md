# Otimização de Requisições ao Supabase

## Problema Identificado

Identificamos um problema crítico de desempenho: o sistema estava fazendo uma requisição separada ao Supabase para buscar os responsáveis de cada evento. Com muitos eventos, isso resultava em centenas ou até milhares de requisições simultâneas, causando erros de `ERR_INSUFFICIENT_RESOURCES`.

## Solução Implementada

Modificamos a função `fetchEvents` para buscar todos os responsáveis de uma vez, em vez de fazer uma requisição para cada evento:

### 1. Busca Única de Responsáveis

Em vez de fazer uma requisição por evento:

```typescript
// Código antigo - uma requisição por evento
const eventsWithResponsaveis = await Promise.all(eventData.map(async (eventData) => {
  const { data: respData } = await supabase
    .from('agenda_responsaveis')
    .select(`user_id`)
    .eq('agenda_id', eventData.id);
  
  // Mais requisições para buscar dados dos usuários...
}));
```

Agora fazemos uma única requisição para todos os eventos:

```typescript
// Código novo - uma única requisição para todos os eventos
const eventIds = eventData.map(event => event.id);

const { data: allResponsaveis } = await supabase
  .from('agenda_responsaveis')
  .select(`
    id,
    id_usuario,
    id_agenda,
    usuarios (
      id,
      nome
    )
  `)
  .in('id_agenda', eventIds);
```

### 2. Organização Eficiente dos Dados

Após buscar todos os responsáveis, organizamos os dados de forma eficiente:

```typescript
// Organizar responsáveis por id_agenda
const responsaveisPorEvento = {};
allResponsaveis?.forEach(resp => {
  if (!responsaveisPorEvento[resp.id_agenda]) {
    responsaveisPorEvento[resp.id_agenda] = [];
  }
  
  responsaveisPorEvento[resp.id_agenda].push({
    id: resp.id_usuario,
    nome: resp.usuarios?.nome || 'Desconhecido'
  });
});

// Adicionar responsáveis aos eventos
const eventsWithResponsaveis = eventData.map(event => {
  return {
    ...event,
    responsaveis: responsaveisPorEvento[event.id] || []
  };
});
```

### 3. Uso de Join no Supabase

Aproveitamos o recurso de join do Supabase para buscar os dados dos usuários junto com os responsáveis, eliminando a necessidade de requisições adicionais.

## Benefícios da Otimização

1. **Redução Drástica de Requisições**: De potencialmente milhares para apenas uma requisição.

2. **Melhor Performance**: Menor carga no servidor e no navegador.

3. **Eliminação de Erros de Recursos**: Evita o erro `ERR_INSUFFICIENT_RESOURCES` que ocorria devido ao excesso de requisições simultâneas.

4. **Resposta Mais Rápida**: O calendário carrega muito mais rapidamente.

## Impacto na Experiência do Usuário

- **Carregamento Mais Rápido**: O calendário carrega em uma fração do tempo anterior.
- **Sem Erros Visíveis**: Eliminação dos erros que apareciam no console.
- **Experiência Fluida**: O usuário pode navegar pelo calendário sem travamentos.

Esta otimização, combinada com o carregamento por período implementado anteriormente, torna o calendário muito mais eficiente e responsivo, mesmo com grandes volumes de dados.
