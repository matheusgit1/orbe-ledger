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

> ⚠️ **Aviso**: Este projeto está em desenvolvimento ativo. A arquitetura e componentes podem sofrer alterações significativas durante o processo de evolução.

O sistema segue uma arquitetura de microserviços modular com comunicação via mensageria assíncrona e APIs REST:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Orbe Core Banking System                         │
│                         (Em Desenvolvimento)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │                        API Gateway Layer                        │    │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │    │
│   │  │              │  │              │  │              │         │    │
│   │  │  Kong API    │  │  Health      │  │  Monitoring  │         │    │
│   │  │  Gateway     │  │  Checks      │  │  (Prometheus)│         │    │
│   │  │  :8000/8443  │  │              │  │  (Planejado) │         │    │
│   │  └──────────────┘  └──────────────┘  └──────────────┘         │    │
│   └──────────────────────────────────────────────────────────────┘    │
│              │                    │                    │               │
│              ▼                    ▼                    ▼               │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │                    Application Layer                           │    │
│   │                                                                │    │
│   │  ┌──────────────────┐      ┌──────────────────┐              │    │
│   │  │                  │      │                  │              │    │
│   │  │   Orbe Ledger    │      │  Orbe Services   │              │    │
│   │  │   :3000          │      │  :3001           │              │    │
│   │  │                  │      │                  │              │    │
│   │  │ • Contabilidade  │      │ • Catálogo de    │              │    │
│   │  │ • Double-entry   │      │   Serviços       │              │    │
│   │  │ • Journals       │      │ • Taxas e Tarifas│              │    │
│   │  │ • Reconciliação  │      │ • Configurações  │              │    │
│   │  │                  │      │                  │              │    │
│   │  └──────────────────┘      └──────────────────┘              │    │
│   │                                                                │    │
│   │  ┌──────────────────┐      ┌──────────────────┐              │    │
│   │  │  SPI Simulator   │      │  RabbitMQ        │              │    │
│   │  │  (Planejado)     │      │  (Planejado)      │              │    │
│   │  │  :3002           │      │  :5672/15672      │              │    │
│   │  └──────────────────┘      └──────────────────┘              │    │
│   └──────────────────────────────────────────────────────────────┘    │
│              │                    │                    │               │
│              └────────────────────┴────────────────────┘           │
│                                   │                                 │
│                                   ▼                                 │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │                      Data Layer                                │    │
│   │                                                                │    │
│   │  ┌──────────────────────────────────────────────────┐        │    │
│   │  │             PostgreSQL Multi-Database             │        │    │
│   │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │        │    │
│   │  │  │ main-ledger  │  │orbe-services │  │spi-sim   │ │        │    │
│   │  │  │ (Contabilidade)│ (Catálogo)   │  │(SPI/DICT)│ │        │    │
│   │  │  └──────────────┘  └──────────────┘  └──────────┘ │        │    │
│   │  └──────────────────────────────────────────────────┘        │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
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
- **Orchestration**: Kubernetes (Minikube)
- **Message Broker**: RabbitMQ (planejado)
- **Volume Management**: Docker volumes e PersistentVolumes para persistência

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

## 🚀 Deploy no Kubernetes

### Opção 1: Docker Desktop Kubernetes (Recomendado para Windows)

Esta opção usa o Kubernetes integrado do Docker Desktop, que é mais simples no Windows.

#### Pré-requisitos

- Docker Desktop instalado
- Kubernetes habilitado no Docker Desktop

#### Habilitar Kubernetes no Docker Desktop

1. Abra o Docker Desktop
2. Vá em **Settings > Kubernetes**
3. Habilite **"Enable Kubernetes"**
4. Clique em **"Apply & Restart"**
5. Aguarde o Kubernetes iniciar

#### Deploy com um único comando

```powershell
.\deploy-docker-k8s.ps1
```

Este script automaticamente:

1. Verifica se o Kubernetes do Docker Desktop está rodando
2. Constrói as imagens Docker localmente
3. Aplica todos os manifests Kubernetes
4. Aguarda todos os pods ficarem prontos
5. Exibe as URLs de acesso aos serviços

#### Acesso aos Serviços

Após o deploy, os serviços estarão disponíveis em:

- **Kong Gateway**: http://localhost:30080
- **Orbe Ledger**: http://localhost:30080/orbe-ledger
- **Orbe Services**: http://localhost:30080/orbe-services
- **Kong Admin**: http://localhost:30081

#### Comandos úteis

```powershell
# Ver status dos pods
kubectl get pods

# Ver logs de um pod específico
kubectl logs -f <pod-name>

# Ver serviços
kubectl get services

# Limpar o deploy
.\cleanup-docker-k8s.ps1
```

### Opção 2: Minikube

#### Pré-requisitos

- Minikube instalado
- kubectl configurado
- Docker instalado

#### Deploy com um único comando

**No Windows (PowerShell):**

```powershell
.\deploy-minikube.ps1
```

**No Linux/Mac (Bash):**

```bash
chmod +x deploy-minikube.sh
./deploy-minikube.sh
```

Este script automaticamente:

1. Verifica e inicia o Minikube se necessário
2. Configura o ambiente Docker para usar o daemon do Minikube
3. Constrói as imagens Docker localmente
4. Aplica todos os manifests Kubernetes
5. Aguarda todos os pods ficarem prontos
6. Exibe as URLs de acesso aos serviços

#### Acesso aos Serviços

Após o deploy, os serviços estarão disponíveis nas URLs fornecidas pelo script:

- **Kong Gateway**: URL fornecida pelo Minikube
- **Orbe Ledger**: `{KONG_URL}/orbe-ledger`
- **Orbe Services**: `{KONG_URL}/orbe-services`
- **Kong Admin**: URL fornecida pelo Minikube na porta 8001

#### Comandos úteis

```bash
# Ver status dos pods
kubectl get pods

# Ver logs de um pod específico
kubectl logs -f <pod-name>

# Ver serviços
kubectl get services

# Acessar o dashboard do Minikube
minikube dashboard

# Limpar o deploy
# Windows:
.\cleanup-minikube.ps1
# Linux/Mac:
./cleanup-minikube.sh
```

### Estrutura Kubernetes

O projeto inclui manifests Kubernetes completos no diretório `k8s/`:

- `configmap.yaml` - Configurações gerais
- `secret.yaml` - Senhas e dados sensíveis
- `postgres-init-configmap.yaml` - Script de inicialização do PostgreSQL
- `postgres.yaml` - Deployment e Service do PostgreSQL com PVC
- `orbe-ledger.yaml` - Deployment e Service do Orbe Ledger
- `orbe-services.yaml` - Deployment e Service do Orbe Services
- `kong-configmap.yaml` - Configuração do Kong
- `kong.yaml` - Deployment e Service do Kong
- `kustomization.yaml` - Kustomize para deploy unificado

## 📊 Acessar o Kubernetes Dashboard

Para acessar a interface gráfica do Kubernetes:

### Script Automático (Recomendado)

**Windows:**

```powershell
.\setup-dashboard.ps1
```

**Linux/Mac:**

```bash
chmod +x setup-dashboard.sh
./setup-dashboard.sh
```

Este script automaticamente:

1. Instala o Kubernetes Dashboard
2. Cria usuário admin com permissões
3. Gera token de acesso
4. Inicia o proxy (opcionalmente)

### Manualmente

```powershell
# Instalar o dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Criar usuário admin
kubectl create serviceaccount dashboard-admin-sa
kubectl create clusterrolebinding dashboard-admin-sa --clusterrole=cluster-admin --serviceaccount=default:dashboard-admin-sa

# Obter token para login
kubectl create token dashboard-admin-sa

# Iniciar proxy
kubectl proxy
```

### Acesso

Após executar o proxy, acesse o dashboard em:
**http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/**

Use o token obtido no comando `kubectl create token dashboard-admin-sa` para fazer login.

### Remover o Dashboard

Para remover o Kubernetes Dashboard:

**Windows:**

```powershell
.\cleanup-dashboard.ps1
```

**Linux/Mac:**

```bash
kubectl delete -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
kubectl delete serviceaccount dashboard-admin-sa
kubectl delete clusterrolebinding dashboard-admin-sa
```

## 🔧 Solução de Problemas

### Problema: Erro de volume do PostgreSQL

Se você encontrar um erro relacionado ao formato de dados do PostgreSQL em versões 18+:

**Windows:**

```powershell
.\fix-postgres-volume.ps1
```

**Linux/Mac:**

```bash
chmod +x fix-postgres-volume.sh
./fix-postgres-volume.sh
```

Este script:

1. Remove o deployment do PostgreSQL
2. Remove o PVC existente (isso apaga os dados)
3. Recria o PostgreSQL com a configuração correta de volume
4. Aguarda o PostgreSQL ficar pronto

**Nota**: Isso irá apagar todos os dados existentes do PostgreSQL. Use apenas se você não tiver dados importantes ou se estiver em ambiente de desenvolvimento.

### Ver status dos pods

```powershell
# Ver todos os pods
kubectl get pods

# Ver pods com mais detalhes
kubectl get pods -o wide

# Ver logs de um pod específico
kubectl logs -f <nome-do-pod>

# Descrever um pod para ver eventos
kubectl describe pod <nome-do-pod>
```

### Verificar serviços

```powershell
# Ver todos os serviços
kubectl get services

# Ver detalhes de um serviço específico
kubectl describe service <nome-do-serviço>
```

### Reiniciar pods

```powershell
# Reiniciar um pod específico
kubectl delete pod <nome-do-pod>

# Reiniciar todos os pods de um deployment
kubectl rollout restart deployment <nome-do-deployment>
```

## �🗄️ Bancos de Dados

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
- [x] Kubernetes manifests para deploy em cluster

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
