import { Tax } from '../infra/database/entities/tax.entity';
import {
  CreateServiceOptions,
  Service,
} from '../infra/database/entities/service.entity';
import { DataSource } from 'typeorm';
import { QueryRunner } from 'typeorm';
import { TaxType } from '../infra/database/common/enums/tax.enum';
import { ServicesAvailable } from '../infra/database/common/enums/services.enum';

const clearDatabase = async (dataSource: DataSource) => {
  console.log('🧹 Clearing database...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Get all table names from public schema
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    // Truncate all tables with CASCADE to handle foreign key constraints
    if (tables.length > 0) {
      const tableNames = tables.map((t: any) => `"${t.table_name}"`).join(', ');
      await queryRunner.query(`TRUNCATE TABLE ${tableNames} CASCADE`);
    }

    await queryRunner.commitTransaction();
    console.log('✅ Database cleared successfully');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
};

const createServicesAndTaxes = async (dataSource: DataSource) => {
  const taxRepo = dataSource.getRepository(Tax);
  const serviceRepo = dataSource.getRepository(Service);

  // ============================================
  // TAXAS - Criação de todas as taxas
  // ============================================

  console.log('📝 Creating taxes...');

  // Taxas básicas (sem cobrança)
  const defaultTax = Tax.create({
    code: 'TAX-DEFAULT',
    name: 'Taxa Padrão',
    description: 'Taxa padrão sem cobrança',
    amount: 0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(defaultTax);

  const internalTransferTax = Tax.create({
    code: 'TAX-INTERNAL',
    name: 'Taxa Transferência Interna',
    description: 'Taxa para transferências internas',
    amount: 0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(internalTransferTax);

  const adjustmentTax = Tax.create({
    code: 'TAX-ADJUSTMENT',
    name: 'Taxa Ajuste',
    description: 'Taxa para ajustes manuais',
    amount: 0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(adjustmentTax);

  const holdTax = Tax.create({
    code: 'TAX-HOLD',
    name: 'Taxa Hold',
    description: 'Taxa para holds',
    amount: 0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(holdTax);

  // Taxas de transferência PIX
  const pixStandardTax = Tax.create({
    code: 'TAX-PIX-STANDARD',
    name: 'Taxa PIX Padrão',
    description: 'Taxa padrão para transações PIX',
    amount: 0.5,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(pixStandardTax);

  const pixExpressTax = Tax.create({
    code: 'TAX-PIX-EXPRESS',
    name: 'Taxa PIX Express',
    description: 'Taxa para PIX prioritário',
    amount: 1.0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(pixExpressTax);

  // Taxas de TED
  const tedStandardTax = Tax.create({
    code: 'TAX-TED-STANDARD',
    name: 'Taxa TED Padrão',
    description: 'Taxa padrão para transações TED',
    amount: 10.0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(tedStandardTax);

  const tedSameDayTax = Tax.create({
    code: 'TAX-TED-SAME-DAY',
    name: 'Taxa TED Mesmo Dia',
    description: 'Taxa para TED no mesmo dia',
    amount: 15.0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(tedSameDayTax);

  // Taxas de DOC
  const docStandardTax = Tax.create({
    code: 'TAX-DOC-STANDARD',
    name: 'Taxa DOC Padrão',
    description: 'Taxa padrão para transações DOC',
    amount: 15.0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(docStandardTax);

  // Taxas de Boleto
  const boletoRegistrationTax = Tax.create({
    code: 'TAX-BOLETO-REGISTRATION',
    name: 'Taxa Registro Boleto',
    description: 'Taxa para registro de boletos',
    amount: 2.5,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(boletoRegistrationTax);

  const boletoPaymentTax = Tax.create({
    code: 'TAX-BOLETO-PAYMENT',
    name: 'Taxa Pagamento Boleto',
    description: 'Taxa para pagamento de boletos',
    amount: 1.5,
    type: TaxType.PERCENTAGE,
    percentage: 0.5,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(boletoPaymentTax);

  // Taxas de operações em dinheiro
  const cashWithdrawalTax = Tax.create({
    code: 'TAX-CASH-WITHDRAWAL',
    name: 'Taxa Saque Dinheiro',
    description: 'Taxa para saques em dinheiro',
    amount: 5.0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(cashWithdrawalTax);

  const cashDepositTax = Tax.create({
    code: 'TAX-CASH-DEPOSIT',
    name: 'Taxa Depósito Dinheiro',
    description: 'Taxa para depósitos em dinheiro',
    amount: 2.0,
    type: TaxType.FIXED,
    minAmount: 0,
    isActive: true,
  });
  await taxRepo.save(cashDepositTax);

  console.log('✅ All Taxes created');

  // ============================================
  // SERVIÇOS - Criação de todos os serviços
  // ============================================

  console.log('📝 Creating services...');

  const services: CreateServiceOptions[] = [
    // Serviços básicos
    {
      code: 'SRV-DEFAULT',
      name: 'Serviço Padrão',
      description: 'Serviço padrão sem cobrança',
      type: ServicesAvailable.DEFAULT,
      taxes: [],
    },
    {
      code: 'SRV-INTERNAL-TRANSFER',
      name: 'Transferência Interna',
      description: 'Transferência entre contas da mesma instituição',
      type: ServicesAvailable.INTERNAL_TRANSFER,
      taxes: [internalTransferTax],
    },
    {
      code: 'SRV-ADJUSTMENT',
      name: 'Ajuste Manual',
      description: 'Ajustes manuais no saldo',
      type: ServicesAvailable.ADJUSTMENT,
      taxes: [adjustmentTax],
    },
    {
      code: 'SRV-HOLD',
      name: 'Bloqueio de Saldo',
      description: 'Bloqueio temporário de valores',
      type: ServicesAvailable.HOLD,
      taxes: [holdTax],
    },

    // Serviços de transferência
    {
      code: 'SRV-PIX-STANDARD',
      name: 'PIX Padrão',
      description: 'Transferência PIX padrão com disponibilidade imediata',
      type: ServicesAvailable.PIX,
      taxes: [pixStandardTax],
    },
    {
      code: 'SRV-PIX-EXPRESS',
      name: 'PIX Express',
      description: 'Transferência PIX com prioridade de processamento',
      type: ServicesAvailable.PIX,
      taxes: [pixExpressTax],
    },
    {
      code: 'SRV-TED-STANDARD',
      name: 'TED Padrão',
      description: 'Transferência TED padrão em D+1',
      type: ServicesAvailable.TED,
      taxes: [tedStandardTax],
    },
    {
      code: 'SRV-TED-SAME-DAY',
      name: 'TED Mesmo Dia',
      description: 'Transferência TED com crédito no mesmo dia',
      type: ServicesAvailable.TED,
      taxes: [tedSameDayTax],
    },
    {
      code: 'SRV-DOC-STANDARD',
      name: 'DOC Padrão',
      description: 'Transferência DOC entre bancos',
      type: ServicesAvailable.DOC,
      taxes: [docStandardTax],
    },

    // Serviços de pagamento
    {
      code: 'SRV-BOLETO-REGISTRATION',
      name: 'Registro de Boleto',
      description: 'Emissão e registro de boletos bancários',
      type: ServicesAvailable.BOLETO,
      taxes: [boletoRegistrationTax],
    },
    {
      code: 'SRV-BOLETO-PAYMENT',
      name: 'Pagamento de Boleto',
      description: 'Processamento de pagamento de boletos',
      type: ServicesAvailable.BOLETO,
      taxes: [boletoPaymentTax],
    },
    {
      code: 'SRV-CASH-WITHDRAWAL',
      name: 'Saque em Dinheiro',
      description: 'Saque de dinheiro em caixa eletrônico',
      type: ServicesAvailable.CASH,
      taxes: [cashWithdrawalTax],
    },
    {
      code: 'SRV-CASH-DEPOSIT',
      name: 'Depósito em Dinheiro',
      description: 'Depósito de dinheiro em caixa eletrônico',
      type: ServicesAvailable.CASH,
      taxes: [cashDepositTax],
    },
  ];

  for (const serviceData of services) {
    const service = Service.create({
      code: serviceData.code,
      name: serviceData.name,
      description: serviceData.description,
      type: serviceData.type,
      taxes: serviceData.taxes || [],
      isActive: true,
    });
    await serviceRepo.save(service);
  }

  console.log('✅ All Services created');
};

export async function seedDatabase(dataSource: DataSource) {
  await clearDatabase(dataSource);

  console.log('🌱 Starting database seed...');

  await createServicesAndTaxes(dataSource);

  console.log('\n🎉 Seed completed successfully!');
  console.log(`📊 Created  services with their respective taxes`);
}
