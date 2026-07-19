import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInfrastructureTables1784377464350 implements MigrationInterface {
    name = 'CreateInfrastructureTables1784377464350'

    public async up(queryRunner: QueryRunner): Promise<void> {
         await queryRunner.query(`
            CREATE INDEX idx_transactions_correlation ON transactions(correlation_id);
            CREATE INDEX idx_transactions_external ON transactions(external_id);
            CREATE INDEX idx_transactions_origin_status ON transactions(origin_account_id, status);
            CREATE INDEX idx_transactions_dest_status ON transactions(destination_account_id, status);
            CREATE INDEX idx_transactions_workflow ON transactions(workflow_id);
            CREATE INDEX idx_transactions_started ON transactions(started_at);
        `);

        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'outbox_status_enum'
            ) THEN
                CREATE TYPE outbox_status_enum AS ENUM (
                    'PENDING',
                    'PROCESSED',
                    'FAILED',
                    'RETRY',
                    'DEAD'
                );
            END IF;
        END
        $$;
        `);


        await queryRunner.query(`
            CREATE INDEX idx_outbox_status_retry ON outbox(status, next_retry);
            CREATE INDEX idx_outbox_aggregate ON outbox(aggregate_id, aggregate);
            CREATE INDEX idx_outbox_event ON outbox(event_type);
            CREATE INDEX idx_outbox_published ON outbox(published_at);
        `);

        await queryRunner.query(`
            CREATE INDEX idx_inbox_processed ON inbox(processed_at);
            CREATE INDEX idx_inbox_hash ON inbox(payload_hash);
        `);

        await queryRunner.query(`
            CREATE INDEX idx_audit_aggregate ON audit_logs(aggregate, aggregate_id);
            CREATE INDEX idx_audit_user ON audit_logs(user_id);
            CREATE INDEX idx_audit_created ON audit_logs(created_at);
            CREATE INDEX idx_audit_trace ON audit_logs(trace_id);
            CREATE INDEX idx_audit_request ON audit_logs(request_id);
            CREATE INDEX idx_audit_action ON audit_logs(action);
        `);

        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION audit_trigger_function()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS $$
        BEGIN
            -- This is a placeholder - actual audit logic would be more complex
            -- and would depend on the specific entity being audited
            RETURN NEW;
        END;
        $$;
        `);

        // Create a view for transaction history
        await queryRunner.query(`
        CREATE VIEW transaction_history AS
        SELECT 
            t.id as transaction_id,
            t.type,
            t.status,
            t.amount,
            t.currency_id,
            t.origin_account_id,
            t.destination_account_id,
            t.created_at,
            t.completed_at,
            j.id as journal_id,
            j.journal_number,
            j.status as journal_status,
            COUNT(e.id) as entry_count
        FROM transactions t
        LEFT JOIN journals j ON j.correlation_id = t.id
        LEFT JOIN entries e ON e.journal_id = j.id
        GROUP BY t.id, j.id, j.journal_number, j.status
        ORDER BY t.created_at DESC;
        `);

        // Create a view for outbox monitoring - CORRIGIDO
        await queryRunner.query(`
        CREATE VIEW outbox_monitoring AS
        SELECT 
            o.id,
            o.aggregate,
            o.aggregate_id,
            o.event_type,
            o.status::text as status,
            o.attempts,
            o.next_retry,
            o.created_at,
            CASE 
            WHEN o.status = 'PENDING' AND o.next_retry IS NULL THEN 'READY'
            WHEN o.status = 'PENDING' AND o.next_retry > NOW() THEN 'WAITING'
            WHEN o.status = 'PENDING' AND o.next_retry <= NOW() THEN 'OVERDUE'
            WHEN o.status = 'RETRY' AND o.next_retry <= NOW() THEN 'READY'
            ELSE 'UNKNOWN'
            END as priority_status
        FROM outbox o
        WHERE o.status IN ('PENDING', 'RETRY');
        `);

        // Adiciona journal_number à tabela journals se não existir
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'journals' AND column_name = 'journal_number'
            ) THEN
            ALTER TABLE journals ADD COLUMN journal_number VARCHAR(50) UNIQUE;
            END IF;
        END
        $$;
        `);

        // Cria função para limpar outbox expirado
        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION clean_expired_outbox()
        RETURNS TABLE (deleted_count INT)
        LANGUAGE PLPGSQL
        AS $$
        DECLARE
            v_count INT;
        BEGIN
            WITH deleted AS (
            DELETE FROM outbox
            WHERE status = 'PROCESSED' 
                AND published_at < NOW() - INTERVAL '30 days'
            RETURNING id
            )
            SELECT COUNT(*) INTO v_count FROM deleted;
            
            RETURN QUERY SELECT v_count;
        END;
        $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS clean_expired_outbox`);
        await queryRunner.query(`DROP VIEW IF EXISTS outbox_monitoring`);
        await queryRunner.query(`DROP VIEW IF EXISTS transaction_history`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS audit_trigger_function`);
        await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
        await queryRunner.query(`DROP TABLE IF EXISTS inbox`);
        await queryRunner.query(`DROP TABLE IF EXISTS outbox`);
        await queryRunner.query(`DROP TYPE IF EXISTS outbox_status_enum`);
        await queryRunner.query(`DROP TABLE IF EXISTS transactions`);
    }

}
