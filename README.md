# Orbe Core Banking

> Um sistema core banking modular inspirado nas melhores práticas open source do setor financeiro

![Arquitetura do Sistema](./images/core%20banking%20general%20archtecture.jpeg)

**Desenvolvido por um entusiasta do sistema financeiro brasileiro 🇧🇷**

Este é um projeto pessoal de um sistema core banking moderno, construído como laboratório de aprendizado e experimentação de arquiteturas financeiras. Inspirado em soluções open source como [Mojaloop](https://mojaloop.io/) e [Apache Fineract](https://fineract.apache.org/), busca implementar padrões modernos de sistemas bancários com foco na realidade do mercado brasileiro (PIX, SPI, DICT).

## 🎯 Objetivo do Projeto

Criar um sistema core banking educacional que demonstre:

- Arquitetura de microserviços em ambientes financeiros
- Implementação de double-entry bookkeeping
- Integração com sistemas de mensageria (RabbitMQ)
- Conformidade com regulamentações brasileiras (PIX, SPI, DICT)
- Padrões de segurança e auditoria bancária

## 🏗️ Arquitetura do Sistema

O sistema segue uma arquitetura de microserviços modular com comunicação via mensageria assíncrona e APIs REST:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Orbe Core Banking System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │              │     │              │     │              │    │
│  │   Kong API   │◄────┤ Orbe Ledger  │◄────┤ Orbe Services│    │
│  │   Gateway    │     │              │     │              │    │
│  │              │     │ Contabilidade│     │ Catálogo de  │    │
│  └──────────────┘     │ e Ledger     │     │ Serviços e  │    │
│         │             │              │     │ Taxas       │    │
│         └─────────────┴──────────────┘     └──────────────┘    │
│                           │                                      │
│                           ▼                                      │
│                  ┌──────────────┐                               │
│                  │  PostgreSQL   │                               │
│                  │  Multi-DB     │                               │
│                  └──────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Microserviços Atuais

### 1. Orbe Ledger

**Porta**: 3000 | **Banco de Dados**: `main-ledger`
**Responsabilidade**: Sistema de contabilidade e ledger principal

- ✅ Gestão de contas e transações
- ✅ Sistema de double-entry bookkeeping
- ✅ Gestão de journals e reconciliação
- ✅ Controle de limites e holds
- 🚧 Saga pattern para transações distribuídas
- 🚧 Integração com RabbitMQ

### 2. Orbe Services

**Porta**: 3001 | **Banco de Dados**: `orbe-services`
**Responsabilidade**: Catálogo de serviços e taxas

- ✅ Gestão de serviços bancários (PIX, TED, DOC)
- ✅ Configuração de taxas e impostos
- ✅ Cálculo de tarifas
- ✅ Seed de dados iniciais
- 🚧 Integração com Kong API Gateway

### 3. Kong API Gateway

**Porta**: 8000 (HTTP) | 8443 (HTTPS)
**Responsabilidade**: Gateway de API e roteamento

- ✅ Roteamento de solicitações
- ✅ Health checks dos serviços
- ✅ Balanceamento de carga
- 🚧 Autenticação e autorização
- 🚧 Rate limiting

## 🚧 Serviços Pendentes

### 3. SPI Simulator

**Status**: Planejado
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
- **API Gateway**: Kong
- **Documentação**: Swagger/OpenAPI
- **Validação**: class-validator

### Infraestrutura

- **Containerization**: Docker & Docker Compose
- **Message Broker**: RabbitMQ (planejado)
- **Volume Management**: Docker volumes para persistência

## 🔧 Configuração Rápida

### Pré-requisitos

- Docker e Docker Compose
- Node.js 18+
- npm ou yarn

### Instalação

1. **Clone o repositório**:

   ```bash
   git clone <repository-url>
   cd "orbe-ledger - v2"
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
   ```

4. **Acesse os serviços**:
   - **Orbe Ledger**: http://localhost:3000/api
   - **Orbe Services**: http://localhost:3001/api
   - **Kong Gateway**: http://localhost:8000
   - **pgAdmin**: http://localhost:8080 (desativado por padrão)

## 📡 Acesso aos Serviços

### APIs via Kong Gateway

- **Orbe Ledger**: http://localhost:8000/orbe-ledger
- **Orbe Services**: http://localhost:8000/orbe-services
- **Health Checks**: http://localhost:8000/orbe-ledger/health

### APIs Diretas

- **Orbe Ledger**: http://localhost:3000/api
- **Orbe Services**: http://localhost:3001/api

### Infraestrutura

- **Kong Admin**: http://localhost:8001
- **PostgreSQL**: localhost:5432

## 🗄️ Bancos de Dados

O sistema utiliza uma instância PostgreSQL com múltiplos bancos de dados:

1. **main-ledger**: Banco de dados do sistema de contabilidade
   - Usuário: `orbe-ledger`
   - Senha: `orbe-ledger`

2. **orbe-services**: Banco de dados do catálogo de serviços
   - Usuário: `orbe-services`
   - Senha: `orbe-services`

Cada banco de dados tem seu próprio usuário dedicado para isolamento de responsabilidade.

## 📋 Checklist de Implementação

Baseado na arquitetura de referência, aqui está o roadmap do projeto:

### ✅ Fundação (Concluído)

- [x] Arquitetura de microserviços
- [x] Configuração de PostgreSQL com múltiplos bancos
- [x] Kong API Gateway
- [x] Health checks
- [x] Seed de dados (serviços e taxas)
- [x] Integração básica entre serviços

### 🚧 Core Banking (Em Desenvolvimento)

- [ ] Sistema completo de double-entry bookkeeping
- [ ] Gestão de journals e reconciliação
- [ ] Saga pattern para transações distribuídas
- [ ] RabbitMQ para mensageria
- [ ] Integração completa entre Ledger e Services

### 📋 Serviços Financeiros (Pendente)

- [ ] **Transferências**
  - [ ] PIX completo com validações SPI
  - [ ] TED e DOC com integração bancária
  - [ ] Transferências internas
  - [ ] Transferências internacionais (SWIFT)

- [ ] **Pagamentos**
  - [ ] Emissão e registro de boletos
  - [ ] Pagamento de boletos
  - [ ] Operações em dinheiro (saque/depósito)
  - [ ] Gestão de cheques

- [ ] **Crédito**
  - [ ] Cartão de crédito
  - [ ] Empréstimo pessoal
  - [ ] Empréstimo consignado
  - [ ] Empréstimo payroll
  - [ ] Financiamento
  - [ ] Cheque especial

- [ ] **Investimentos**
  - [ ] Poupança
  - [ ] Renda fixa
  - [ ] Renda variável
  - [ ] Gestão de investimentos

- [ ] **Seguros**
  - [ ] Seguro de vida
  - [ ] Seguro auto
  - [ ] Seguro residencial
  - [ ] Outros tipos de seguro

- [ ] **Câmbio**
  - [ ] Câmbio de moedas
  - [ ] Remessas internacionais
  - [ ] Operações SWIFT

### 🔐 Segurança e Compliance (Pendente)

- [ ] Autenticação e autorização (JWT/OAuth2)
- [ ] Rate limiting
- [ ] Cache distribuído (Redis)
- [ ] Circuit breakers
- [ ] Criptografia de dados sensíveis
- [ ] Logs detalhados para auditoria
- [ ] Conformidade com LGPD

### 📊 Monitoramento e Observabilidade (Pendente)

- [ ] Métricas avançadas com Prometheus
- [ ] Dashboards com Grafana
- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] Alerting e notificações
- [ ] Log aggregation (ELK Stack)

### 🧪 Testes e Qualidade (Pendente)

- [ ] Testes unitários completos
- [ ] Testes de integração
- [ ] Testes E2E
- [ ] Testes de carga e performance
- [ ] Testes de segurança
- [ ] Code coverage (>80%)

### 📚 Documentação (Pendente)

- [ ] Documentação técnica completa
- [ ] Diagramas de arquitetura
- [ ] Guias de desenvolvimento
- [ ] Documentação de APIs
- [ ] Tutoriais e exemplos

## 🔐 Segurança

Atualmente implementado:

- ✅ Validação de entrada em todos os endpoints
- ✅ Isolamento de bancos de dados por serviço
- ✅ Configuração de CORS por serviço
- ✅ Health checks para monitoramento

Planejado:

- 🚧 Autenticação de instituições participantes
- 🚧 Logs detalhados para auditoria
- 🚧 Criptografia de dados sensíveis
- 🚧 Rate limiting e proteção contra DDoS

## 📊 Monitoramento

Cada serviço inclui:

- ✅ Logging estruturado
- ✅ Tracing de operações
- ✅ Health checks
- ✅ Documentação Swagger
- 🚧 Métricas de performance
- 🚧 Distributed tracing

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
- [Database Setup Guide](./DATABASE_SETUP.md)

## 🌟 Inspirações

Este projeto foi inspirado em soluções open source que estão transformando o setor financeiro:

- **[Mojaloop](https://mojaloop.io/)** - Plataforma de serviços financeiros interoperáveis para inclusão financeira
- **[Apache Fineract](https://fineract.apache.org/)** - Plataforma de core banking para mercados emergentes
- **[Mifos X](https://mifos.org/)** - Plataforma de gestão financeira para microfinanças
- **[Open Bank Project](https://www.openbankproject.com/)** - Plataforma de core banking open source

## 🤝 Contribuindo

Este é um projeto educacional/demonstrativo de um sistema core banking. Sinta-se livre para:

- Explorar o código e a arquitetura
- Sugerir melhorias e novos recursos
- Reportar bugs e problemas
- Contribuir com documentação
- Comparthar suas experiências

## ⚠️ Aviso Importante

Este projeto é **apenas para fins educacionais e de demonstração**. Não deve ser usado em produção sem modificações significativas para atender requisitos reais de:

- Segurança bancária
- Compliance regulatório
- Alta disponibilidade
- Performance em escala
- Recuperação de desastres

## 📄 Licença

UNLICENSED - Projeto privado e educacional.

---

**Desenvolvido com ❤️ por um entusiasta do sistema financeiro brasileiro**

"Inspirado pelas possibilidades que a tecnologia traz para a inclusão financeira"
