# MapaSysConecte

Sistema de gerenciamento integrado para provedores de internet, desenvolvido para a Conecte Telecom.

## 📋 Sobre o Projeto

O MapaSysConecte é uma aplicação web completa para gerenciamento de operações de provedores de internet, incluindo:

- Gestão de clientes e contratos
- Gerenciamento de planos de internet
- Mapeamento de rede com visualização geográfica
- Controle financeiro e faturamento
- Gestão de suporte técnico e atendimento
- Agenda de instalações e manutenções
- Controle de estoque de equipamentos
- Dashboard com indicadores de desempenho

## 🚀 Tecnologias Utilizadas

- **Frontend**:
  - React 18
  - TypeScript
  - Vite
  - TailwindCSS
  - React Router v7
  - React Quill (editor de texto rico)
  - React Toastify (notificações)
  - Chart.js e Recharts (gráficos)
  - FullCalendar (agenda)
  - React Google Maps API (mapas)
  - HTML2PDF (geração de documentos)

- **Backend**:
  - Node.js com Express
  - Supabase (banco de dados PostgreSQL e autenticação)
  - API RESTful

## ✨ Funcionalidades Principais

### 📝 Gestão de Contratos
- Criação e edição de contratos de adesão, permanência e rescisão
- Geração de PDFs formatados profissionalmente
- Assinaturas digitais

### 🗺️ Mapeamento Geográfico
- Visualização de clientes em mapa interativo
- Geocodificação bidirecional (endereço ↔ coordenadas)
- Planejamento de rotas para técnicos

### 💰 Financeiro
- Controle de pagamentos e inadimplência
- Relatórios financeiros
- Fluxo de caixa

### 👥 Gestão de Clientes
- Cadastro completo de clientes
- Histórico de atendimentos
- Controle de equipamentos instalados

### 📡 Gestão de Rede
- Monitoramento de equipamentos
- Controle de IPs e PPPoE
- Gestão de infraestrutura

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- NPM ou Yarn
- Conta no Supabase
- Chave de API do Google Maps (para funcionalidades de mapa)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Anderson-Apanet/mapasysconecte.git
cd mapasysconecte
```

2. Instale as dependências:
```bash
npm install
# ou
yarn
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_GOOGLE_MAPS_API_KEY=sua_chave_api_do_google_maps
```

4. Inicie o servidor de desenvolvimento:
```bash
# Para rodar frontend e backend juntos
npm run dev

# Para rodar apenas o frontend
npm run dev:frontend

# Para rodar apenas o backend
npm run dev:backend
```

## 🔧 Estrutura do Projeto

```
mapasysconecte/
├── public/            # Arquivos estáticos
├── server/            # Código do servidor
├── src/
│   ├── assets/        # Imagens e outros recursos
│   ├── components/    # Componentes React reutilizáveis
│   ├── config/        # Configurações da aplicação
│   ├── contexts/      # Contextos React
│   ├── hooks/         # Hooks personalizados
│   ├── lib/           # Bibliotecas e utilitários
│   ├── pages/         # Páginas da aplicação
│   ├── server/        # Código do servidor
│   ├── services/      # Serviços de API
│   ├── styles/        # Estilos globais
│   ├── types/         # Definições de tipos TypeScript
│   └── utils/         # Funções utilitárias
└── supabase/          # Configurações do Supabase
```

## 📱 Capturas de Tela

*[Adicionar capturas de tela da aplicação aqui]*

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença [MIT](LICENSE).

## 📞 Contato

Para mais informações, entre em contato com:
- Email: conecte@seconecte.net
- Website: [seconecte.net](https://seconecte.net)
