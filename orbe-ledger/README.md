# Orbe Ledger - Sistema Contábil Bancário

Sistema de ledger contábil bancário desenvolvido com NestJS, focado em processamento de transações financeiras com rigorosos princípios contábeis, consistência de dados e liquidação de operações.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Endpoints da API](#endpoints-da-api)
- [Fluxo de Processamento](#fluxo-de-processamento)
- [Princípios Contábeis](#princípios-contábeis)
- [Validações e Regras de Negócio](#validações-e-regras-de-negócio)
- [Consistência Contábil](#consistência-contábil)
- [Liquidação de Operações](#liquidação-de-operações)
- [Diagramas de Sequência](#diagramas-de-sequência)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Tecnologias](#tecnologias)

## Visão Geral

O Orbe Ledger é um sistema core financeiro que processa transações bancárias seguindo princípios contábeis rigorosos. O sistema garante a integridade dos dados através de:

- **Escrituração em Partidas Dobradas**: Cada transação gera débitos e créditos equivalentes
- **Idempotência**: Garante que requisições duplicadas não causem transações duplicadas
- **Atomicidade**: Transações são processadas de forma atômica
- **Auditoria Completa**: Todas as operações são auditadas
- **Consistência de Saldos**: Verificação contínua da consistência contábil

### Core Financeiro

```
                    FINANCIAL CORE
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
      PIX             DEPOSIT            HOLD
       │                 │                 │
  ┌────┴────┐       ┌────┼────┐       ┌────┴────┐
Internal  Cross    Boleto TED/DOC    Capture Release
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                    CHARGEBACK
                  (processo/resultado)
```

## Arquitetura do Sistema

### Arquitetura em Camadas

O sistema segue uma arquitetura em camadas com separação clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────────┐
│                        CONTROLLER LAYER                      │
│  (Points de entrada HTTP, validação de DTOs)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                         SERVICE LAYER                        │
│  (Orquestração de negócios, gerenciamento de transações)     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                         USECASE LAYER                        │
│  (Casos de uso específicos, coordenação de regras)           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                          RULES LAYER                         │
│  (Validações de negócio, regras contábeis, limites)          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                       POSTING LAYER                          │
│  (Estratégias de escrituração contábil, journals)            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    DATA/REPOSITORY LAYER                     │
│  (Persistência, ORM, entidades)                              │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principais

#### 1. **Controllers**

- Responsáveis por receber requisições HTTP
- Validam DTOs (Data Transfer Objects)
- Delegam para Services

#### 2. **Services**

- Camada de orquestração de negócios
- Gerenciam transações de banco de dados
- Coordenam múltiplos usecases

#### 3. **Usecases**

- Implementam casos de uso específicos
- Coordenam validações e regras
- Gerenciam idempotência

#### 4. **Rules**

- Validam regras de negócio
- Aplicam validações contábeis
- Verificam limites e restrições

#### 5. **Posting Strategies**

- Implementam estratégias de escrituração contábil
- Garantem partidas dobradas
- Atualizam balance snapshots

## Endpoints da API

### 1. PIX - Transferências Instantâneas

#### POST `/pix/transfer`

Realiza transferência PIX entre contas da mesma instituição.

**Request Body:**

```typescript
{
  "originAccountId": string,      // ID da conta de origem
  "destinationAccountId": string, // ID da conta de destino
  "amount": number,               // Valor da transferência
  "pixKey": string,              // Chave PIX do destinatário
  "description": string,         // Descrição da transferência
  "idempotencyKey": string,      // Chave de idempotência
  "metadata": Record<string, any> // Metadados adicionais
}
```

**Response:**

```typescript
{
  "data": {
    "status": "completed",
    "transactionId": string,
    "debitEntryId": string,
    "creditEntryId": string,
    "amount": number,
    "payerAccount": string,
    "receiverAccount": string,
    "institutionType": "SAME_INSTITUTION",
    "completedAt": Date
  }
}
```

#### Fluxo do PIX

```
Client Request
      │
      ▼
PixController.transfer()
      │
      ▼
PixService.transfer()
      │
      ├──► Busca contas (origem/destino)
      ├──► Inicia transação DB
      │
      ▼
PixInternalUsecase.handler()
      │
      ├──► Lock de contas (pessimistic locking)
      │
      ▼
IdempotencyRules.validate()
      │
      ├──► Verifica se request já foi processado
      │
      ▼
TransferRules.validate()
      │
      ├──► validatePayerAccount()
      │     ├──► Conta ativa?
      │     ├──► Permite débito?
      │     └──► Conta bloqueada?
      │
      ├──► validateReceiverAccount()
      │     ├──► Conta ativa?
      │     ├──► Permite crédito?
      │     └──► Conta bloqueada?
      │
      ├──► validateTransfer()
      │     ├──► Contas diferentes?
      │     ├──► Valor positivo?
      │     ├──► Mesma moeda?
      │     ├──► Valor mínimo (R$ 0,01)?
      │     └──► Valor máximo (R$ 10.000.000)?
      │
      ├──► validateLimits()
      │     ├──► Limite diário?
      │     ├──► Limite mensal?
      │     └──► Limite por transação?
      │
      └──► validateHolds()
            └──► Verifica holds pendentes
      │
      ▼
TransactionService.createTransaction()
      │
      ├──► Cria transação com status PENDING
      └──► Associa idempotency key
      │
      ▼
IdempotencyService.create()
      │
      └──► Registra idempotência (se não existir)
      │
      ▼
LedgerPostingStrategy.runEstategy('PIX')
      │
      ▼
PixPostingUsecase.execute()
      │
      ├──► JournalService.createJournal()
      │     ├──► Cria journal com entries
      │     ├──► Entry DEBIT (conta origem)
      │     └──► Entry CREDIT (conta destino)
      │
      ├──► BalanceSnapshot.updateBalanceForTransfer()
      │     ├──► Atualiza saldo conta origem (débito)
      │     └──► Atualiza saldo conta destino (crédito)
      │
      └──► JournalService.registerJournal()
            └──► Finaliza journal
      │
      ▼
AuditService.createAudit()
      │
      └──► Registra auditoria da operação
      │
      ▼
TransactionService.complete()
      │
      └──► Marca transação como COMPLETED
      │
      ▼
IdempotencyService.update()
      │
      └──► Atualiza idempotência com resultado
      │
      ▼
Commit Transaction
      │
      └──► Persiste todas as alterações
```

### 2. Deposits - Depósitos Bancários

#### POST `/deposits/ticket`

Processa liquidação de boleto bancário.

**Request Body:**

```typescript
{
  "account": string,              // Número da conta
  "amount": number,               // Valor do depósito
  "idempotencyKey": string       // Chave de idempotência
}
```

#### POST `/deposits/ted`

Processa transferência TED (Transferência Eletrônica Disponível).

**Request Body:**

```typescript
{
  "account": string,              // Número da conta
  "amount": number,               // Valor do depósito
  "idempotencyKey": string       // Chave de idempotência
}
```

#### POST `/deposits/doc`

Processa transferência DOC (Documento de Ordem de Crédito).

**Request Body:**

```typescript
{
  "account": string,              // Número da conta
  "amount": number,               // Valor do depósito
  "idempotencyKey": string       // Chave de idempotência
}
```

#### Fluxo de Depósitos (Exemplo: Boleto)

```
Client Request
      │
      ▼
DepositsController.createTicket()
      │
      ▼
DepositsService.createTicket()
      │
      ├──► Busca conta cliente
      ├──► Busca conta técnica (BOLETO-SETTLEMENT)
      ├──► Busca ledger (MAIN)
      ├──► Busca serviço (SRV-BOLETO)
      ├──► Busca conta receita (REVENUE-BOLETO)
      │
      ▼
FeeService.calculateNetAmount()
      │
      └──► Calcula taxa do serviço
      │
      ▼
TicketUsecase.handler()
      │
      ├──► Lock de conta cliente
      │
      ▼
IdempotencyRules.validate()
      │
      └──► Verifica idempotência
      │
      ▼
TransactionService.createTransaction()
      │
      └──► Cria transação TICKET
      │
      ▼
LedgerPostingStrategy.runEstategy('TICKET')
      │
      ▼
TicketPostingStrategy.execute()
      │
      ├──► JournalService.createJournal()
      │     ├──► Entry DEBIT: Conta técnica (valor total)
      │     ├──► Entry CREDIT: Conta cliente (valor - taxa)
      │     └──► Entry CREDIT: Conta receita (taxa)
      │
      ├──► BalanceSnapshot.updateBalanceForTransfer()
      │     ├──► Débito conta técnica
      │     └──► Crédito conta cliente
      │
      └──► AuditService.createAudit()
            └──► Registra auditoria
      │
      ▼
TransactionService.complete()
      │
      └──► Marca transação COMPLETED
      │
      ▼
Commit Transaction
```

### 3. Hold - Bloqueio de Valores

#### POST `/hold`

Cria um bloqueio temporário de valor em conta.

**Request Body:**

```typescript
{
  "accountNumber": string,        // Número da conta
  "amount": number               // Valor a bloquear
}
```

#### POST `/hold/release`

Libera um bloqueio existente.

**Request Body:**

```typescript
{
  "holdId": string,              // ID do bloqueio
  "idempotencyKey": string       // Chave de idempotência
}
```

#### POST `/hold/capture`

Captura (confirma) um bloqueio, liquidando a operação.

**Request Body:**

```typescript
{
  "holdId": string,              // ID do bloqueio
  "idempotencyKey": string       // Chave de idempotência
}
```

#### Fluxo de Hold

```
Client Request
      │
      ▼
HoldController.createHold()
      │
      ▼
HoldService.createHold()
      │
      ├──► Busca conta cliente
      ├──► Busca conta técnica (HOLD-RESERVE)
      ├──► Busca ledger (MAIN)
      └──► Busca serviço (SRV-HOLD)
      │
      ▼
CreateHoldUsecase.handler()
      │
      ├──► Lock de contas
      │
      ▼
IdempotencyRules.validate()
      │
      ▼
TransactionService.createTransaction()
      │
      └──► Cria transação HOLD
      │
      ▼
LedgerPostingStrategy.runEstategy('HOLD')
      │
      ▼
HoldPostingStrategy.execute()
      │
      ├──► JournalService.createJournal()
      │     ├──► Status: PENDING
      │     ├──► Entry DEBIT: Conta cliente (valor bloqueado)
      │     └──► Entry CREDIT: Conta técnica (HOLD-RESERVE)
      │
      ├──► BalanceSnapshot.updateBalanceForHold()
      │     └──► Reduz saldo disponível cliente
      │
      └──► BalanceSnapshot.updateBalanceForTransfer()
            └──► Aumenta saldo conta técnica
      │
      ▼
Commit Transaction
```

#### Fluxo de Capture Hold

```
Client Request
      │
      ▼
HoldController.captureHold()
      │
      ▼
HoldService.captureHold()
      │
      ├──► Busca hold
      ├──► Busca conta técnica (HOLD-RESERVE)
      ├──► Busca conta receita (REVENUE-HOLD)
      ├──► Busca conta liquidação (HOLD-SETTLEMENT)
      └──► Calcula taxa
      │
      ▼
CaptureHoldUsecase.handler()
      │
      ▼
LedgerPostingStrategy.runEstategy('HOLD_CAPTURE')
      │
      ▼
HoldCapturePostingStrategy.execute()
      │
      ├──► JournalService.createJournal()
      │     ├──► Entry DEBIT: Conta técnica (valor)
      │     ├──► Entry CREDIT: Conta liquidação (valor - taxa)
      │     └──► Entry CREDIT: Conta receita (taxa)
      │
      ├──► Atualiza saldos
      └──► Marca hold como capturado
      │
      ▼
Commit Transaction
```

### 4. Ledger Consistence - Verificação de Saúde

#### GET `/ledger-consistence/health`

Verifica a consistência do ledger e health do sistema.

**Response:**

```typescript
{
  "status": "healthy",
  "checks": {
    "balanceConsistency": boolean,
    "journalIntegrity": boolean,
    "transactionStatus": boolean
  },
  "timestamp": Date
}
```

## Fluxo de Processamento

### Fluxo Geral de Processamento

```
┌─────────────────────────────────────────────────────────────┐
│                     REQUEST ENTRY                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   CONTROLLER LAYER                            │
│  - Recebe request HTTP                                        │
│  - Valida DTOs                                                │
│  - Extrai metadados (request hash, etc)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                              │
│  - Inicia transação de banco de dados                        │
│  - Busca entidades necessárias (contas, ledgers, etc)        │
│  - Prepara dados para usecase                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     USECASE LAYER                            │
│  - Lock pessimista de contas                                  │
│  - Valida idempotência                                        │
│  - Aplica regras de negócio                                   │
│  - Cria transação                                             │
│  - Executa estratégia de posting                             │
│  - Cria auditoria                                             │
│  - Completa transação                                         │
│  - Atualiza idempotência                                     │
│  - Commit da transação                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      RULES LAYER                              │
│  - Validações de contas (ativa, bloqueada, permissões)       │
│  - Validações de transação (valor, moeda, limites)           │
│  - Validações de limites (diário, mensal, por transação)     │
│  - Validações de holds                                       │
│  - Validações de saldo                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    POSTING LAYER                              │
│  - Seleciona estratégia de posting                           │
│  - Cria journal com entries                                  │
│  - Aplica partidas dobradas                                   │
│  - Atualiza balance snapshots                                │
│  - Registra journal                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA PERSISTENCE                            │
│  - Commit da transação                                        │
│  - Release de locks                                           │
└─────────────────────────────────────────────────────────────┘
```

## Princípios Contábeis

### 1. Partidas Dobradas (Double-Entry Bookkeeping)

Cada transação financeira gera no mínimo duas entries:

- **Entry DEBIT**: Diminui saldo de uma conta
- **Entry CREDIT**: Aumenta saldo de outra conta

**Exemplo PIX:**

```
Conta Origem: DEBIT R$ 100,00
Conta Destino: CREDIT R$ 100,00
Total DEBIT = Total CREDIT (Equilíbrio contábil)
```

### 2. Princípio da Entidade

Cada conta mantém seu próprio saldo independente. Contas técnicas são usadas para:

- Liquidação de operações
- Acumulação de receitas
- Gestão de holds

### 3. Princípio da Continuidade

O sistema assume operação contínua, permitindo:

- Holds temporários
- Transações pendentes
- Reversões quando necessário

### 4. Princípio do Registro pelo Valor Original

Todas as transações são registradas pelo valor real:

- Valor bruto da operação
- Taxas são registradas separadamente
- Conversões seguem taxas oficiais

### 5. Princípio da Competência

Receitas e despesas são reconhecidas quando:

- Ocorre o fato gerador (transação)
- Independentemente do recebimento/pagamento

### 6. Princípio da Oportunidade

Registro deve ser feito:

- No momento certo
- Com a correta classificação
- Sem omissões ou adiamentos

## Validações e Regras de Negócio

### Validações de Contas

#### Conta Pagadora (Payer)

```typescript
validatePayerAccount(account: Account) {
  // Conta deve estar ativa
  if (!account.isActive()) {
    throw new Error('Conta do pagador não está ativa');
  }

  // Conta deve permitir débito
  if (!account.canDebit()) {
    throw new Error('Conta do pagador não permite débito');
  }

  // Conta não pode estar bloqueada
  if (account.isBlocked()) {
    throw new Error('Conta do pagador está bloqueada');
  }
}
```

#### Conta Recebedora (Receiver)

```typescript
validateReceiverAccount(account: Account) {
  // Conta deve estar ativa
  if (!account.isActive()) {
    throw new Error('Conta do recebedor não está ativa');
  }

  // Conta deve permitir crédito
  if (!account.canCredit()) {
    throw new Error('Conta do recebedor não permite crédito');
  }

  // Conta não pode estar bloqueada
  if (account.isBlocked()) {
    throw new Error('Conta do recebedor está bloqueada');
  }
}
```

### Validações de Transação

```typescript
validateTransfer(dto: TransferDTO) {
  // Contas devem ser diferentes
  if (payerAccount.id === receiverAccount.id) {
    throw new Error('Não é possível transferir para a mesma conta');
  }

  // Valor deve ser positivo
  if (amount <= 0) {
    throw new Error('O valor deve ser maior que zero');
  }

  // Mesma moeda (para mesma instituição)
  if (payerAccount.currencyId !== receiverAccount.currencyId) {
    throw new Error('Moedas diferentes');
  }

  // Valor mínimo (R$ 0,01)
  if (amount < 0.01) {
    throw new Error('Valor mínimo é R$ 0,01');
  }

  // Valor máximo (R$ 10.000.000)
  if (amount > 10000000) {
    throw new Error('Valor máximo é R$ 10.000.000');
  }
}
```

### Validações de Limites

```typescript
validateLimits(account: Account, amount: number) {
  const limits = account.limits;

  // Limite diário
  if (limits.dailyDebit) {
    const dailyTotal = await getAccountTotals(
      account.id,
      startOfDay(),
      now()
    );

    if (dailyTotal.totalDebit + amount > limits.dailyDebit) {
      throw new Error('Limite diário excedido');
    }
  }

  // Limite mensal
  if (limits.monthlyDebit) {
    const monthlyTotal = await getAccountTotals(
      account.id,
      startOfMonth(),
      now()
    );

    if (monthlyTotal.totalDebit + amount > limits.monthlyDebit) {
      throw new Error('Limite mensal excedido');
    }
  }

  // Limite por transação
  if (limits.maxTransaction && amount > limits.maxTransaction) {
    throw new Error('Valor excede limite por transação');
  }
}
```

### Validações de Saldo

```typescript
validateBalance(account: Account, amount: number) {
  const availableBalance = account.balanceSnapshots.available;

  // Verifica saldo disponível
  if (availableBalance < amount) {
    throw new Error(
      `Saldo insuficiente. Disponível: ${availableBalance}, Necessário: ${amount}`
    );
  }
}
```

### Validações de Holds

```typescript
validateHolds(account: Account, amount: number, tax: number = 0) {
  // Soma total de holds capturados
  const totalHolds = account.holds.reduce(
    (acc, hold) => acc + (hold?.capturedAmount || 0),
    0
  );

  const totalAmount = amount + tax;

  // Verifica se saldo comporta holds + nova transação
  if (totalHolds + totalAmount > account.balanceSnapshots.available) {
    throw new Error('Saldo insuficiente considerando holds');
  }
}
```

## Consistência Contábil

### Verificação de Consistência

O sistema implementa múltiplas camadas de verificação:

#### 1. Consistência de Journal

```
Para cada Journal:
- Sum(DEBIT entries) == Sum(CREDIT entries)
- Todas as entries referenciam o journal
- Status do journal é consistente
```

#### 2. Consistência de Saldos

```
Para cada conta:
- Saldo atual = Saldo anterior + Sum(CRÉDITOS) - Sum(DÉBITOS)
- Saldo disponível = Saldo atual - Holds pendentes
- Balance snapshot reflete estado real
```

#### 3. Consistência de Transações

```
Para cada transação:
- Status PENDING: Journal não finalizado
- Status COMPLETED: Journal finalizado
- Transaction correlationId == Journal causationId
```

#### 4. Consistência de Idempotência

```
Para cada idempotency key:
- Apenas uma transação associada
- Response armazenado é consistente
- TTL respeitado
```

### Health Check

O endpoint `/ledger-consistence/health` realiza verificações:

```typescript
async check() {
  return {
    status: 'healthy' | 'degraded' | 'unhealthy',
    checks: {
      balanceConsistency: await verifyBalances(),
      journalIntegrity: await verifyJournals(),
      transactionStatus: await verifyTransactions(),
      idempotencyIntegrity: await verifyIdempotency()
    },
    timestamp: new Date()
  };
}
```

## Liquidação de Operações

### Ciclo de Vida da Transação

```
┌─────────────────────────────────────────────────────────────┐
│                     OPERAÇÃO ORIGINAL                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      TRANSACTION                              │
│  - Status: PENDING                                           │
│  - Valores registrados                                       │
│  - Metadados associados                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       JOURNAL                                 │
│  - Entries criadas (DEBIT/CREDIT)                           │
│  - Partidas dobradas aplicadas                               │
│  - Balance snapshots atualizados                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 DINHEIRO EFETIVAMENTE LIQUIDADO               │
│  - Status: COMPLETED                                         │
│  - Saldos atualizados definitivamente                        │
│  - Auditoria registrada                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
        SUCESSO                  EVENTO/DISPUTA
              │                         │
              │                         ▼
              │              ┌──────────────────┐
              │              │ CHARGEBACK       │
              │              │ - Investigação   │
              │              │ - Contestação    │
              │              │ - Evidências     │
              │              │ - Decisão        │
              │              └────────┬─────────┘
              │                       │
              │                       ▼
              │              ┌──────────────────┐
              │              │ DECISÃO FINAL    │
              │              │ - Aprovação      │
              │              │ - Rejeição       │
              │              └────────┬─────────┘
              │                       │
              │                       ▼
              │              ┌──────────────────┐
              │              │ EFEITO FINANCEIRO │
              │              │ - NOVO JOURNAL   │
              │              │ - Reversão       │
              │              │ - Ajuste         │
              │              └──────────────────┘
              │
              └───────────────────────────┘
```

### Tipos de Liquidação

#### 1. Liquidação Imediata (PIX)

```
Transação → Journal → Atualização Saldos → COMPLETED
Tempo: < 1 segundo
```

#### 2. Liquidação D+1 (Boleto)

```
Transação → Journal (PENDING) → Confirmação → COMPLETED
Tempo: até 1 dia útil
```

#### 3. Liquidação com Hold

```
Transação → Hold → Journal (PENDING) → Capture → COMPLETED
Tempo: variável (até expiração do hold)
```

### Reversões e Ajustes

Em caso de chargeback ou disputa:

```
Transação Original
      │
      ▼
Journal Original (DEBIT A, CREDIT B)
      │
      ▼
Evento de Disputa
      │
      ▼
Decisão: Reversão
      │
      ▼
Novo Journal (DEBIT B, CREDIT A)
      │
      ▼
Ajuste de Saldos
      │
      ▼
Auditoria da Reversão
```

## Diagramas de Sequência

### Diagrama de Sequência - PIX

```
Client → PixController: POST /pix/transfer
PixController → PixService: transfer(body)
PixService → AccountsService: findById(originAccountId)
PixService → AccountsService: findById(destinationAccountId)
PixService → PixInternalUsecase: handler(data)

PixInternalUsecase → AccountsService: lockAccountsByIds([origin, destination])
PixInternalUsecase → IdempotencyRules: validate(key, requestId)
PixInternalUsecase → TransferRules: validate(payer, receiver, amount)
TransferRules → TransferRules: validatePayerAccount(payer)
TransferRules → TransferRules: validateReceiverAccount(receiver)
TransferRules → TransferRules: validateTransfer(data)
TransferRules → TransferRules: validateLimits(payer, amount)
TransferRules → TransferRules: validateHolds(payer, amount)

PixInternalUsecase → TransactionService: createTransaction(data)
PixInternalUsecase → IdempotencyService: create(data)
PixInternalUsecase → LedgerPostingStrategy: runEstategy('PIX', data)

LedgerPostingStrategy → PixPostingUsecase: build(queryRunner, data)
PixPostingUsecase → PixPostingUsecase: execute()

PixPostingUsecase → JournalService: createJournal(queryRunner, journalData)
JournalService → Entry: create(entries[])
PixPostingUsecase → BalanceSnapshot: updateBalanceForTransfer(payer, amount, true)
PixPostingUsecase → BalanceSnapshot: updateBalanceForTransfer(receiver, amount, false)
PixPostingUsecase → JournalService: registerJournal(queryRunner, journal)

PixInternalUsecase → AuditService: createAudit(data)
PixInternalUsecase → TransactionService: complete(queryRunner, transaction)
PixInternalUsecase → IdempotencyService: update(idempotency, response)
PixInternalUsecase → OrmService: commit(queryRunner)

PixService → Client: response
```

### Diagrama de Sequência - Depósito Boleto

```
Client → DepositsController: POST /deposits/ticket
DepositsController → DepositsService: createTicket(dto)

DepositsService → AccountsService: findByNumber(account)
DepositsService → AccountsService: findByCode('BOLETO-SETTLEMENT')
DepositsService → LedgerService: getLedgerByCode('MAIN')
DepositsService → ServiceService: getServiceByCode('SRV-BOLETO')
DepositsService → AccountsService: findByCode('REVENUE-BOLETO')
DepositsService → FeeService: calculateNetAmount(service, amount)

DepositsService → TicketUsecase: handler(data)

TicketUsecase → AccountsService: lockAccountsByIds([receiver])
TicketUsecase → IdempotencyRules: validate(key, requestId)
TicketUsecase → TransactionService: createTransaction(data)
TicketUsecase → IdempotencyService: create(data)
TicketUsecase → LedgerPostingStrategy: runEstategy('TICKET', data)

LedgerPostingStrategy → TicketPostingStrategy: build(queryRunner, data)
TicketPostingStrategy → TicketPostingStrategy: execute()

TicketPostingStrategy → JournalService: createJournal(queryRunner, journalData)
JournalService → Entry: create(entries[])
  ├─ DEBIT: payerAccount (amount)
  ├─ CREDIT: receiverAccount (amount - tax)
  └─ CREDIT: revenueAccount (tax)

TicketPostingStrategy → BalanceSnapshot: updateBalanceForTransfer(payer, amount, true)
TicketPostingStrategy → BalanceSnapshot: updateBalanceForTransfer(receiver, amount - tax, false)
TicketPostingStrategy → AuditService: createAudit(data)
TicketPostingStrategy → JournalService: registerJournal(queryRunner, journal)

TicketUsecase → TransactionService: complete(queryRunner, transaction)
TicketUsecase → IdempotencyService: update(idempotency, response)
TicketUsecase → OrmService: commit(queryRunner)

DepositsService → Client: response
```

### Diagrama de Sequência - Hold

```
Client → HoldController: POST /hold
HoldController → HoldService: createHold(dto)

HoldService → AccountsService: findByNumber(accountNumber)
HoldService → AccountsService: findByCode('HOLD-RESERVE')
HoldService → LedgerService: getLedgerByCode('MAIN')
HoldService → ServiceService: getServiceByCode('SRV-HOLD')

HoldService → CreateHoldUsecase: handler(data)

CreateHoldUsecase → AccountsService: lockAccountsByIds([payer, technical])
CreateHoldUsecase → IdempotencyRules: validate(key, requestId)
CreateHoldUsecase → TransactionService: createTransaction(data)
CreateHoldUsecase → IdempotencyService: create(data)
CreateHoldUsecase → LedgerPostingStrategy: runEstategy('HOLD', data)

LedgerPostingStrategy → HoldPostingStrategy: build(queryRunner, data)
HoldPostingStrategy → HoldPostingStrategy: execute()

HoldPostingStrategy → JournalService: createJournal(queryRunner, journalData)
JournalService → Entry: create(entries[])
  ├─ DEBIT: payerAccount (amount) [status: PENDING]
  └─ CREDIT: technicalAccount (amount) [status: PENDING]

HoldPostingStrategy → BalanceSnapshot: getAvailableBalanceAndLock(payer)
HoldPostingStrategy → BalanceSnapshot: updateBalanceForHold(payer, amount)
HoldPostingStrategy → BalanceSnapshot: updateBalanceForTransfer(technical, amount, false)
HoldPostingStrategy → JournalService: registerJournal(queryRunner, journal)

CreateHoldUsecase → OrmService: commit(queryRunner)

HoldService → Client: response
```

## Estrutura do Projeto

```
orbe-ledger/
├── src/
│   ├── core/                          # Camada Core
│   │   ├── health/                    # Health checks
│   │   │   └── ledger.health.ts
│   │   ├── orchestrator/              # Orquestração de usecases
│   │   │   └── services/
│   │   │       ├── deposits/          # Usecases de depósitos
│   │   │       │   └── usecases/
│   │   │       │       ├── ticket.usecase.ts
│   │   │       │       ├── ted.usecase.ts
│   │   │       │       └── doc.usecase.ts
│   │   │       ├── holds/             # Usecases de holds
│   │   │       │   └── usecases/
│   │   │       │       ├── create-hold.usecase.ts
│   │   │       │       ├── release-hold.usecase.ts
│   │   │       │       └── capture-hold.usecase.ts
│   │   │       └── transfer/          # Usecases de transferências
│   │   │           └── usecases/
│   │   │               └── pix-internal.usecase.ts
│   │   ├── posting/                   # Estratégias de posting
│   │   │   ├── strategies/
│   │   │   │   ├── deposit/           # Posting de depósitos
│   │   │   │   │   ├── ticket-posting.strategy.ts
│   │   │   │   │   ├── ted-posting.strategy.ts
│   │   │   │   │   └── doc-posting.strategy.ts
│   │   │   │   ├── hold/              # Posting de holds
│   │   │   │   │   ├── hold-posting.strategy.ts
│   │   │   │   │   ├── hold-release-posting.strategy.ts
│   │   │   │   │   └── hold-capture-posting.strategy.ts
│   │   │   │   └── pix/               # Posting de PIX
│   │   │   │       └── pix-posting.strategy.ts
│   │   │   └── ledger.posting.strategy.ts
│   │   ├── rules/                     # Regras de negócio
│   │   │   └── business/
│   │   │       ├── transfer.rules.ts
│   │   │       └── idempotency.rules.ts
│   │   └── services/                  # Serviços core
│   │       ├── accounts.service.ts
│   │       ├── audit.service.ts
│   │       ├── balance-snapshot.service.ts
│   │       ├── balance.service.ts
│   │       ├── currency.service.ts
│   │       ├── entry.service.ts
│   │       ├── fee-calculator.service.ts
│   │       ├── fee.service.ts
│   │       ├── hold.service.ts
│   │       ├── idempotency.service.ts
│   │       ├── institution-identifier.service.ts
│   │       ├── journal.service.ts
│   │       ├── ledger.service.ts
│   │       ├── limite.service.ts
│   │       ├── outbox.service.ts
│   │       ├── saga-step.service.ts
│   │       ├── saga.service.ts
│   │       ├── service.service.ts
│   │       └── transaction.service.ts
│   ├── infra/                         # Infraestrutura
│   │   └── database/
│   │       ├── common/
│   │       │   └── enums/             # Enumerações
│   │       ├── entities/              # Entidades ORM
│   │       │   ├── account.entity.ts
│   │       │   ├── audit.entity.ts
│   │       │   ├── balance-snapshot.entity.ts
│   │       │   ├── entry.entity.ts
│   │       │   ├── hold.entity.ts
│   │       │   ├── idempotency.entity.ts
│   │       │   ├── journal.entity.ts
│   │       │   ├── ledger.entity.ts
│   │       │   ├── transaction.entity.ts
│   │       │   └── ...
│   │       └── orm/                   # Configuração TypeORM
│   │           ├── orm.datasource.ts
│   │           ├── orm.module.ts
│   │           └── orm.service.ts
│   └── modules/                       # Módulos da API
│       ├── app/                       # Módulo principal
│       │   ├── app.controller.ts
│       │   ├── app.module.ts
│       │   └── app.service.ts
│       ├── pix/                       # Módulo PIX
│       │   ├── pix.controller.ts
│       │   ├── pix.module.ts
│       │   ├── pix.service.ts
│       │   ├── dtos/
│       │   │   └── pix-request.dto.ts
│       │   └── use-cases/
│       │       └── pix-internal.usecase.ts
│       ├── deposits/                  # Módulo Depósitos
│       │   ├── deposits.controller.ts
│       │   ├── deposits.module.ts
│       │   ├── deposits.service.ts
│       │   └── dtos/
│       │       ├── ticket-deposit.dto.ts
│       │       ├── ted-deposit.dto.ts
│       │       └── doc-deposit.dto.ts
│       ├── hold/                      # Módulo Hold
│       │   ├── hold.controller.ts
│       │   ├── hold.module.ts
│       │   ├── hold.service.ts
│       │   └── dtos/
│       │       ├── create-hold.dto.ts
│       │       ├── release-hold.dto.ts
│       │       └── capture-hold.dto.ts
│       └── ledger-consistence/        # Módulo Consistência
│           ├── ledger-consistence.controller.ts
│           ├── ledger-consistence.module.ts
│           └── ledger-consistence.service.ts
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Tecnologias

- **Framework**: NestJS (Node.js)
- **ORM**: TypeORM
- **Banco de Dados**: PostgreSQL
- **Linguagem**: TypeScript
- **Validação**: class-validator, class-transformer
- **Documentação**: Swagger (@nestjs/swagger)

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev          # Inicia em modo watch
npm run start:debug        # Inicia em modo debug

# Build
npm run build              # Compila o projeto
npm run start:prod         # Inicia produção

# Testes
npm run test               # Executa testes
npm run test:watch         # Testes em modo watch
npm run test:cov           # Testes com coverage

# Banco de Dados
npm run migration:generate # Gera migration
npm run migration:run      # Executa migrations
npm run migration:revert  # Reverte última migration

# Seed
npm run seed               # Executa seeders
```

## Conclusão

O Orbe Ledger é um sistema robusto de ledger contábil bancário que implementa:

- ✅ Arquitetura em camadas bem definida
- ✅ Princípios contábeis rigorosos (partidas dobradas)
- ✅ Validações abrangentes de negócio
- ✅ Consistência contábil garantida
- ✅ Suporte a múltiplos tipos de operações
- ✅ Idempotência para evitar duplicações
- ✅ Auditoria completa de operações
- ✅ Health checks para monitoramento

O sistema está preparado para processar transações financeiras com segurança, consistência e conformidade com os princípios contábeis bancários.
