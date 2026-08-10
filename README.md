# Orbe Core Banking

**Sistema Core Banking Modular com Arquitetura de Microserviços**

Este é um projeto de sistema core banking moderno construído com arquitetura de microserviços, focado em modularidade, escalabilidade e conformidade com regulamentações financeiras brasileiras (PIX, SPI, DICT).

## 🏗️ Arquitetura do Sistema

O sistema é composto por múltiplos microserviços especializados que se comunicam via mensageria assíncrona (RabbitMQ) e APIs REST:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Orbe Core Banking System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │              │     │              │     │              │    │
│  │ Orbe Ledger  │◄────┤ Orbe Services│◄────┤ SPI Simulator│    │
│  │              │     │              │     │              │    │
│  │ Contabilidade│     │ Catálogo de  │     │ Mock SPI/DICT│    │
│  │ e Ledger     │     │ Serviços e  │     │ do Bacen     │    │
│  │              │     │ Taxas       │     │              │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                     │                     │           │
│         └─────────────────────┴─────────────────────┘           │
│                           │                                      │
│                           ▼                                      │
│                  ┌──────────────┐                               │
│                  │   RabbitMQ    │                               │
│                  │  Message Bus  │                               │
│                  └──────────────┘                               │
│                           │                                      │
│                           ▼                                      │
│                  ┌──────────────┐                               │
│                  │  PostgreSQL   │                               │
│                  │  Multi-DB     │                               │
│                  └──────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Microserviços

### 1. Orbe Ledger
**Porta**: 3000
**Banco de Dados**: `main-ledger`
**Responsabilidade**: Sistema de contabilidade e ledger principal

- Gestão de contas e transações
- Sistema de double-entry bookkeeping
- Gestão de journals e reconciliação
- Controle de limites e holds
- Saga pattern para transações distribuídas

### 2. Orbe Services
**Porta**: 3001
**Banco de Dados**: `orbe-services`
**Responsabilidade**: Catálogo de serviços e taxas

- Gestão de serviços bancários (PIX, TED, DOC)
- Configuração de taxas e impostos
- Cálculo de tarifas
- Configuração de metadados de serviços

### 3. SPI Simulator
**Porta**: 3002
**Banco de Dados**: `spi-simulator`
**Responsabilidade**: Simulador do SPI e DICT do Bacen

- Mock do ambiente de produção do SPI
- Simulação de operações PIX
- Simulação de consultas DICT
- Geração de eventos de ciclo de vida
- Cenários de teste (sucesso, falha, timeout, compensação)

## 🚀 Tecnologias

### Backend
- **Framework**: NestJS (TypeScript)
- **ORM**: TypeORM
- **Banco de Dados**: PostgreSQL
- **Message Broker**: RabbitMQ
- **Documentação**: Swagger/OpenAPI
- **Validação**: class-validator

### Infraestrutura
- **Containerization**: Docker & Docker Compose
- **Management**: pgAdmin (PostgreSQL), RabbitMQ Management UI

## 🔧 Configuração Rápida

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+
- npm ou yarn

### Instalação

1. **Clone o repositório**:
   ```bash
   git clone <repository-url>
   cd orbe-ledger\ -\ v2
   ```

2. **Inicie a infraestrutura**:
   ```bash
   docker-compose up -d
   ```

3. **Configure os serviços**:
   ```bash
   # Para cada serviço, copie o .env.example para .env
   cd orbe-ledger
   cp .env.example .env
   cd ../orbe-services
   cp .env.example .env
   cd ../spi-simulator
   cp .env.example .env
   ```

4. **Instale as dependências e inicie os serviços**:
   ```bash
   # Orbe Ledger
   cd orbe-ledger
   npm install
   npm run start:dev

   # Orbe Services (em outro terminal)
   cd orbe-services
   npm install
   npm run start:dev

   # SPI Simulator (em outro terminal)
   cd spi-simulator
   npm install
   npm run start:dev
   ```

## 📡 Acesso aos Serviços

### APIs
- **Orbe Ledger**: http://localhost:3000/api
- **Orbe Services**: http://localhost:3001/api
- **SPI Simulator**: http://localhost:3002/api

### Infraestrutura
- **RabbitMQ Management**: http://localhost:15672
  - User: `orbe-ledger`
  - Password: `orbe-ledger`
- **pgAdmin**: http://localhost:8080
  - Email: `admin@admin.com`
  - Password: `orbe-ledger`

## 🗄️ Bancos de Dados

O sistema utiliza uma instância PostgreSQL com múltiplos bancos de dados:

1. **main-ledger**: Banco de dados do sistema de contabilidade
2. **orbe-services**: Banco de dados do catálogo de serviços
3. **spi-simulator**: Banco de dados do simulador SPI

Cada banco de dados tem seu próprio usuário dedicado para isolamento de responsabilidade.

## 📋 Fluxo de Operação PIX

```text
1. Cliente inicia transação PIX
   ↓
2. Orbe Services calcula taxas
   ↓
3. Orbe Ledger registra no ledger
   ↓
4. SPI Simulator simula processamento SPI
   ↓
5. Eventos são publicados no RabbitMQ
   ↓
6. Sistema responde ao cliente
```

## 🔐 Segurança

- Validação de entrada em todos os endpoints
- Autenticação de instituições participantes
- Logs detalhados para auditoria
- Isolamento de bancos de dados por serviço
- Configuração de CORS por serviço

## 📊 Monitoramento

Cada serviço inclui:
- Logging estruturado
- Tracing de operações
- Métricas de performance
- Health checks
- Documentação Swagger

## 🧪 Testes

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📚 Documentação

- [Orbe Ledger README](./orbe-ledger/README.md)
- [Orbe Services README](./orbe-services/README.md)
- [SPI Simulator README](./spi-simulator/README.md)
- [SPI Simulator TODO Implementation](./spi-simulator/TODO_IMPLEMENTATION.md)

## 🚦 Status do Projeto

### ✅ Implementado
- Arquitetura de microserviços
- Configuração de RabbitMQ com exchanges e filas
- Configuração de PostgreSQL com múltiplos bancos
- Entidades básicas de cada serviço
- Integração via mensageria
- Documentação Swagger
- TODOs para implementação customizada

### 🚧 Em Desenvolvimento
- Validações customizadas do SPI/DICT
- Implementação completa de regras de negócio
- Testes de integração
- Monitoramento avançado

### 📋 Planejado
- Autenticação e autorização avançada
- Rate limiting
- Cache distribuído
- Circuit breakers
- Métricas avançadas com Prometheus/Grafana

## 🤝 Contribuindo

Este é um projeto educacional/demonstrativo de um sistema core banking. Sinta-se livre para explorar, modificar e contribuir.

## ⚠️ Aviso Importante

Este projeto é **apenas para fins educacionais e de demonstração**. Não deve ser usado em produção sem modificações significativas para atender requisitos reais de segurança, compliance e regulamentação financeira.

## 📄 Licença

UNLICENSED - Projeto privado.
