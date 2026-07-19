import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFinancialTables1784376043794 implements MigrationInterface {
    name = 'CreateFinancialTables1784376043794'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX idx_journals_ledger_number ON journals(ledger_id, journal_number);
            CREATE INDEX idx_journals_correlation ON journals(correlation_id);
            CREATE INDEX idx_journals_status_posted ON journals(status, posted_at);
            CREATE INDEX idx_journals_reference ON journals(reference);
        `);

        await queryRunner.query(`
            CREATE INDEX idx_entries_journal ON entries(journal_id);
            CREATE INDEX idx_entries_account ON entries(account_id, created_at);
            CREATE INDEX idx_entries_side ON entries(side);
        `);

        await queryRunner.query(`
            CREATE INDEX idx_balance_account ON balance_snapshots(account_id, updated_at);
            CREATE INDEX idx_balance_version ON balance_snapshots(account_id, version);
            CREATE INDEX idx_balance_last_entry ON balance_snapshots(last_entry_id);
            CREATE INDEX idx_balance_last_journal ON balance_snapshots(last_journal_id);
        `);

        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION calculate_account_balance(
            p_account_id UUID,
            p_as_of_date TIMESTAMP DEFAULT NOW()
        )
        RETURNS DECIMAL(15,2)
        LANGUAGE SQL
        STABLE
        AS $$
            SELECT COALESCE(
            SUM(
                CASE 
                WHEN side = 'CREDIT' THEN amount
                WHEN side = 'DEBIT' THEN -amount
                ELSE 0
                END
            ),
            0
            )
            FROM entries e
            JOIN journals j ON j.id = e.journal_id
            WHERE e.account_id = p_account_id
            AND j.status = 'POSTED'
            AND e.created_at <= p_as_of_date;
        $$;
        `);

    // Create trigger to auto-update balance snapshots
        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_balance_snapshot()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS $$
        DECLARE
            v_account_id UUID;
            v_currency_id UUID;
            v_snapshot_id UUID;
        BEGIN
            -- Get account info
            SELECT account_id, currency_id INTO v_account_id, v_currency_id
            FROM entries
            WHERE id = NEW.id;
            
            -- Get or create snapshot
            SELECT id INTO v_snapshot_id
            FROM balance_snapshots
            WHERE account_id = v_account_id;
            
            IF v_snapshot_id IS NULL THEN
            INSERT INTO balance_snapshots (
                account_id, currency_id, version
            ) VALUES (
                v_account_id, v_currency_id, 1
            )
            RETURNING id INTO v_snapshot_id;
            END IF;
            
            -- Update snapshot (simplified - real logic would be more complex)
            -- This is just a trigger example, actual update should be done via service
            RETURN NEW;
        END;
        $$;
        `);

        // Create function to get account balance at any point in time
        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION get_account_balance_at_time(
            p_account_id UUID,
            p_timestamp TIMESTAMP DEFAULT NOW()
        )
        RETURNS TABLE (
            balance DECIMAL(15,2),
            snapshot_timestamp TIMESTAMP
        )
        LANGUAGE SQL
        STABLE
        AS $$
            SELECT 
            COALESCE(
                (
                SELECT available 
                FROM balance_snapshots 
                WHERE account_id = p_account_id 
                    AND snapshot_date <= p_timestamp 
                ORDER BY snapshot_date DESC, version DESC 
                LIMIT 1
                ),
                (
                SELECT calculate_account_balance(p_account_id, p_timestamp)
                )
            ) as balance,
            p_timestamp as snapshot_timestamp;
        $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS get_account_balance_at_time`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_balance_snapshot`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS calculate_account_balance`);
        await queryRunner.query(`DROP TABLE IF EXISTS balance_snapshots`);
        await queryRunner.query(`DROP TABLE IF EXISTS entries`);
        await queryRunner.query(`DROP TABLE IF EXISTS journals`);
    }

}
