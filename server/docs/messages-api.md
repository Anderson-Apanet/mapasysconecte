# API de Mensagens Automáticas

Esta documentação descreve os endpoints disponíveis para gerenciar o envio automático de mensagens WhatsApp para clientes.

## Endpoints

### 1. Obter Mensagens Pendentes

**Endpoint:** `GET /api/messages/pending`

Este endpoint retorna todas as mensagens que estão pendentes para envio, com base nos tipos de mensagem ativos e nos contratos que atendem aos critérios de cada tipo.

**Resposta:**
```json
{
  "mensagens": [
    {
      "id_contrato": 123,
      "id_tipo_mensagem": 1,
      "telefone": "5511999999999",
      "nome_cliente": "Nome do Cliente",
      "mensagem_enviada": "Olá Nome do Cliente, sua fatura no valor de R$ 99.90 vence em 2 dias."
    },
    ...
  ]
}
```

### 2. Registrar Mensagens Enviadas

**Endpoint:** `POST /api/messages/registrar-envio`

Este endpoint registra na tabela `mensagens_enviadas` as mensagens que foram enviadas com sucesso.

**Corpo da Requisição:**
```json
{
  "mensagens": [
    {
      "id_contrato": 123,
      "id_tipo_mensagem": 1,
      "telefone": "5511999999999",
      "nome_cliente": "Nome do Cliente",
      "mensagem_enviada": "Olá Nome do Cliente, sua fatura no valor de R$ 99.90 vence em 2 dias."
    },
    ...
  ]
}
```

**Resposta:**
```json
{
  "success": true,
  "mensagens_registradas": 1,
  "registros": [
    {
      "id": 1,
      "id_contrato": 123,
      "id_tipo_mensagem": 1,
      "telefone": "5511999999999",
      "nome_cliente": "Nome do Cliente",
      "mensagem_enviada": "Olá Nome do Cliente, sua fatura no valor de R$ 99.90 vence em 2 dias.",
      "data_envio": "2025-03-20T13:49:58.000Z"
    }
  ]
}
```

## Integração com N8N

Para configurar o envio automático de mensagens no N8N:

1. Crie um novo workflow no N8N
2. Adicione um nó de trigger "Cron" para executar o workflow periodicamente (por exemplo, todos os dias às 8h)
3. Adicione um nó HTTP Request para chamar o endpoint `/api/messages/pending`
4. Adicione um nó "Split In Batches" para processar cada mensagem individualmente
5. Adicione um nó para o serviço de envio de WhatsApp (por exemplo, Twilio, WhatsApp Business API, etc.)
6. Adicione outro nó HTTP Request para registrar as mensagens enviadas usando o endpoint `/api/messages/registrar-envio`

### Exemplo de Fluxo no N8N:

```
[Cron Trigger] -> [HTTP Request: GET /api/messages/pending] -> [Split In Batches] -> 
[WhatsApp Service] -> [HTTP Request: POST /api/messages/registrar-envio]
```

## Placeholders Disponíveis

Os seguintes placeholders podem ser usados nos templates de mensagem:

- `{cliente}` - Nome do cliente
- `{valor}` - Valor da mensalidade do contrato
- `{dias_vencimento}` - Dias até o vencimento (para lembretes antes do vencimento)
- `{dias_atraso}` - Dias de atraso (para avisos após o vencimento)
