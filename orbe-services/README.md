# Orbe Services

**Módulo de Serviços do Sistema Core Banking Orbe**

Este microserviço é responsável por gerenciar os serviços, taxas e impostos do sistema core banking Orbe. Ele fornece uma API pública para definição e cálculo de taxas e serviços bancários.

## 🎯 Propósito

O Orbe Services atua como o catálogo central de serviços bancários e suas respectivas taxas, permitindo:

- **Gestão de Serviços**: Cadastro e manutenção de serviços bancários disponíveis
- **Cálculo de Taxas**: Processamento automático de taxas fixas e percentuais
- **Configuração de Impostos**: Definição de regras fiscais aplicáveis aos serviços
- **Catálogo Central**: Fonte única de verdade para definições de serviços e preços

## 🏗️ Arquitetura

Este serviço faz parte do ecossistema Core Banking Orbe, integrando-se com:

- **Orbe Ledger**: Sistema de contabilidade e ledger principal
- **Banco de Dados**: PostgreSQL dedicado para configurações de serviços
- **API REST**: Endpoints públicos para consulta e gestão de serviços

## 🚀 Tecnologias

- **Framework**: NestJS (TypeScript)
- **ORM**: TypeORM
- **Banco de Dados**: PostgreSQL
- **Documentação**: Swagger/OpenAPI
- **Validação**: class-validator

## 📋 Funcionalidades

### Serviços (Services)

- Cadastro de serviços bancários
- Classificação por tipo (PIX, TED, DOC, etc.)
- Gerenciamento de metadados
- Ativação/desativação de serviços

### Taxas (Fees)

- Taxas fixas (valor definido)
- Taxas percentuais (sobre valor da transação)
- Múltiplas taxas por serviço
- Regras de ativação por período

### Impostos (Taxes)

- Configuração de alíquotas
- Tipos de impostos aplicáveis
- Integração com cálculo de tarifas

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=orbe-services
DB_PASSWORD=orbe-services
DB_NAME=orbe-services
DB_LOGGING=false

# Server
PORT=3001
```

### Instalação

```bash
# Instalar dependências
yarn install

# Copiar arquivo de exemplo de ambiente
cp .env.example .env

# Configurar as variáveis de ambiente
```

## 🏃 Execução

```bash
# Desenvolvimento
yarn run start:dev

# Produção
yarn run start:prod

# Build
yarn run build
```

## 📚 API Documentation

A documentação da API está disponível via Swagger:

```
http://localhost:3001/api
```

### Endpoints Principais

- `GET /orbe-services/services` - Listar serviços disponíveis
- `POST /orbe-services/services` - Criar novo serviço
- `GET /orbe-services/services/:code` - Buscar serviço por código
- `PUT /orbe-services/services/:id` - Atualizar serviço
- `DELETE /orbe-services/services/:id` - Desativar serviço

## 🗄️ Estrutura do Banco de Dados

O serviço utiliza seu próprio banco de dados PostgreSQL (`orbe-services`) com as seguintes entidades principais:

- **services**: Catálogo de serviços bancários
- **taxes**: Configurações de impostos e taxas
- **service_taxes**: Relacionamento many-to-many entre serviços e taxas

## 🔗 Integração

### Como integrar com o Orbe Services

1. **Para consultar serviços disponíveis**:

   ```typescript
   GET / orbe - services / services;
   ```

2. **Para calcular taxas de um serviço**:

   ```typescript
   // Use o FeeService internamente ou via API
   const fee = feeService.calculateNetAmount(service, amount);
   ```

3. **Para cadastrar novos serviços**:
   ```typescript
   POST /orbe-services/services
   {
     "code": "PIX_TRANSFER",
     "name": "Transferência PIX",
     "type": "PIX",
     "taxes": [...]
   }
   ```

## 🧪 Testes

```bash
# Unit tests
yarn run test

# E2E tests
yarn run test:e2e

# Coverage
yarn run test:cov
```

## 📊 Monitoramento

O serviço inclui interceptors para:

- Logging de requisições
- Tracing de operações
- Tratamento global de exceções
- Transformação de respostas

## 🔐 Segurança

- Validação de entrada via ValidationPipe
- CORS configurado para origens específicas
- Versionamento de API via URI
- Tracing middleware para auditoria

## 🚦 Deployment

O serviço está configurado para rodar na porta `3001` e pode ser deployado usando:

- Docker
- Kubernetes
- AWS (via NestJS Mau ou manual)
- Qualquer plataforma Node.js compatível

## 📝 Notas Importantes

- Este serviço é **read-only** para outros módulos do sistema core banking
- Alterações em serviços devem ser feitas via endpoints específicos com permissões adequadas
- O banco de dados é separado do ledger principal para isolamento de responsabilidade
- Mudanças em taxas devem ser versionadas para rastreabilidade

## 🤝 Suporte

Para suporte e dúvidas sobre o Orbe Services, consulte a documentação geral do projeto Core Banking Orbe.
