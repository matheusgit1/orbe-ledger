import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCoreTables1784375046126 implements MigrationInterface {
    name = 'CreateCoreTables1784375046126'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO currencies (code, numeric_code, symbol, decimal_places) VALUES
            ('BRL', '986', 'R$', 2),
            ('USD', '840', 'US$', 2),
            ('EUR', '978', '€', 2),
            ('ARS', '032', 'AR$', 2)
        `);

        await queryRunner.query(`
            INSERT INTO account_types (code, name, nature, normal_balance, level) VALUES
            ('1', 'ATIVO', 'ASSET', 'DEBIT', 0),
            ('2', 'PASSIVO', 'LIABILITY', 'CREDIT', 0),
            ('3', 'PATRIMÔNIO LÍQUIDO', 'EQUITY', 'CREDIT', 0),
            ('4', 'RECEITA', 'REVENUE', 'CREDIT', 0),
            ('5', 'DESPESA', 'EXPENSE', 'DEBIT', 0)
        `);

        await queryRunner.query(`
            INSERT INTO account_types (code, name, nature, normal_balance, parent_id, level, allow_posting) VALUES
            ('1.1', 'CAIXA', 'ASSET', 'DEBIT', (SELECT id FROM account_types WHERE code = '1'), 1, true),
            ('1.2', 'BANCOS', 'ASSET', 'DEBIT', (SELECT id FROM account_types WHERE code = '1'), 1, true),
            ('1.3', 'CLIENTES', 'ASSET', 'DEBIT', (SELECT id FROM account_types WHERE code = '1'), 1, true),
            ('2.1', 'FORNECEDORES', 'LIABILITY', 'CREDIT', (SELECT id FROM account_types WHERE code = '2'), 1, true),
            ('2.2', 'EMPRÉSTIMOS', 'LIABILITY', 'CREDIT', (SELECT id FROM account_types WHERE code = '2'), 1, true)
        `);

        await queryRunner.query(`
            CREATE INDEX idx_accounts_owner ON accounts(owner_id, owner_type);
            CREATE INDEX idx_accounts_status ON accounts(status);
            CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS accounts`);
        await queryRunner.query(`DROP TABLE IF EXISTS account_types`);
        await queryRunner.query(`DROP TABLE IF EXISTS ledgers`);
        await queryRunner.query(`DROP TABLE IF EXISTS currencies`);
        await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    }

}
